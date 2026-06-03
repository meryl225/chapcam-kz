import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { confirmAndFulfillPaydunya } from '@/lib/fulfillment'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Verifie l'etat d'un paiement PayDunya pour la page de retour.
// Sert aussi de filet de securite : si l'IPN n'est pas (encore) arrive,
// cette route reconfirme aupres de PayDunya et credite de maniere idempotente.
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ status: 'error', error: 'Non authentifie.' }, { status: 401 })
  }

  const token = request.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.json({ status: 'error', error: 'token manquant.' }, { status: 400 })
  }

  const outcome = await confirmAndFulfillPaydunya(token)

  return NextResponse.json({
    status: outcome.status,
    alreadyDone: outcome.alreadyDone,
    kind: outcome.result?.kind ?? null,
  })
}
