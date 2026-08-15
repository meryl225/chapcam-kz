import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminRequest } from '@/lib/admin-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Liste les paiements GeniusPay (carte / mobile money) restes "pending".
// Ces paiements sont normalement invisibles dans l'admin (qui n'affiche que le
// journal PayDunya). Or c'est justement la ou se cachent les cas "client debite
// mais GeniusPay n'a jamais confirme". Cette liste les rend visibles pour que
// l'admin puisse crediter sur preuve.
export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Acces refuse.' }, { status: 403 })
  }

  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('payment_requests')
      .select('id, full_name, email, plan, amount, status, paydunya_token, created_at')
      .eq('status', 'pending')
      .like('paydunya_token', 'MTX-%')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('[admin/payments/geniuspay-pending] Erreur:', error.message)
      return NextResponse.json({ error: 'Erreur de chargement.' }, { status: 500 })
    }

    const pending = (data || []).map((r) => ({
      id: r.id,
      fullName: r.full_name,
      email: r.email,
      plan: r.plan,
      amount: r.amount,
      reference: r.paydunya_token,
      createdAt: r.created_at,
    }))

    return NextResponse.json({ pending })
  } catch (err: any) {
    console.error('[admin/payments/geniuspay-pending] Exception:', err?.message || err)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
