import { NextResponse, type NextRequest } from 'next/server'
import { verifyWebhookSignature } from '@/lib/numbers/telnyx/client'
import { getSubscriptionByPhone, insertMessage } from '@/lib/numbers/subscriptions'

// Webhook public (pas d'auth utilisateur) : la sécurité repose sur la
// vérification de signature Ed25519 de Telnyx. Doit répondre 200 vite.
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('telnyx-signature-ed25519')
  const timestamp = req.headers.get('telnyx-timestamp')

  if (!verifyWebhookSignature({ rawBody, signatureB64: signature, timestamp })) {
    console.log('[v0] Telnyx SMS webhook: signature invalide')
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
  }

  let event: any = null
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ ok: true })
  }

  const data = event?.data
  const type = data?.event_type
  const payload = data?.payload

  // On ne traite que les SMS entrants. Les autres events (DLR sortants...) sont
  // acquittés sans action pour l'instant.
  if (type === 'message.received' && payload) {
    try {
      const fromPhone: string = payload.from?.phone_number
      // `to` est un tableau ; on prend le premier numéro ChapCam destinataire.
      const toPhone: string = Array.isArray(payload.to) ? payload.to[0]?.phone_number : payload.to?.phone_number
      const text: string = payload.text ?? ''
      const providerMessageId: string = payload.id

      if (toPhone) {
        const sub = await getSubscriptionByPhone(toPhone)
        if (sub) {
          await insertMessage({
            subscriptionId: sub.id,
            userId: sub.user_id,
            direction: 'inbound',
            phoneSelf: toPhone,
            phonePeer: fromPhone,
            body: text,
            providerMessageId,
            status: 'received',
            read: false,
          })
        } else {
          console.log('[v0] Telnyx SMS webhook: aucun abonnement pour', toPhone)
        }
      }
    } catch (e) {
      console.log('[v0] Telnyx SMS webhook handler error:', (e as Error)?.message)
      // On renvoie 200 quand même pour éviter les retries en boucle de Telnyx.
    }
  }

  return NextResponse.json({ ok: true })
}
