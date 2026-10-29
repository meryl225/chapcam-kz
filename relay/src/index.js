// Chapcam live signaling relay. Clients speak the Chapcam protocol (v2 tickets);
// the upstream protocol and its identifiers never leave this Worker.
// v1 tickets keep a raw passthrough for mobile builds already installed on devices.

const UPSTREAM_WS_ENDPOINT = 'https://api.vidu.com/live/ws/live/connect'
const UPSTREAM_ORIGIN = 'https://chapcam.com'
const INIT_RETRY_MS = 2000
const MAX_IMAGE_LENGTH = Math.floor(4 * 1024 * 1024 * 1.37)
const IMAGE_PATTERN = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/

const b64urlToBytes = (value) => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4)
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
}

async function openWithKey(ticket, keyBase64) {
  if (!keyBase64) return null
  try {
    const [ivPart, sealedPart] = ticket.split('.')
    const key = await crypto.subtle.importKey('raw', b64urlToBytes(keyBase64.replace(/=+$/, '')), 'AES-GCM', false, ['decrypt'])
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64urlToBytes(ivPart) }, key, b64urlToBytes(sealedPart))
    return JSON.parse(new TextDecoder().decode(plain))
  } catch {
    return null
  }
}

async function openTicket(ticket, env) {
  if (typeof ticket !== 'string' || ticket.length > 4096 || !ticket.includes('.')) return null
  const data = (await openWithKey(ticket, env.RELAY_TICKET_KEY)) ?? (await openWithKey(ticket, env.RELAY_TICKET_KEY_V1))
  if (!data || (data.v !== 1 && data.v !== 2)) return null
  if (!/^\d{1,30}$/.test(data.lid) || typeof data.cid !== 'string' || typeof data.cs !== 'string') return null
  return data
}

function closeWith(code, reason) {
  const pair = new WebSocketPair()
  pair[1].accept()
  pair[1].close(code, reason)
  return new Response(null, { status: 101, webSocket: pair[0] })
}

const sendableCode = (code) => (code === 1000 || (code >= 3000 && code <= 4999) ? code : 4500)

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname === '/health') return new Response('ok')
    if (url.pathname !== '/live') return new Response('Not found', { status: 404 })
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 })
    }

    const ticket = await openTicket(url.searchParams.get('ticket'), env)
    if (!ticket) return closeWith(4401, 'relay: invalid ticket')
    if (Date.now() > ticket.exp) return closeWith(4401, 'relay: ticket expired')

    const stub = env.LIVE_RELAY.get(env.LIVE_RELAY.idFromName(ticket.lid))
    return stub.fetch('https://relay.internal/connect', {
      headers: { Upgrade: 'websocket', 'x-relay-ticket': JSON.stringify(ticket) },
    })
  },
}

export class LiveRelay {
  constructor(state) {
    this.state = state
  }

  async fetch(request) {
    const ticket = JSON.parse(request.headers.get('x-relay-ticket') || 'null')
    if (!ticket) return closeWith(4400, 'relay: missing ticket')

    if (await this.state.storage.get('used')) return closeWith(4409, 'relay: session already connected')
    await this.state.storage.put('used', Date.now())

    const query = new URLSearchParams({ live_id: ticket.lid, conn_id: ticket.cid, client_secret: ticket.cs })
    let upstreamResponse
    try {
      upstreamResponse = await fetch(`${UPSTREAM_WS_ENDPOINT}?${query}`, {
        headers: { Upgrade: 'websocket', Origin: UPSTREAM_ORIGIN },
      })
    } catch (err) {
      console.log(`[relay] upstream unreachable live=${ticket.lid} ${err?.message ?? err}`)
      return closeWith(4502, 'relay: engine unavailable')
    }
    const upstream = upstreamResponse.webSocket
    if (!upstream) {
      const body = await upstreamResponse.text().catch(() => '')
      console.log(`[relay] upstream rejected live=${ticket.lid} status=${upstreamResponse.status} body=${body.slice(0, 200)}`)
      return closeWith(4502, 'relay: engine unavailable')
    }
    upstream.accept()

    const pair = new WebSocketPair()
    const client = pair[1]
    client.accept()
    console.log(`[relay] connected live=${ticket.lid} uid=${ticket.uid} v=${ticket.v}`)

    const chapcamProtocol = ticket.v === 2
    let seq = 1
    let lastSeq = 0
    let hungUp = false
    let finished = false
    let acked = false
    let retryTimer = null

    const safeSend = (socket, data) => {
      try { socket.send(data) } catch {}
    }
    const safeClose = (socket, code, reason) => {
      try { socket.close(sendableCode(code), reason) } catch {}
    }
    const toClient = (msg) => safeSend(client, JSON.stringify(msg))
    const toUpstream = (type, payload) =>
      safeSend(upstream, JSON.stringify({ type, live_id: ticket.lid, conn_id: ticket.cid, seq_id: seq++, payload }))
    const hangupUpstream = () => {
      if (hungUp) return
      hungUp = true
      if (chapcamProtocol) toUpstream(5, { hangup: { hangup_reason: 'user_hangup' } })
      else safeSend(upstream, JSON.stringify({
        type: 5, live_id: ticket.lid, conn_id: ticket.cid, seq_id: lastSeq + 1,
        payload: { hangup: { hangup_reason: 'user_hangup' } },
      }))
    }

    // A client that vanishes without hanging up still ends (and stops billing) the remote session.
    const finishFromClient = (code) => {
      if (finished) return
      finished = true
      clearTimeout(retryTimer)
      hangupUpstream()
      console.log(`[relay] client closed live=${ticket.lid} code=${code}`)
      safeClose(upstream, 1000, 'client closed')
    }
    const finishFromUpstream = (code, reason) => {
      if (finished) return
      finished = true
      clearTimeout(retryTimer)
      console.log(`[relay] upstream closed live=${ticket.lid} code=${code} reason=${reason}`)
      safeClose(client, code === 1000 ? 1000 : 4502, 'relay: session closed')
    }

    if (chapcamProtocol) {
      const sendInit = () => toUpstream(1, { conn_init: { version: 1 } })
      sendInit()

      client.addEventListener('message', (event) => {
        if (typeof event.data !== 'string' || event.data.length > MAX_IMAGE_LENGTH + 256) return
        let msg
        try { msg = JSON.parse(event.data) } catch { return }
        if (msg?.t === 'hangup') hangupUpstream()
        else if (msg?.t === 'avatar' && acked && typeof msg.image === 'string' && msg.image.length <= MAX_IMAGE_LENGTH && IMAGE_PATTERN.test(msg.image)) {
          toUpstream(13, { switch_prompt: { editing_type: ticket.et, prompts: [{ type: 'image', content: msg.image }] } })
        }
      })
      upstream.addEventListener('message', (event) => {
        let msg
        try { msg = JSON.parse(event.data) } catch { return }
        const ack = msg?.payload?.conn_init_ack
        if (msg?.type === 2 && ack) {
          if (ack.success) {
            if (!acked) { acked = true; toClient({ t: 'ready' }) }
          } else if (ack.error_code === 'NOT_READY') {
            toClient({ t: 'warming' })
            retryTimer = setTimeout(() => !acked && !finished && sendInit(), INIT_RETRY_MS)
          } else {
            console.log(`[relay] init rejected live=${ticket.lid} ${ack.error_code} ${ack.error_msg ?? ''}`)
            toClient({ t: 'error', code: 'init_failed' })
            finishFromClient(4502)
            safeClose(client, 4502, 'relay: init failed')
          }
        } else if (msg?.type === 14 && msg?.payload?.switch_prompt_ack && !msg.payload.switch_prompt_ack.success) {
          toClient({ t: 'avatar_failed' })
        } else if (msg?.type === 6) {
          console.log(`[relay] upstream hangup live=${ticket.lid} ${msg?.payload?.hangup?.hangup_reason ?? ''}`)
          hungUp = true
          toClient({ t: 'ended' })
        }
      })
    } else {
      client.addEventListener('message', (event) => {
        if (typeof event.data === 'string') {
          try {
            const msg = JSON.parse(event.data)
            if (typeof msg?.seq_id === 'number' && msg.seq_id > lastSeq) lastSeq = msg.seq_id
            if (msg?.type === 5) hungUp = true
          } catch {}
        }
        safeSend(upstream, event.data)
      })
      upstream.addEventListener('message', (event) => safeSend(client, event.data))
    }

    client.addEventListener('close', (event) => finishFromClient(event.code))
    client.addEventListener('error', () => finishFromClient(1006))
    upstream.addEventListener('close', (event) => finishFromUpstream(event.code, event.reason))
    upstream.addEventListener('error', () => finishFromUpstream(1006, 'error'))

    return new Response(null, { status: 101, webSocket: pair[0] })
  }
}
