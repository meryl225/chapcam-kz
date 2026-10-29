import 'server-only'
import { createHash } from 'node:crypto'

// Cle Vidu "overseas" (vda_...) : elle n'est valide que sur api.vidu.com.
export const VIDU_API_BASE = 'https://api.vidu.com'
export const VIDU_WS_URL = 'wss://api.vidu.com/live/ws/live/connect'

export const VIDU_EDITING_TYPES = [
  'subject_replacement',
  'style_transfer',
  'virtual_tryon',
  'background_replacement',
] as const
export type ViduEditingType = (typeof VIDU_EDITING_TYPES)[number]

export function isViduEditingType(value: unknown): value is ViduEditingType {
  return typeof value === 'string' && (VIDU_EDITING_TYPES as readonly string[]).includes(value)
}

// Vidu refuse les images > 4 Mo ; l'encodage base64 ajoute ~33 %.
const MAX_DATA_URI_LENGTH = Math.floor(4 * 1024 * 1024 * 1.37)
const DATA_URI_PATTERN = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/

export function isValidImageDataUri(value: unknown): value is string {
  return typeof value === 'string' && value.length <= MAX_DATA_URI_LENGTH && DATA_URI_PATTERN.test(value)
}

function apiKey(): string {
  const key = process.env.VIDU_API_KEY
  if (!key) throw new Error('VIDU_API_KEY is not configured')
  return key
}

export interface ViduRtcInfo {
  app_id: string
  channel_id: string
  user_id: string
  token: string
  token_expire_at: string | number
  provider: string
}

export interface ViduSession {
  liveId: string
  clientSecret: string
  renderUid: string
  rtc: ViduRtcInfo
}

export class ViduApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

// Resume du payload sans l'image ni la cle : suffit pour comparer deux requetes.
export function describeViduPayload(imageDataUri: string, editingType: ViduEditingType) {
  const mime = imageDataUri.slice(5, imageDataUri.indexOf(';'))
  const base64 = imageDataUri.slice(imageDataUri.indexOf(',') + 1)
  const bytes = Math.floor((base64.length * 3) / 4) - (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0)
  return {
    endpoint: `${VIDU_API_BASE}/live/s_editing/realtime`,
    keys: ['image_url', 'editing_type'],
    editing_type: editingType,
    mime,
    bytes,
    mb: Number((bytes / 1048576).toFixed(3)),
    sha256_8: createHash('sha256').update(base64).digest('hex').slice(0, 8),
  }
}

export async function createViduSession(imageDataUri: string, editingType: ViduEditingType): Promise<ViduSession> {
  const payloadSummary = describeViduPayload(imageDataUri, editingType)
  console.log('[Vidu] create session payload', JSON.stringify(payloadSummary))
  const res = await fetch(`${VIDU_API_BASE}/live/s_editing/realtime`, {
    method: 'POST',
    headers: { Authorization: `Token ${apiKey()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_url: imageDataUri, editing_type: editingType }),
    cache: 'no-store',
  })
  const text = await res.text()
  if (!res.ok) {
    console.error('[Vidu] create session failed', res.status, text.slice(0, 1000), JSON.stringify(payloadSummary))
    const { mime, bytes, mb, sha256_8 } = payloadSummary
    throw new ViduApiError(
      `Vidu create failed (${res.status}): ${text.slice(0, 200)} | payload ${editingType} ${mime} ${bytes}B (${mb}MB) sha=${sha256_8}`,
      res.status,
    )
  }
  const body = JSON.parse(text)
  if (!body?.live?.id || !body?.rtc?.token || !body?.client_secret || !body?.render_uid) {
    throw new ViduApiError('Vidu returned an incomplete session', 502)
  }
  return {
    liveId: String(body.live.id),
    clientSecret: body.client_secret,
    renderUid: body.render_uid,
    rtc: body.rtc,
  }
}

export interface ViduLiveStatus {
  status: string
  billedSeconds: number
  creditsCost: number
  closeReason: string | null
}

export async function getViduLive(liveId: string): Promise<ViduLiveStatus | null> {
  if (!/^\d{1,30}$/.test(liveId)) return null
  const res = await fetch(`${VIDU_API_BASE}/live/v1/lives/${liveId}`, {
    headers: { Authorization: `Token ${apiKey()}` },
    cache: 'no-store',
  })
  if (!res.ok) return null
  const body = await res.json().catch(() => null)
  const live = body?.live
  if (!live) return null
  return {
    status: String(live.status ?? ''),
    billedSeconds: Number(live.billed_seconds ?? 0),
    creditsCost: Number(live.credits_cost ?? 0),
    closeReason: live.close_reason ? String(live.close_reason) : null,
  }
}
