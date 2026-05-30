import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET : renvoie les demandes de paiement de l'utilisateur connecte.
// On filtre par email du compte (le lien paiement <-> compte se fait par email).
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user || !user.email) {
      return NextResponse.json({ error: 'Non authentifie.' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('payment_requests')
      .select(
        'id, plan, amount, paid_amount, payment_method, status, wave_transaction_reference, created_at, validated_at',
      )
      .eq('email', user.email.toLowerCase())
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('[my-requests] Erreur:', error.message)
      return NextResponse.json({ error: 'Erreur de lecture.' }, { status: 500 })
    }

    return NextResponse.json({ requests: data ?? [] })
  } catch (err: any) {
    console.error('[my-requests] Exception:', err?.message || err)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
