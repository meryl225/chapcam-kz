import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fulfillNowPayment } from '@/lib/nowpayments'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Filet de securite au retour du paiement crypto : NOWPayments redirige vers
// success_url en y ajoutant ?NP_id={payment_id}. On reconfirme aupres de
// NOWPayments (credit idempotent si l'utilisateur revient avant l'IPN).
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ status: 'error', error: 'Non authentifie.' }, { status: 401 })
  }

  // NOWPayments ajoute le payment_id sous le nom NP_id ; on accepte aussi
  // payment_id par robustesse.
  const paymentId =
    request.nextUrl.searchParams.get('NP_id') ||
    request.nextUrl.searchParams.get('payment_id')

  // Sans payment_id, on ne peut pas reconfirmer : on regarde si la derniere
  // demande NOWPayments de l'utilisateur est deja approuvee, sinon pending.
  if (!paymentId) {
    const admin = createAdminClient()
    const { data: row } = await admin
      .from('payment_requests')
      .select('status')
      .eq('user_id', user.id)
      .like('paydunya_token', 'NP-%')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (row?.status === 'approved') {
      return NextResponse.json({ status: 'completed', alreadyDone: true, kind: null })
    }
    return NextResponse.json({ status: 'pending', alreadyDone: false, kind: null })
  }

  const outcome = await fulfillNowPayment({ paymentId, source: 'nowpayments_status' })
  return NextResponse.json({
    status: outcome.status,
    alreadyDone: outcome.alreadyDone,
    kind: outcome.result?.kind ?? null,
  })
}
