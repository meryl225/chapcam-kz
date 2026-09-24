import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminRequest } from '@/lib/admin-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Stats admin en temps reel. Utilise le service_role via une fonction
// Postgres security-definer (get_admin_stats) car les inscriptions sont
// dans auth.users (illisible avec la cle anon) et les comptages globaux
// sont bloques par la RLS cote navigateur.
export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Acces refuse.' }, { status: 403 })
  }

  const admin = createAdminClient()

  // Supabase (PostgREST) plafonne chaque reponse a 1000 lignes : on pagine pour
  // recuperer TOUS les abonnements (sinon le comptage des actifs est tronque).
  const subscriptionRows: Array<{
    user_id: string
    is_active: boolean | null
    status: string | null
    start_date: string | null
    end_date: string | null
    started_at: string | null
    expires_at: string | null
  }> = []
  let subscriptionError: { message: string } | null = null
  {
    const PAGE = 1000
    let from = 0
    for (let i = 0; i < 200; i++) {
      const { data: page, error: pageError } = await admin
        .from('subscriptions')
        .select('user_id,is_active,status,start_date,end_date,started_at,expires_at')
        .order('id', { ascending: true })
        .range(from, from + PAGE - 1)
      if (pageError) {
        subscriptionError = pageError
        break
      }
      if (!page || page.length === 0) break
      subscriptionRows.push(...page)
      if (page.length < PAGE) break
      from += PAGE
    }
  }

  const { data, error } = await admin.rpc('get_admin_stats')

  if (error || subscriptionError) {
    console.error('[admin/stats] Erreur lecture:', error?.message || subscriptionError?.message)
    return NextResponse.json({ error: 'Erreur lecture des stats.' }, { status: 500 })
  }

  const now = Date.now()
  const activeUsers = new Set(
    (subscriptionRows || [])
      .filter((subscription) => {
        if (subscription.is_active === false) return false
        if (['cancelled', 'canceled', 'expired', 'inactive'].includes((subscription.status || '').toLowerCase())) return false
        const start = subscription.start_date || subscription.started_at
        const end = subscription.end_date || subscription.expires_at
        return (!start || new Date(start).getTime() <= now) && (!end || new Date(end).getTime() >= now)
      })
      .map((subscription) => subscription.user_id),
  )

  return NextResponse.json(
    {
      totalUsers: data?.totalUsers ?? 0,
      todayRegistrations: data?.todayRegistrations ?? 0,
      onlineUsers: data?.onlineUsers ?? 0,
      activeSwaps: data?.activeSwaps ?? 0,
      activeSubscriptions: activeUsers.size,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
