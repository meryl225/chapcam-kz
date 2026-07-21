import { NextRequest, NextResponse } from 'next/server'
import { fulfillNowPayment, verifyNowSignature } from '@/lib/nowpayments'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// IPN NOWPayments : notification automatique a chaque changement de statut d'un
// paiement. L'URL est fournie a la creation de la facture (ipn_callback_url).
// Securite : on lit le corps BRUT, on verifie la signature HMAC-SHA512
// (x-nowpayments-sig), PUIS on reconfirme le paiement aupres de l'API
// NOWPayments (server-to-server) avant tout credit.
export async function POST(request: NextRequest) {
  const raw = await request.text()
  const signature = request.headers.get('x-nowpayments-sig')

  if (!verifyNowSignature(raw, signature)) {
    console.error('[NOWPayments Callback] Signature IPN invalide')
    return NextResponse.json({ success: false, error: 'signature invalide' }, { status: 401 })
  }

  let body: Record<string, any> = {}
  try {
    body = JSON.parse(raw)
  } catch {
    return NextResponse.json({ success: false, error: 'corps invalide' }, { status: 400 })
  }

  const paymentId = body?.payment_id ? String(body.payment_id) : null
  if (!paymentId) {
    console.error('[NOWPayments Callback] payment_id introuvable dans l IPN')
    return NextResponse.json({ success: false, error: 'payment_id manquant' }, { status: 400 })
  }

  const outcome = await fulfillNowPayment({ paymentId, source: 'nowpayments_callback' })
  console.log(
    `[NOWPayments Callback] payment=${paymentId} status=${outcome.status} alreadyDone=${outcome.alreadyDone}` +
      (outcome.result ? ` kind=${outcome.result.kind} linked=${outcome.result.userLinked}` : ''),
  )

  return NextResponse.json({ success: outcome.status === 'completed', status: outcome.status })
}
