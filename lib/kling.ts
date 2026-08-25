import 'server-only'
import crypto from 'node:crypto'

// ============================================================
// Client Kling AI NATIF (nouveau standard d'API).
//
// Auth : une seule cle API en en-tete "Authorization: Bearer <API_KEY>"
//        (l'ancien couple Access Key / Secret Key + JWT n'est utilise QUE par
//        l'ancienne version de l'API ; le nouveau standard utilise une cle API
//        unique — cf. doc "Authentication").
// Domaine : api-singapore.klingai.com (utilisateurs hors Chine).
// Motion Control 3.0 : POST /motion-control/kling-3.0
// Statut (polling de secours) : GET /tasks?task_ids=<id>
// Fin de tache : callback serveur-a-serveur via options.callback_url
//                (protocole "New Callback Function") + verification de signature.
// ============================================================

const API_BASE = 'https://api-singapore.klingai.com'

/**
 * Recupere la cle API Kling (Bearer). On accepte KLING_API_KEY en priorite,
 * puis KLING_SECRET_KEY (nom sous lequel la cle a pu etre enregistree lors de
 * la configuration initiale). Renvoie une chaine vide si absente.
 */
export function getKlingApiKey(): string {
  const key = process.env.KLING_API_KEY || process.env.KLING_SECRET_KEY || ''
  return key.trim()
}

export type KlingStatus = 'submitted' | 'processing' | 'succeeded' | 'failed'

export interface KlingSubmitInput {
  imageUrl: string
  videoUrl: string
  prompt?: string
  // 'video' : suit le mouvement de la video (jusqu'a 30s). 'image' : suit
  // l'orientation de l'image (video de reference <= 10s).
  orientation: 'video' | 'image'
  resolution: '720p' | '1080p'
  audio: 'original' | 'off'
  callbackUrl?: string
  externalTaskId?: string
}

export interface KlingSubmitResult {
  taskId: string
  status: KlingStatus
}

interface KlingOutput {
  type?: string
  url?: string
  watermark_url?: string
  duration?: string
}
interface KlingTaskData {
  id?: string
  status?: KlingStatus
  message?: string
  external_id?: string
  outputs?: KlingOutput[]
}

export interface KlingTaskResult {
  status: KlingStatus
  videoUrl: string | null
  duration: string | null
  message: string
}

/**
 * Soumet une tache Motion Control 3.0 : transfert du mouvement d'une VIDEO de
 * reference sur une IMAGE de personnage. Retourne l'id de tache genere par Kling.
 * Leve une erreur (message Kling) si la soumission echoue.
 */
export async function submitMotionControl(input: KlingSubmitInput): Promise<KlingSubmitResult> {
  const apiKey = getKlingApiKey()
  if (!apiKey) throw new Error('KLING_API_KEY manquante cote serveur.')

  // Collection d'entrees : prompt (optionnel) + image d'apparence + video de mouvement.
  const contents: Array<Record<string, string>> = []
  if (input.prompt && input.prompt.trim()) {
    contents.push({ type: 'prompt', text: input.prompt.trim().slice(0, 2500) })
  }
  contents.push({ type: 'image', url: input.imageUrl })
  contents.push({ type: 'video', url: input.videoUrl })

  const body: Record<string, unknown> = {
    contents,
    settings: {
      character_orientation: input.orientation,
      resolution: input.resolution,
      audio: input.audio,
    },
    options: {
      ...(input.callbackUrl ? { callback_url: input.callbackUrl } : {}),
      ...(input.externalTaskId ? { external_task_id: input.externalTaskId } : {}),
    },
  }

  const res = await fetch(`${API_BASE}/motion-control/kling-3.0`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  const json = (await res.json().catch(() => null)) as {
    code?: number
    message?: string
    data?: KlingTaskData
  } | null

  // Kling renvoie code=0 en cas de succes ; toute autre valeur (ou HTTP non-2xx)
  // est une erreur dont le message porte souvent la vraie raison (moderation...).
  if (!res.ok || !json || json.code !== 0 || !json.data?.id) {
    throw new Error(json?.message || `Kling HTTP ${res.status}`)
  }

  return {
    taskId: String(json.data.id),
    status: (json.data.status || 'submitted') as KlingStatus,
  }
}

/**
 * Interroge le statut d'une tache par son id Kling (polling de secours quand le
 * callback n'est pas encore arrive). Leve une erreur si la requete echoue.
 */
export async function getMotionTask(taskId: string): Promise<KlingTaskResult> {
  const apiKey = getKlingApiKey()
  if (!apiKey) throw new Error('KLING_API_KEY manquante cote serveur.')

  const res = await fetch(`${API_BASE}/tasks?task_ids=${encodeURIComponent(taskId)}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
  })
  const json = (await res.json().catch(() => null)) as {
    code?: number
    message?: string
    data?: KlingTaskData[]
  } | null

  if (!res.ok || !json || json.code !== 0 || !Array.isArray(json.data) || json.data.length === 0) {
    throw new Error(json?.message || `Kling HTTP ${res.status}`)
  }
  return parseTaskData(json.data[0])
}

/**
 * Normalise un objet de tache Kling (renvoye par /tasks OU par le callback) en
 * statut + URL video + duree + message. Le callback "New Callback Function" a la
 * meme forme que les elements de data[] renvoyes par /tasks.
 */
export function parseTaskData(d: KlingTaskData): KlingTaskResult {
  const status = (d.status || 'processing') as KlingStatus
  const video = (d.outputs || []).find((o) => o.type === 'video' && o.url)
  return {
    status,
    videoUrl: video?.url || null,
    duration: video?.duration || null,
    message: d.message || '',
  }
}

/**
 * Verifie la signature d'un callback Kling (standard type "svix").
 *   contenu signe = "{webhook-id}.{webhook-timestamp}.{rawBody}"
 *   cle           = Base64Decode(secret sans le prefixe "whsec_")
 *   attendu       = Base64(HMAC-SHA256(cle, contenu signe))
 * L'en-tete "webhook-signature" peut contenir plusieurs signatures "v1,<sig>"
 * separees par des espaces (periode de rotation) : la verification reussit si
 * l'une d'elles correspond. On verifie aussi l'anciennete du timestamp (anti-rejeu).
 */
export function verifyKlingWebhook(params: {
  rawBody: string
  webhookId: string
  webhookTimestamp: string
  webhookSignature: string
  secret: string
  toleranceSeconds?: number
}): boolean {
  const { rawBody, webhookId, webhookTimestamp, webhookSignature, secret } = params
  const tolerance = params.toleranceSeconds ?? 300

  if (!secret || !webhookId || !webhookTimestamp || !webhookSignature) return false

  // Anti-rejeu : timestamp (en secondes) a +/- 5 minutes de l'heure serveur.
  const ts = Number(webhookTimestamp)
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > tolerance) return false

  let key: Buffer
  try {
    key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
  } catch {
    return false
  }

  const signedContent = `${webhookId}.${webhookTimestamp}.${rawBody}`
  const expected = crypto.createHmac('sha256', key).update(signedContent, 'utf8').digest('base64')
  const expBuf = Buffer.from(expected, 'utf8')

  for (const part of webhookSignature.split(' ')) {
    const comma = part.indexOf(',')
    const sig = comma >= 0 ? part.slice(comma + 1) : part
    const sigBuf = Buffer.from(sig, 'utf8')
    if (sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)) {
      return true
    }
  }
  return false
}

/**
 * Detecte si un message d'erreur Kling correspond a un REFUS de moderation
 * (contenu sensible, celebrite, NSFW, violence, visage non detecte...) plutot
 * qu'a une panne technique. Kling renvoie ces raisons dans "message".
 */
export function isModerationError(msg: string): boolean {
  const m = (msg || '').toLowerCase()
  return (
    m.includes('content_policy') ||
    m.includes('content policy') ||
    m.includes('moderation') ||
    m.includes('risk control') ||
    m.includes('risk_control') ||
    m.includes('sensitive') ||
    m.includes('nsfw') ||
    m.includes('public figure') ||
    m.includes('celebrit') ||
    m.includes('violence') ||
    m.includes('not allowed') ||
    m.includes('prohibited') ||
    m.includes('flagged') ||
    m.includes('no face') ||
    m.includes('face not detected') ||
    m.includes('face detection')
  )
}

// Message clair, en francais, pour un refus de moderation.
export const MODERATION_MESSAGE =
  "Cette generation a ete refusee par la moderation du modele. Causes frequentes : visage d'une personne reelle celebre, contenu sensible/NSFW, violence, ou visage non detecte dans l'image. Essaie avec une autre image/video."
