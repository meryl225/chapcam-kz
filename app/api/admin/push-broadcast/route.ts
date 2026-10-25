import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import { broadcastPush, countPushAudience } from '@/lib/push-notifications'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const NO_STORE = { 'Cache-Control': 'private, no-store' }
const TITLE_MAX = 65
const BODY_MAX = 240

export async function GET() {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'Non autorisé' }, { status: 401, headers: NO_STORE })
  try {
    return NextResponse.json(await countPushAudience(), { headers: NO_STORE })
  } catch (err) {
    console.error('[admin/push-broadcast] Comptage impossible:', err)
    return NextResponse.json({ error: 'Lecture des appareils impossible' }, { status: 500, headers: NO_STORE })
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'Non autorisé' }, { status: 401, headers: NO_STORE })

  const body = (await request.json().catch(() => ({}))) as { title?: unknown; body?: unknown }
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const message = typeof body.body === 'string' ? body.body.trim() : ''
  if (!title || !message) {
    return NextResponse.json({ error: 'Titre et message obligatoires' }, { status: 400, headers: NO_STORE })
  }
  if (title.length > TITLE_MAX || message.length > BODY_MAX) {
    return NextResponse.json(
      { error: `Titre ${TITLE_MAX} caractères max, message ${BODY_MAX} max` },
      { status: 400, headers: NO_STORE },
    )
  }

  try {
    const result = await broadcastPush({ title, body: message })
    console.log('[admin/push-broadcast] Diffusion:', result)
    return NextResponse.json(result, { headers: NO_STORE })
  } catch (err) {
    console.error('[admin/push-broadcast] Envoi impossible:', err)
    return NextResponse.json({ error: 'Envoi impossible' }, { status: 500, headers: NO_STORE })
  }
}
