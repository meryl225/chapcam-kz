import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { LIVE_TRIAL_SECONDS, getLiveOffer } from '@/lib/live-offers'

// ============================================================
// Logique d'acces au Live Pro (cote serveur uniquement).
// Toutes les ecritures passent par la cle service_role.
// ============================================================

export type LiveMode = 'paid' | 'ready' | 'trial' | 'none'

export interface LiveAccessRow {
  user_id: string
  trial_seconds_remaining: number
  pending_windows: number
  active_window_expires_at: string | null
  trial_last_beat_at: string | null
}

export interface LiveAccessState {
  mode: LiveMode
  secondsRemaining: number // temps restant utilisable maintenant
  trialSecondsRemaining: number
  pendingWindows: number
  windowExpiresAt: string | null
  canStart: boolean
}

type Admin = ReturnType<typeof createAdminClient>

// Recupere (ou cree avec l'essai gratuit) la ligne live_access d'un utilisateur.
export async function ensureLiveAccess(admin: Admin, userId: string): Promise<LiveAccessRow> {
  const { data } = await admin
    .from('live_access')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (data) return data as LiveAccessRow

  const fresh = {
    user_id: userId,
    trial_seconds_remaining: LIVE_TRIAL_SECONDS,
    pending_windows: 0,
    active_window_expires_at: null,
    trial_last_beat_at: null,
  }
  const { data: inserted } = await admin
    .from('live_access')
    .insert(fresh)
    .select('*')
    .maybeSingle()

  return (inserted as LiveAccessRow) ?? fresh
}

// Calcule l'etat d'acces courant a partir d'une ligne.
// Priorite : fenetre payante en cours > fenetre payee a demarrer > essai gratuit > rien.
export function computeState(row: LiveAccessRow): LiveAccessState {
  const now = Date.now()
  const windowMs = row.active_window_expires_at
    ? new Date(row.active_window_expires_at).getTime()
    : 0
  const windowActive = windowMs > now

  if (windowActive) {
    return {
      mode: 'paid',
      secondsRemaining: Math.max(0, Math.floor((windowMs - now) / 1000)),
      trialSecondsRemaining: row.trial_seconds_remaining,
      pendingWindows: row.pending_windows,
      windowExpiresAt: row.active_window_expires_at,
      canStart: true,
    }
  }

  if (row.pending_windows > 0) {
    return {
      mode: 'ready',
      secondsRemaining: 0,
      trialSecondsRemaining: row.trial_seconds_remaining,
      pendingWindows: row.pending_windows,
      windowExpiresAt: null,
      canStart: true,
    }
  }

  if (row.trial_seconds_remaining > 0) {
    return {
      mode: 'trial',
      secondsRemaining: row.trial_seconds_remaining,
      trialSecondsRemaining: row.trial_seconds_remaining,
      pendingWindows: 0,
      windowExpiresAt: null,
      canStart: true,
    }
  }

  return {
    mode: 'none',
    secondsRemaining: 0,
    trialSecondsRemaining: 0,
    pendingWindows: 0,
    windowExpiresAt: null,
    canStart: false,
  }
}

// Cree une fenetre payante de 15 min "en attente" (appele a l'approbation admin).
export async function grantLiveWindow(admin: Admin, userId: string, count = 1): Promise<void> {
  const row = await ensureLiveAccess(admin, userId)
  await admin
    .from('live_access')
    .update({
      pending_windows: row.pending_windows + count,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
}

// ============================================================
// Token GPU : HMAC court signe avec LIVE_GPU_SHARED_SECRET.
// Le worker GPU valide ce token avant d'accepter le flux.
// Format : "<userId>.<exp>.<hmac>"
// ============================================================

// ------------------------------------------------------------
// Pool de workers GPU (multi-RTX 5090).
// Mono-worker  : LIVE_GPU_WS_URL  / RUNPOD_POD_ID
// Multi-worker : LIVE_GPU_WS_URLS / RUNPOD_POD_IDS (separes par des virgules)
// ------------------------------------------------------------

interface WorkerSpec {
  fixedUrl?: string
  podId?: string
}

interface ResolvedWorker {
  wsUrl: string
  healthUrl: string
}

interface WorkerHealth {
  active: number
  waiting: number
  max: number
  free: number
}

// Lit la liste des specs worker depuis l'env (singulier + pluriel).
function gpuWorkerSpecs(): WorkerSpec[] {
  const split = (v?: string) =>
    (v || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

  const urls = [
    ...split(process.env.LIVE_GPU_WS_URL),
    ...split(process.env.LIVE_GPU_WS_URLS),
  ]
  const pods = [
    ...split(process.env.RUNPOD_POD_ID),
    ...split(process.env.RUNPOD_POD_IDS),
  ]

  const specs: WorkerSpec[] = []
  // Les URLs *.proxy.runpod.net sont inutilisables pour le WS (502 sur upgrade) :
  // on les ignore, l'auto-decouverte via pod id prend le relais.
  for (const u of urls) {
    if (/proxy\.runpod\.net/i.test(u)) continue
    specs.push({ fixedUrl: u })
  }
  for (const p of pods) specs.push({ podId: p })
  return specs
}

export function isGpuConfigured(): boolean {
  // Configure si on a le secret ET au moins un worker (URL fixe ou pod RunPod).
  return !!process.env.LIVE_GPU_SHARED_SECRET && gpuWorkerSpecs().length > 0
}

// Convertit une URL wss://host/path en URL https://host/health (pour le health-check).
function toHealthUrl(wsUrl: string): string {
  try {
    const u = new URL(wsUrl)
    u.protocol = u.protocol === 'wss:' ? 'https:' : 'http:'
    u.pathname = '/health'
    u.search = ''
    return u.toString()
  } catch {
    return wsUrl
  }
}

// Resout une spec en URL WebSocket concrete (+ URL de health).
// Pour un pod RunPod : interroge https://<pod>-8765.proxy.runpod.net/tunnel-url
// (GET qui PASSE le proxy) pour recuperer l'URL Cloudflare courante.
async function resolveWorker(spec: WorkerSpec): Promise<ResolvedWorker | null> {
  if (spec.fixedUrl) {
    return { wsUrl: spec.fixedUrl, healthUrl: toHealthUrl(spec.fixedUrl) }
  }
  if (spec.podId) {
    const port = process.env.RUNPOD_HTTP_PORT || '8765'
    const base = `https://${spec.podId}-${port}.proxy.runpod.net`
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 8000)
      const res = await fetch(`${base}/tunnel-url`, { cache: 'no-store', signal: ctrl.signal })
      clearTimeout(timer)
      if (!res.ok) {
        console.error('[live-access] tunnel-url HTTP', res.status, spec.podId)
        return null
      }
      const data = (await res.json()) as { wss_url?: string }
      const url = (data?.wss_url || '').trim()
      // Le health-check passe par le proxy RunPod (GET simple, fiable).
      return url ? { wsUrl: url, healthUrl: `${base}/health` } : null
    } catch (err: any) {
      console.error('[live-access] resolveWorker echec:', err?.message || err)
      return null
    }
  }
  return null
}

// Interroge la charge d'un worker. null si injoignable.
async function fetchWorkerHealth(healthUrl: string): Promise<WorkerHealth | null> {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 4000)
    const res = await fetch(healthUrl, { cache: 'no-store', signal: ctrl.signal })
    clearTimeout(timer)
    if (!res.ok) return null
    return (await res.json()) as WorkerHealth
  } catch {
    return null
  }
}

// Choix stable par hash de l'userId : un meme user retombe toujours sur le
// meme worker (utile en repli quand /health est injoignable).
function hashPick<T>(items: T[], userId: string): T {
  const sum = [...userId].reduce((a, c) => a + c.charCodeAt(0), 0)
  return items[sum % items.length]
}

// Compat : resout UNE url (premier worker dispo, sans repartition de charge).
export async function resolveGpuWsUrl(): Promise<string | null> {
  const specs = gpuWorkerSpecs()
  for (const spec of specs) {
    const w = await resolveWorker(spec)
    if (w) return w.wsUrl
  }
  return null
}

// Selectionne le worker le moins charge pour un utilisateur donne.
// 1) resout toutes les specs (URLs fixes + pods RunPod) en parallele
// 2) interroge /health de chaque worker joignable
// 3) renvoie le moins charge (active + waiting) ; egalite -> hash stable userId
// 4) si aucun /health ne repond -> repartition par hash de l'userId
export async function selectGpuWsUrl(userId: string): Promise<string | null> {
  const specs = gpuWorkerSpecs()
  if (specs.length === 0) return null

  const resolved = (await Promise.all(specs.map(resolveWorker))).filter(
    (w): w is ResolvedWorker => !!w,
  )
  if (resolved.length === 0) return null
  if (resolved.length === 1) return resolved[0].wsUrl

  const loads = await Promise.all(
    resolved.map(async (w) => ({ w, health: await fetchWorkerHealth(w.healthUrl) })),
  )
  const reachable = loads.filter(
    (l): l is { w: ResolvedWorker; health: WorkerHealth } => !!l.health,
  )

  if (reachable.length === 0) {
    return hashPick(resolved, userId).wsUrl
  }

  const load = (h: WorkerHealth) => (h.active ?? 0) + (h.waiting ?? 0)
  const minLoad = Math.min(...reachable.map((l) => load(l.health)))
  const tied = reachable.filter((l) => load(l.health) === minLoad)
  return hashPick(tied.map((t) => t.w), userId).wsUrl
}

export function signGpuToken(userId: string, ttlSeconds = 20 * 60): string {
  const secret = process.env.LIVE_GPU_SHARED_SECRET
  if (!secret) throw new Error('LIVE_GPU_SHARED_SECRET manquant')
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds
  const payload = `${userId}.${exp}`
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  return `${payload}.${sig}`
}

// Version synchrone (URL fixe uniquement) - conservee pour compat.
export function getGpuConnection(userId: string): { wsUrl: string; token: string } | null {
  if (!process.env.LIVE_GPU_WS_URL || !process.env.LIVE_GPU_SHARED_SECRET) return null
  return {
    wsUrl: process.env.LIVE_GPU_WS_URL as string,
    token: signGpuToken(userId),
  }
}

// Version async : resout l'URL (fixe ou auto-decouverte RunPod) puis signe le token.
export async function getGpuConnectionAsync(
  userId: string,
): Promise<{ wsUrl: string; token: string } | null> {
  if (!isGpuConfigured()) return null
  // Repartit l'utilisateur sur le worker GPU le moins charge (multi-RTX 5090).
  const wsUrl = await selectGpuWsUrl(userId)
  if (!wsUrl) return null
  return { wsUrl, token: signGpuToken(userId) }
}

// Helper expose pour valider la coherence d'une offre Live cote serveur.
export function liveOfferWindowMinutes(offerId: string): number {
  return getLiveOffer(offerId)?.windowMinutes ?? 15
}
