import { NextResponse, type NextRequest } from 'next/server'
import { requireUserId, UnauthorizedError } from '@/lib/numbers/auth'
import { getSubscription, listMessages, markThreadRead } from '@/lib/numbers/subscriptions'

/** Messages d'un numéro durable (polling côté client pour les SMS entrants). */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId()
    const { id } = await ctx.params
    const subId = Number(id)
    const sub = await getSubscription(userId, subId)
    if (!sub) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
    const messages = await listMessages(userId, subId)
    return NextResponse.json({ messages })
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    console.log('[v0] durable messages error:', (e as Error)?.message)
    return NextResponse.json({ messages: [] })
  }
}

/** Marque une conversation comme lue. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId()
    const { id } = await ctx.params
    const subId = Number(id)
    const sub = await getSubscription(userId, subId)
    if (!sub) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
    const body = (await req.json().catch(() => ({}))) as { peer?: string }
    if (body.peer) await markThreadRead(userId, subId, body.peer)
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    console.log('[v0] durable mark read error:', (e as Error)?.message)
    return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  }
}
