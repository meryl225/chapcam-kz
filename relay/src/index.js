// ChapCam -> Cloudflare relay -> Vidu signaling WebSocket.
// Same role as the local proxy in Vidu's official Quick Start: only signaling flows here,
// RTC media stays direct between the browser and Vidu's RTC infrastructure.

const VIDU_WS_ENDPOINT = 'https://api.vidu.com/live/ws/live/connect'
// Handshake replayed exactly as the server-side probe that Vidu accepted (HTTP 101).
const UPSTREAM_ORIGIN = 'https://chapcam.com'

const b64urlToBytes = (value) => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4)
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
}

async function openTicket(ticket, keyBase64) {
  if (typeof ticket !== 'string' || ticket.length > 4096 || !ticket.includes('.')) return null
  try {
    const [ivPart, sealedPart] = ticket.split('.')
    const key = await crypto.subtle.importKey('raw', b64urlToBytes(keyBase64.replace(/=+$/, '')), 'AES-GCM', false, ['decrypt'])
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64urlToBytes(ivPart) }, key, b64urlToBytes(sealedPart))
    const data = JSON.parse(new TextDecoder().decode(plain))
    if (data?.v !== 1 || !/^\d{1,30}$/.test(data.lid) || typeof data.cid !== 'string' || typeof data.cs !== 'string') return null
    return data
  } catch {
    return null
  }
}

// Browsers only expose close codes/reasons, never HTTP statuses, so failures are reported
// by accepting the socket and closing it immediately with a readable reason.
function closeWith(code, reason) {
  const pair = new WebSocketPair()
  pair[1].accept()
  pair[1].close(code, String(reason).replace(/[^\x20-\x7e]/g, '').slice(0, 120))
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

    const ticket = await openTicket(url.searchParams.get('ticket'), env.RELAY_TICKET_KEY ?? '')
    if (!ticket) return closeWith(4401, 'relay: invalid ticket')
    if (Date.now() > ticket.exp) return closeWith(4401, 'relay: ticket expired')

    // One Durable Object per live_id guarantees a single upstream connection per session.
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
      upstreamResponse = await fetch(`${VIDU_WS_ENDPOINT}?${query}`, {
        headers: { Upgrade: 'websocket', Origin: UPSTREAM_ORIGIN },
      })
    } catch (err) {
      console.log(`[relay] upstream unreachable live=${ticket.lid} ${err?.message ?? err}`)
      return closeWith(4502, 'relay: vidu unreachable')
    }
    const upstream = upstreamResponse.webSocket
    if (!upstream) {
      const body = await upstreamResponse.text().catch(() => '')
      console.log(`[relay] upstream rejected live=${ticket.lid} status=${upstreamResponse.status} body=${body.slice(0, 200)}`)
      return closeWith(4502, `relay: vidu ${upstreamResponse.status} ${body.slice(0, 80)}`)
    }
    upstream.accept()

    const pair = new WebSocketPair()
    const client = pair[1]
    client.accept()
    console.log(`[relay] connected live=${ticket.lid} uid=${ticket.uid}`)

    let lastSeq = 0
    let hungUp = false
    let finished = false

    const safeSend = (socket, data) => {
      try { socket.send(data) } catch {}
    }
    const safeClose = (socket, code, reason) => {
      try { socket.close(sendableCode(code), String(reason || '').slice(0, 120)) } catch {}
    }

    // If the browser vanishes without hanging up, end the Vidu session right away
    // so it does not keep running (and billing) until Vidu's own timeout.
    const finishFromClient = (code, reason) => {
      if (finished) return
      finished = true
      if (!hungUp) {
        safeSend(upstream, JSON.stringify({
          type: 5, live_id: ticket.lid, conn_id: ticket.cid, seq_id: lastSeq + 1,
          payload: { hangup: { hangup_reason: 'user_hangup' } },
        }))
      }
      console.log(`[relay] client closed live=${ticket.lid} code=${code} hungUp=${hungUp}`)
      safeClose(upstream, 1000, 'client closed')
    }
    const finishFromUpstream = (code, reason) => {
      if (finished) return
      finished = true
      console.log(`[relay] vidu closed live=${ticket.lid} code=${code} reason=${reason}`)
      safeClose(client, code, `vidu closed ${code}${reason ? ` ${reason}` : ''}`)
    }

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
    client.addEventListener('close', (event) => finishFromClient(event.code, event.reason))
    client.addEventListener('error', () => finishFromClient(1006, 'error'))
    upstream.addEventListener('close', (event) => finishFromUpstream(event.code, event.reason))
    upstream.addEventListener('error', () => finishFromUpstream(1006, 'error'))

    return new Response(null, { status: 101, webSocket: pair[0] })
  }
}
