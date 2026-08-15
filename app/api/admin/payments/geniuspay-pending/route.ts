import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminRequest } from '@/lib/admin-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Suivi complet des paiements GeniusPay (carte / mobile money, references MTX-).
// L'admin standard n'affiche que le journal PayDunya ; cet endpoint rend TOUS
// les paiements GeniusPay visibles (en attente, credites, echoues) avec leurs
// compteurs, pour un vrai suivi. Les paiements "pending" sont ceux ou le client
// peut avoir ete debite sans que GeniusPay confirme : ils restent crediables
// manuellement sur preuve.
export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Acces refuse.' }, { status: 403 })
  }

  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('payment_requests')
      .select('id, full_name, email, plan, amount, status, paydunya_token, created_at, validated_at, paid_at')
      .like('paydunya_token', 'MTX-%')
      .order('created_at', { ascending: false })
      .limit(300)

    if (error) {
      console.error('[admin/payments/geniuspay-pending] Erreur:', error.message)
      return NextResponse.json({ error: 'Erreur de chargement.' }, { status: 500 })
    }

    const payments = (data || []).map((r) => ({
      id: r.id,
      fullName: r.full_name,
      email: r.email,
      plan: r.plan,
      amount: r.amount,
      reference: r.paydunya_token,
      status: r.status,
      createdAt: r.created_at,
      validatedAt: r.validated_at || r.paid_at || null,
    }))

    // Compteurs pour le suivi.
    let pending = 0
    let approved = 0
    let other = 0
    let amountApproved = 0
    for (const p of payments) {
      if (p.status === 'pending') pending += 1
      else if (p.status === 'approved') {
        approved += 1
        amountApproved += Number(p.amount || 0)
      } else other += 1
    }

    const summary = { total: payments.length, pending, approved, other, amountApproved }

    // `pending` (retro-compat) : liste filtree des seuls paiements en attente.
    const pendingList = payments.filter((p) => p.status === 'pending')

    return NextResponse.json({ payments, summary, pending: pendingList })
  } catch (err: any) {
    console.error('[admin/payments/geniuspay-pending] Exception:', err?.message || err)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
