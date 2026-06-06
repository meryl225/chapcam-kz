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

    const subRevenue = clients.reduce((sum, c) => sum + (c.amount || 0), 0)

    // Demandes d'installation : total recu + celles payees (8500 FCFA chacune).
    const INSTALL_PRICE = 8500
    const { data: installs } = await admin
      .from('installation_requests')
      .select('id, full_name, email, phone, location, status, paid, paid_at, created_at')
      .order('created_at', { ascending: false })

    const installList = installs || []
    const paidInstalls = installList.filter((i) => i.paid)
    const installRevenue = paidInstalls.length * INSTALL_PRICE

    // Journal PayDunya : tous les callbacks recus, recents en premier.
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const { data: logs } = await admin
      .from('payment_logs')
      .select('id, source, token, transaction_id, email, product_id, amount, status, credited, already_done, credit_kind, user_linked, failure_reason, created_at')
      .order('created_at', { ascending: false })
      .limit(200)

    const logList = logs || []
    const todayLogs = logList.filter((l) => new Date(l.created_at) >= startOfDay)
    const failedLogs = logList.filter((l) => l.status === 'completed' && !l.credited)

    return NextResponse.json({
      clients,
      installations: installList.map((i) => ({
        id: i.id,
        fullName: i.full_name,
        email: i.email,
        phone: i.phone,
        location: i.location,
        status: i.status,
        paid: !!i.paid,
        paidAt: i.paid_at,
        createdAt: i.created_at,
      })),
      paydunyaLogs: logList.map((l) => ({
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
      })),
      stats: {
        total: clients.length,
        active: clients.filter((c) => c.active).length,
        expired: clients.filter((c) => c.expired).length,
        subRevenue,
        installTotal: installList.length,
        installPaid: paidInstalls.length,
        installRevenue,
        totalRevenue: subRevenue + installRevenue,
        paydunyaToday: todayLogs.length,
        paydunyaCreditedToday: todayLogs.filter((l) => l.credited).length,
        paydunyaFailed: failedLogs.length,
      },
    })
  } catch (err: any) {
    console.error('[admin/payments] Exception:', err?.message || err)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
