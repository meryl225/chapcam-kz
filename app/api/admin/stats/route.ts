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
  const { data, error } = await admin.rpc('get_admin_stats')

  if (error) {
    console.error('[admin/stats] Erreur RPC:', error.message)
    return NextResponse.json({ error: 'Erreur lecture des stats.' }, { status: 500 })
  }

  return NextResponse.json(
    {
      totalUsers: data?.totalUsers ?? 0,
      todayRegistrations: data?.todayRegistrations ?? 0,
      onlineUsers: data?.onlineUsers ?? 0,
      activeSwaps: data?.activeSwaps ?? 0,
      activeSubscriptions: data?.activeSubscriptions ?? 0,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
