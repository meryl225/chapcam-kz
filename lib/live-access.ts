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

export function isGpuConfigured(): boolean {
  // Configure si on a le secret ET (une URL fixe OU un pod RunPod pour l'auto-decouverte).
  return (
    !!process.env.LIVE_GPU_SHARED_SECRET &&
    (!!process.env.LIVE_GPU_WS_URL || !!process.env.RUNPOD_POD_ID)
  )
}

// Resout l'URL WebSocket du worker GPU.
// Priorite : LIVE_GPU_WS_URL fixe > auto-decouverte via le pod RunPod.
// L'auto-decouverte interroge https://<pod>-8765.proxy.runpod.net/tunnel-url
// (requete GET simple, qui PASSE le proxy RunPod, contrairement a l'upgrade WS),
// pour recuperer l'URL Cloudflare courante (wss://...trycloudflare.com).
export async function resolveGpuWsUrl(): Promise<string | null> {
  const fixed = process.env.LIVE_GPU_WS_URL
  if (fixed) return fixed

  const podId = process.env.RUNPOD_POD_ID
  if (!podId) return null

  const port = process.env.RUNPOD_HTTP_PORT || '8765'
  const lookupUrl = `https://${podId}-${port}.proxy.runpod.net/tunnel-url`
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 8000)
    const res = await fetch(lookupUrl, { cache: 'no-store', signal: ctrl.signal })
    clearTimeout(timer)
    if (!res.ok) {
      console.error('[live-access] tunnel-url HTTP', res.status)
      return null
    }
    const data = (await res.json()) as { wss_url?: string }
    const url = (data?.wss_url || '').trim()
    return url || null
  } catch (err: any) {
    console.error('[live-access] resolveGpuWsUrl echec:', err?.message || err)
    return null
  }
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
  const wsUrl = await resolveGpuWsUrl()
  if (!wsUrl) return null
  return { wsUrl, token: signGpuToken(userId) }
}

// Helper expose pour valider la coherence d'une offre Live cote serveur.
export function liveOfferWindowMinutes(offerId: string): number {
  return getLiveOffer(offerId)?.windowMinutes ?? 15
}
