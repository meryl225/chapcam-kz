import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminRequest } from '@/lib/admin-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Repartition des utilisateurs par pays (localisation approximative par IP,
// captee via les en-tetes edge Vercel). Reserve a l'admin.
export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Acces refuse.' }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('user_geo')
    .select('country')
    .not('country', 'is', null)

  if (error) {
    console.error('[admin/geo] Erreur:', error.message)
    return NextResponse.json({ error: 'Erreur lecture geo.' }, { status: 500 })
  }

  // Comptage par pays cote serveur.
  const counts = new Map<string, number>()
  for (const row of data ?? []) {
    const c = (row.country as string) || 'Inconnu'
    counts.set(c, (counts.get(c) ?? 0) + 1)
  }

  const countries = Array.from(counts.entries())
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)

  return NextResponse.json(
    { countries, totalLocated: data?.length ?? 0 },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
