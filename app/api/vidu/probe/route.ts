import https from 'node:https'
import { randomBytes, randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getViduLive } from '@/lib/vidu'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface HandshakeResult {
  status: number | null
  body: string
  error?: string
}

// Browsers hide the HTTP status of a rejected WebSocket handshake (they only report 1006),
// so the server replays it to surface Vidu's real rejection reason.
function probeHandshake(liveId: string, clientSecret: string): Promise<HandshakeResult> {
  return new Promise((resolve) => {
    const query = new URLSearchParams({ live_id: liveId, conn_id: randomUUID(), client_secret: clientSecret })
    const req = https.request({
      host: 'api.vidu.com',
      path: `/live/ws/live/connect?${query}`,
      timeout: 10000,
      headers: {
        Connection: 'Upgrade',
        Upgrade: 'websocket',
        'Sec-WebSocket-Version': '13',
        'Sec-WebSocket-Key': randomBytes(16).toString('base64'),
        Origin: 'https://chapcam.com',
      },
    })
    req.on('upgrade', (res, socket) => {
      socket.destroy()
      resolve({ status: res.statusCode ?? 101, body: '' })
    })
    req.on('response', (res) => {
      let body = ''
      res.on('data', (chunk) => (body += chunk))
      res.on('end', () => resolve({ status: res.statusCode ?? null, body: body.slice(0, 300) }))
    })
    req.on('timeout', () => {
      req.destroy()
      resolve({ status: null, body: '', error: 'timeout' })
    })
    req.on('error', (err) => resolve({ status: null, body: '', error: err.message }))
    req.end()
  })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifie.' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const liveId = body?.liveId
  const clientSecret = body?.clientSecret
  if (typeof liveId !== 'string' || !/^\d{1,30}$/.test(liveId) || typeof clientSecret !== 'string' || clientSecret.length > 2048) {
    return NextResponse.json({ error: 'Parametres invalides.' }, { status: 400 })
  }

  const [handshake, live] = await Promise.all([
    probeHandshake(liveId, clientSecret),
    getViduLive(liveId).catch(() => null),
  ])
  console.log(`[Vidu] ws probe user=${user.id} live=${liveId} status=${handshake.status} live_status=${live?.status} body=${handshake.body}`)
  return NextResponse.json({ handshake, live })
}
