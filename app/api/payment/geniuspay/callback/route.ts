import { NextRequest, NextResponse } from 'next/server'
import { fulfillGeniusPayPayment, verifyGeniusPayWebhook } from '@/lib/geniuspay'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// WEBHOOK GeniusPay : notification automatique apres un evenement de paiement.
// L'URL est configuree dans le tableau de bord GeniusPay (Integrations >
// Webhooks) avec les evenements payment.success / payment.failed.
//
// Securite : on lit le corps BRUT pour verifier la signature HMAC-SHA256, PUIS
// on reconfirme le paiement aupres de l'API GeniusPay (server-to-server) avant
// tout credit. On ne credite jamais sur la seule foi du corps du webhook.
export async function POST(request: NextRequest) {
  // Corps brut indispensable pour une verification de signature fiable.
  const rawBody = await request.text()

  const signature = request.headers.get('x-webhook-signature')
  const timestamp = request.headers.get('x-webhook-timestamp')
  const event = request.headers.get('x-webhook-event') || ''

  // Verification de signature obligatoire (protege contre les requetes forgees).
  const validSignature = verifyGeniusPayWebhook({ timestamp, rawBody, signature })
  if (!validSignature) {
    console.error('[GeniusPay Webhook] Signature invalide ou timestamp expire')
    return NextResponse.json({ success: false, error: 'signature invalide' }, { status: 401 })
  }

  let payload: any = null
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ success: false, error: 'corps invalide' }, { status: 400 })
  }

  const reference: string | null = payload?.data?.reference || null
  if (!reference) {
    console.error('[GeniusPay Webhook] reference introuvable dans le payload')
    return NextResponse.json({ success: false, error: 'reference manquante' }, { status: 400 })
  }

  // Les evenements de retrait/compte (cashout.*, webhook.test) ne concernent pas
  // le credit client : on accuse reception sans rien crediter.
  const eventName = event || payload?.event || ''
  if (eventName && !eventName.startsWith('payment.')) {
    return NextResponse.json({ success: true, ignored: eventName })
  }

  const outcome = await fulfillGeniusPayPayment({
    reference: String(reference),
    source: 'geniuspay_callback',
  })
  console.log(
    `[GeniusPay Webhook] event=${eventName} ref=${reference} status=${outcome.status} alreadyDone=${outcome.alreadyDone}` +
      (outcome.result ? ` kind=${outcome.result.kind} linked=${outcome.result.userLinked}` : ''),
  )

  return NextResponse.json({ success: outcome.status === 'completed', status: outcome.status })
}
