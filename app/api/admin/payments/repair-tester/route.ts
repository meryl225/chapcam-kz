import { NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { activateSubscription, logPaymentEvent } from '@/lib/fulfillment'
import { getPlan } from '@/lib/plans'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Répare les paiements anniv_5 déjà approuvés avant que le produit soit traité
// comme un véritable abonnement. La présence d'un log subscription rend l'opération idempotente.
export async function POST() {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const admin = createAdminClient()
  const plan = getPlan('anniv_5')
  if (!plan) return NextResponse.json({ error: 'Configuration anniv_5 introuvable.' }, { status: 500 })

  const { data: payments, error } = await admin
    .from('payment_requests')
    .select('id, email, user_id, plan, amount, paydunya_token, created_at')
    .eq('plan', 'anniv_5')
    .eq('status', 'approved')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const repaired: string[] = []
  const skipped: string[] = []
  const failed: Array<{ email: string; error: string }> = []

  for (const payment of payments || []) {
    const { data: prior } = await admin
      .from('payment_logs')
      .select('id')
      .eq('product_id', 'anniv_5')
      .eq('email', payment.email)
      .eq('credit_kind', 'subscription')
      .eq('status', 'completed')
      .limit(1)
      .maybeSingle()

    if (prior) {
      skipped.push(payment.email)
      continue
    }

    if (!payment.user_id) {
      failed.push({ email: payment.email, error: 'user_id manquant' })
      continue
    }

    try {
      const dates = await activateSubscription(admin, payment.user_id, payment.email, plan)
      await logPaymentEvent(admin, {
        source: 'manual-repair',
        token: payment.paydunya_token,
        email: payment.email,
        productId: 'anniv_5',
        amount: payment.amount,
        status: 'completed',
        credited: true,
        creditKind: 'subscription',
        userLinked: true,
        raw: { repaired: true, expires_at: dates.end.toISOString() },
      })
      repaired.push(payment.email)
    } catch (repairError) {
      failed.push({ email: payment.email, error: repairError instanceof Error ? repairError.message : 'Erreur inconnue' })
    }
  }

  return NextResponse.json({ ok: failed.length === 0, repaired, skipped, failed })
}
