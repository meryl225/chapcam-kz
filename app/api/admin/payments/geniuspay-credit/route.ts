import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest, ADMIN_EMAIL } from '@/lib/admin-auth'
import { creditGeniusPayManually } from '@/lib/geniuspay'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Credit MANUEL "sur preuve" d'un paiement GeniusPay depuis l'admin.
// A utiliser quand le client a une preuve de debit Mobile Money mais que l'API
// GeniusPay reste bloquee sur "pending". Idempotent : ne double jamais un credit
// (meme verrou processed_payments que le flux automatique).
export async function POST(request: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Acces refuse.' }, { status: 403 })
  }

  let reference: string | null = null
  try {
    const body = await request.json()
    reference = body?.reference ? String(body.reference).trim() : null
  } catch {
    /* corps invalide */
  }

  if (!reference || !reference.startsWith('MTX-')) {
    return NextResponse.json({ error: 'Reference GeniusPay (MTX-...) manquante ou invalide.' }, { status: 400 })
  }

  const outcome = await creditGeniusPayManually({ reference, adminEmail: ADMIN_EMAIL })

  return NextResponse.json({
    ok: outcome.status === 'completed',
    status: outcome.status,
    alreadyDone: outcome.alreadyDone,
    kind: outcome.result?.kind ?? null,
    message: outcome.message ?? outcome.result?.message ?? null,
  })
}
