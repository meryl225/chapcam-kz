import { NextResponse, type NextRequest } from 'next/server'
import { requireUserId, UnauthorizedError } from '@/lib/numbers/auth'
import { sendSms } from '@/lib/numbers/telnyx/client'
import { getSubscription, insertMessage } from '@/lib/numbers/subscriptions'
import { normalizePhone } from '@/lib/numbers/providers/types'

/** Envoie un SMS depuis un numéro durable de l'utilisateur. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId()
    const { id } = await ctx.params
    const subId = Number(id)
    const sub = await getSubscription(userId, subId)
    if (!sub) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
    if (sub.status !== 'active') {
      return NextResponse.json({ error: 'Abonnement inactif. Renouvelez pour envoyer.' }, { status: 403 })
    }

    const body = (await req.json().catch(() => ({}))) as { to?: string; text?: string }
    const to = normalizePhone(body.to || '')
    const text = (body.text || '').trim()
    if (!to || to.length < 6 || !text) {
      return NextResponse.json({ error: 'Destinataire ou message manquant.' }, { status: 400 })
    }
    if (text.length > 1000) {
      return NextResponse.json({ error: 'Message trop long (max 1000 caractères).' }, { status: 400 })
    }

    const sent = await sendSms({ from: sub.phone_e164, to, text })
    const msg = await insertMessage({
      subscriptionId: subId,
      userId,
      direction: 'outbound',
      phoneSelf: sub.phone_e164,
      phonePeer: to,
      body: text,
      providerMessageId: sent.providerMessageId,
      status: 'sent',
      read: true,
    })
    return NextResponse.json({ message: msg })
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    console.log('[v0] durable send error:', (e as Error)?.message)
    return NextResponse.json({ error: "Échec de l'envoi du SMS." }, { status: 502 })
  }
}
