import { NextResponse } from 'next/server'
import { requireUserId, UnauthorizedError } from '@/lib/numbers/auth'
import { listSubscriptions, countUnread } from '@/lib/numbers/subscriptions'

/** Liste les abonnements (numéros durables) de l'utilisateur + total non lus. */
export async function GET() {
  try {
    const userId = await requireUserId()
    const [subscriptions, unread] = await Promise.all([listSubscriptions(userId), countUnread(userId)])
    return NextResponse.json({ subscriptions, unread })
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    console.log('[v0] durable list error:', (e as Error)?.message)
    return NextResponse.json({ subscriptions: [], unread: 0 })
  }
}
