import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fulfillTrybitInvoice } from '@/lib/trybit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Filet de securite au retour du paiement crypto : Trybit redirige vers une URL
// statique (sans notre token). On retrouve donc la derniere facture crypto de
// l'utilisateur connecte et on reconfirme aupres de Trybit (credit idempotent
// si l'utilisateur revient avant l'arrivee du postback).
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ status: 'error', error: 'Non authentifie.' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Facture crypto ciblee : soit celle passee en parametre, soit la plus recente
  // demande Trybit de cet utilisateur.
  const explicitUuid = request.nextUrl.searchParams.get('uuid')

  let uuid = explicitUuid
  let alreadyApproved = false
  if (!uuid) {
    const { data: row } = await admin
      .from('payment_requests')
      .select('paydunya_token, status')
      .eq('user_id', user.id)
      .like('paydunya_token', 'INV-%')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    uuid = (row?.paydunya_token as string | null) ?? null
    alreadyApproved = row?.status === 'approved'
  }

  if (!uuid) {
    return NextResponse.json({ status: 'error', error: 'Aucune facture crypto trouvee.' })
  }

  if (alreadyApproved) {
    return NextResponse.json({ status: 'completed', alreadyDone: true, kind: null })
  }

  const outcome = await fulfillTrybitInvoice({ uuid, source: 'trybit_status' })
  return NextResponse.json({
    status: outcome.status,
    alreadyDone: outcome.alreadyDone,
    kind: outcome.result?.kind ?? null,
  })
}
