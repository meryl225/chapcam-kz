import { NextResponse, type NextRequest } from 'next/server'
import { requireUserId, UnauthorizedError } from '@/lib/numbers/auth'
import { releaseNumber } from '@/lib/numbers/telnyx/client'
import {
  getSubscription,
  setSubscriptionStatus,
  setAutoRenew,
  listMessages,
  listCalls,
} from '@/lib/numbers/subscriptions'

/** Détail d'un abonnement + ses messages et appels. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId()
    const { id } = await ctx.params
    const subId = Number(id)
    const sub = await getSubscription(userId, subId)
    if (!sub) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
    const [messages, calls] = await Promise.all([listMessages(userId, subId), listCalls(userId, subId)])
    return NextResponse.json({ subscription: sub, messages, calls })
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    console.log('[v0] durable detail error:', (e as Error)?.message)
    return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  }
}

/** Met à jour le renouvellement automatique. */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId()
    const { id } = await ctx.params
    const subId = Number(id)
    const sub = await getSubscription(userId, subId)
    if (!sub) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
    const body = (await req.json().catch(() => ({}))) as { autoRenew?: boolean }
    if (typeof body.autoRenew === 'boolean') {
      await setAutoRenew(userId, subId, body.autoRenew)
    }
    const updated = await getSubscription(userId, subId)
    return NextResponse.json({ subscription: updated })
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    console.log('[v0] durable patch error:', (e as Error)?.message)
    return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  }
}

/**
 * Résilie un abonnement : libère le numéro chez Telnyx (arrête la facturation
 * fournisseur) et passe l'abonnement en `cancelled`. Pas de remboursement de la
 * période en cours (le client garde l'usage jusqu'à la fin de période).
 */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId()
    const { id } = await ctx.params
    const subId = Number(id)
    const sub = await getSubscription(userId, subId)
    if (!sub) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
    if (sub.status === 'cancelled' || sub.status === 'expired') {
      return NextResponse.json({ ok: true })
    }
    await releaseNumber(sub.provider_number_id, sub.phone_e164).catch((e) => {
      console.log('[v0] releaseNumber on cancel failed:', (e as Error)?.message)
    })
    await setSubscriptionStatus(subId, 'cancelled', { cancelledAt: new Date(), autoRenew: false })
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    console.log('[v0] durable cancel error:', (e as Error)?.message)
    return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  }
}
