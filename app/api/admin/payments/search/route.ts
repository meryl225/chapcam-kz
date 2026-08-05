import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminRequest } from '@/lib/admin-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Recherche GLOBALE dans le journal PayDunya (toute la table payment_logs),
// contrairement a la liste principale limitee aux 200 derniers.
// Permet a l'admin de retrouver n'importe quel paiement (email, produit,
// token, transaction) meme tres ancien.
export async function GET(req: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Acces refuse.' }, { status: 403 })
  }

  const q = (req.nextUrl.searchParams.get('q') || '').trim()
  if (q.length < 2) {
    return NextResponse.json({ paydunyaLogs: [] })
  }

  try {
    const admin = createAdminClient()

    // Echappe les caracteres speciaux PostgREST (virgule, parentheses)
    // pour eviter de casser le filtre `or`.
    const safe = q.replace(/[,()]/g, ' ').trim()
    const pattern = `*${safe}*`

    const { data, error } = await admin
      .from('payment_logs')
      .select(
        'id, source, token, transaction_id, email, product_id, amount, status, credited, already_done, credit_kind, user_linked, failure_reason, created_at',
      )
      .neq('source', 'reconcile')
      .or(
        [
          `email.ilike.${pattern}`,
          `product_id.ilike.${pattern}`,
          `token.ilike.${pattern}`,
          `transaction_id.ilike.${pattern}`,
        ].join(','),
      )
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('[admin/payments/search] Erreur:', error.message)
      return NextResponse.json({ error: 'Erreur de recherche.' }, { status: 500 })
    }

    const paydunyaLogs = (data || []).map((l) => ({
      id: l.id,
      source: l.source,
      token: l.token,
      transactionId: l.transaction_id,
      email: l.email,
      productId: l.product_id,
      amount: l.amount,
      status: l.status,
      credited: l.credited,
      alreadyDone: l.already_done,
      creditKind: l.credit_kind,
      userLinked: l.user_linked,
      failureReason: l.failure_reason,
      createdAt: l.created_at,
    }))

    return NextResponse.json({ paydunyaLogs })
  } catch (err: any) {
    console.error('[admin/payments/search] Exception:', err?.message || err)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
