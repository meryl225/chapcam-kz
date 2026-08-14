import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fulfillGeniusPayPayment } from '@/lib/geniuspay'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Filet de securite au retour du paiement GeniusPay : la page de succes appelle
// ce endpoint pour reconfirmer et crediter immediatement (credit idempotent si
// l'utilisateur revient avant l'arrivee du webhook). On cible soit la reference
// passee en parametre, soit la derniere demande GeniusPay de l'utilisateur.
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ status: 'error', error: 'Non authentifie.' }, { status: 401 })
  }

  const admin = createAdminClient()

  const explicitRef = request.nextUrl.searchParams.get('reference')
  let reference = explicitRef
  let alreadyApproved = false
  if (!reference) {
    const { data: row } = await admin
      .from('payment_requests')
      .select('paydunya_token, status')
      .eq('user_id', user.id)
      .like('paydunya_token', 'MTX-%')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    reference = (row?.paydunya_token as string | null) ?? null
    alreadyApproved = row?.status === 'approved'
  }

  if (!reference) {
    return NextResponse.json({ status: 'error', error: 'Aucun paiement GeniusPay trouve.' })
  }

  if (alreadyApproved) {
    return NextResponse.json({ status: 'completed', alreadyDone: true, kind: null })
  }

  const outcome = await fulfillGeniusPayPayment({ reference, source: 'geniuspay_status' })
  return NextResponse.json({
    status: outcome.status,
    alreadyDone: outcome.alreadyDone,
    kind: outcome.result?.kind ?? null,
  })
}
