import 'server-only'

// Live Swap realtime engine (third-party). Everything provider-specific stays in this
// server-only module: clients only ever talk to /api/live/session and the Chapcam relay.
const UPSTREAM_API_BASE = process.env.LIVE_ENGINE_API_BASE || 'https://api.vidu.com'

export const LIVE_EDITING_TYPES = [
  'subject_replacement',
  'style_transfer',
  'virtual_tryon',
  'background_replacement',
] as const
export type LiveEditingType = (typeof LIVE_EDITING_TYPES)[number]

export function isLiveEditingType(value: unknown): value is LiveEditingType {
  return typeof value === 'string' && (LIVE_EDITING_TYPES as readonly string[]).includes(value)
}

// The engine rejects images over 4 MB; base64 adds ~33 %.
const MAX_DATA_URI_LENGTH = Math.floor(4 * 1024 * 1024 * 1.37)
const DATA_URI_PATTERN = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/

export function isValidImageDataUri(value: unknown): value is string {
  return typeof value === 'string' && value.length <= MAX_DATA_URI_LENGTH && DATA_URI_PATTERN.test(value)
}

export function liveEngineKey(): string {
  const key = process.env.VIDU_API_KEY
  if (!key) throw new Error('Live engine key is not configured')
  return key
}

export interface UpstreamSession {
  liveId: string
  clientSecret: string
  renderUid: string
  rtcToken: string
  rtcUserId: string
}

export class LiveEngineError extends Error {
  constructor(message: string, readonly status: number, readonly contentRejected = false) {
    super(message)
  }
}

export async function createUpstreamSession(imageDataUri: string, editingType: LiveEditingType): Promise<UpstreamSession> {
  const res = await fetch(`${UPSTREAM_API_BASE}/live/s_editing/realtime`, {
    method: 'POST',
    headers: { Authorization: `Token ${liveEngineKey()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_url: imageDataUri, editing_type: editingType }),
    cache: 'no-store',
  })
  const text = await res.text()
  if (!res.ok) {
    console.error('[live-engine] create failed', res.status, text.slice(0, 500))
    throw new LiveEngineError(`create failed (${res.status})`, res.status, text.includes('AuditSubmitIllegal'))
  }
  const body = JSON.parse(text)
  if (!body?.live?.id || !body?.rtc?.token || !body?.client_secret || !body?.render_uid) {
    throw new LiveEngineError('incomplete session', 502)
  }
  return {
    liveId: String(body.live.id),
    clientSecret: String(body.client_secret),
    renderUid: String(body.render_uid),
    rtcToken: String(body.rtc.token),
    rtcUserId: String(body.rtc.user_id ?? ''),
  }
}

export interface UpstreamLiveStatus {
  status: string
  billedSeconds: number
  closeReason: string | null
}

export async function getUpstreamLive(liveId: string): Promise<UpstreamLiveStatus | null> {
  if (!/^\d{1,30}$/.test(liveId)) return null
  const res = await fetch(`${UPSTREAM_API_BASE}/live/v1/lives/${liveId}`, {
    headers: { Authorization: `Token ${liveEngineKey()}` },
    cache: 'no-store',
  })
  if (!res.ok) return null
  const live = (await res.json().catch(() => null))?.live
  if (!live) return null
  return {
    status: String(live.status ?? ''),
    billedSeconds: Number(live.billed_seconds ?? 0),
    closeReason: live.close_reason ? String(live.close_reason) : null,
  }
}
