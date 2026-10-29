import 'server-only'
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto'
import { liveEngineKey, type LiveEditingType } from './upstream'

// Chapcam signaling relay (Cloudflare Worker). Only signaling flows through it.
export const LIVE_RELAY_URL =
  process.env.LIVE_RELAY_URL || 'wss://chapcam-live-relay.meryl-kacou.workers.dev/live'

const RELAY_TICKET_TTL_MS = 90_000
const SESSION_HANDLE_TTL_MS = 6 * 60 * 60 * 1000

// Derived keys: the relay only stores its own derived key, never the engine key.
const deriveKey = (label: string) => createHmac('sha256', liveEngineKey()).update(label).digest()
export const relayTicketKey = () => deriveKey('chapcam-live-relay-ticket-v2')
const sessionHandleKey = () => deriveKey('chapcam-live-session-handle-v1')

const b64url = (buf: Buffer) => buf.toString('base64url')

// AES-256-GCM, ciphertext followed by the 16-byte tag (WebCrypto layout, readable by the Worker).
function seal(key: Buffer, data: object): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const sealed = Buffer.concat([cipher.update(JSON.stringify(data), 'utf8'), cipher.final(), cipher.getAuthTag()])
  return `${b64url(iv)}.${b64url(sealed)}`
}

function open<T>(key: Buffer, token: string): T | null {
  if (typeof token !== 'string' || token.length > 2048) return null
  const [ivPart, sealedPart] = token.split('.')
  if (!ivPart || !sealedPart) return null
  try {
    const sealed = Buffer.from(sealedPart, 'base64url')
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivPart, 'base64url'))
    decipher.setAuthTag(sealed.subarray(sealed.length - 16))
    const plain = Buffer.concat([decipher.update(sealed.subarray(0, sealed.length - 16)), decipher.final()])
    return JSON.parse(plain.toString('utf8')) as T
  } catch {
    return null
  }
}

// v2 tickets make the relay speak the Chapcam protocol: provider ids never reach the client.
export function createRelayTicket(input: {
  liveId: string
  connId: string
  clientSecret: string
  userId: string
  editingType: LiveEditingType
}): string {
  return seal(relayTicketKey(), {
    v: 2,
    lid: input.liveId,
    cid: input.connId,
    cs: input.clientSecret,
    uid: input.userId,
    et: input.editingType,
    exp: Date.now() + RELAY_TICKET_TTL_MS,
  })
}

// v1 tickets keep the raw passthrough protocol for mobile builds already installed on devices.
const legacyRelayTicketKey = () => deriveKey('chapcam-vidu-relay-ticket-v1')
export const legacyRelayKeyForWorker = legacyRelayTicketKey

export function createLegacyRelayTicket(input: { liveId: string; connId: string; clientSecret: string; userId: string }): string {
  return seal(legacyRelayTicketKey(), {
    v: 1,
    lid: input.liveId,
    cid: input.connId,
    cs: input.clientSecret,
    uid: input.userId,
    exp: Date.now() + RELAY_TICKET_TTL_MS,
  })
}

interface SessionHandle {
  sid: string
  lid: string
  uid: string
  exp: number
}

// Opaque handle the client gives back to end the session; the provider live id stays sealed inside.
export function createSessionHandle(sessionId: string, liveId: string, userId: string): string {
  return seal(sessionHandleKey(), { sid: sessionId, lid: liveId, uid: userId, exp: Date.now() + SESSION_HANDLE_TTL_MS })
}

export function openSessionHandle(handle: string, userId: string): SessionHandle | null {
  const data = open<SessionHandle>(sessionHandleKey(), handle)
  if (!data || data.uid !== userId || Date.now() > data.exp) return null
  return data
}
