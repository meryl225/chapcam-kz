import 'server-only'
import { createCipheriv, createHmac, randomBytes } from 'node:crypto'

// Browsers cannot reach Vidu's signaling socket directly (handshake works server-side only),
// so they connect to the Cloudflare relay, exactly like the official Quick Start's local proxy.
export const VIDU_RELAY_URL = process.env.VIDU_RELAY_URL || 'wss://relay.chapcam.com/live'

const TICKET_TTL_MS = 90_000
const TICKET_KEY_LABEL = 'chapcam-vidu-relay-ticket-v1'

// Derived from VIDU_API_KEY so no extra Vercel secret is needed. The Worker stores only this
// derived key (RELAY_TICKET_KEY), never the Vidu API key itself.
export function relayTicketKey(): Buffer {
  const apiKey = process.env.VIDU_API_KEY
  if (!apiKey) throw new Error('VIDU_API_KEY is not configured')
  return createHmac('sha256', apiKey).update(TICKET_KEY_LABEL).digest()
}

const b64url = (buf: Buffer) => buf.toString('base64url')

// AES-256-GCM sealed ticket: the browser carries it but cannot read the client_secret inside.
// Layout matches WebCrypto (ciphertext followed by the 16-byte tag) so the Worker can open it.
export function createRelayTicket(input: { liveId: string; connId: string; clientSecret: string; userId: string }): string {
  const payload = JSON.stringify({
    v: 1,
    lid: input.liveId,
    cid: input.connId,
    cs: input.clientSecret,
    uid: input.userId,
    exp: Date.now() + TICKET_TTL_MS,
  })
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', relayTicketKey(), iv)
  const sealed = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final(), cipher.getAuthTag()])
  return `${b64url(iv)}.${b64url(sealed)}`
}
