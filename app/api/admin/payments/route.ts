import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminRequest } from '@/lib/admin-auth'
import { getPlan } from '@/lib/plans'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Liste en lecture seule des clients dont l'abonnement a ete credite
// (automatiquement via PayDunya ou manuellement par l'admin).
// On lit directement la table `subscriptions` : un client = une ligne,
// donc aucun doublon possible.
export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Acces refuse.' }, { status: 403 })
  }

  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('subscriptions')
      .select('id, email, plan, amount, points, max_points, is_active, status, start_date, end_date, expires_at')
      .order('end_date', { ascending: false })

    if (error) {
      console.error('[admin/payments] Erreur lecture subscriptions:', error.message)
      return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
    }

    const now = Date.now()
    const clients = (data || []).map((s) => {
      const planCfg = getPlan(s.plan)
      const expiry = s.expires_at || s.end_date
      const expired = expiry ? new Date(expiry).getTime() < now : false
      const maxPoints = s.max_points ?? planCfg?.points ?? 0
      return {
        id: s.id,
        email: s.email,
        plan: s.plan,
        planName: planCfg?.name || s.plan,
        amount: s.amount ?? planCfg?.price ?? 0,
        points: s.points ?? 0,
        maxPoints,
        active: !!s.is_active && !expired,
        expired,
        startDate: s.start_date,
        expiresAt: expiry,
      }
    })

    const totalRevenue = clients.reduce((sum, c) => sum + (c.amount || 0), 0)

    return NextResponse.json({
      clients,
      stats: {
        total: clients.length,
        active: clients.filter((c) => c.active).length,
        expired: clients.filter((c) => c.expired).length,
        totalRevenue,
      },
    })
  } catch (err: any) {
    console.error('[admin/payments] Exception:', err?.message || err)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
