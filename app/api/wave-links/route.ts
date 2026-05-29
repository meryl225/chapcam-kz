import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PLANS } from '@/lib/plans'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET public : renvoie les 4 liens Wave pour la page d'abonnement.
export async function GET() {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('wave_links')
      .select('plan, label, amount, wave_url')

    if (error) {
      console.error('[wave-links] Erreur lecture:', error.message)
      // Fallback : renvoyer les liens vides bases sur la config
      return NextResponse.json({
        links: PLANS.map((p) => ({ plan: p.id, label: p.name, amount: p.price, wave_url: '' })),
      })
    }

    // Indexe par plan pour un acces facile cote client
    const byPlan: Record<string, { plan: string; label: string; amount: number; wave_url: string }> = {}
    for (const row of data ?? []) {
      byPlan[row.plan] = row
    }

    return NextResponse.json({ links: data ?? [], byPlan })
  } catch (err: any) {
    console.error('[wave-links] Exception:', err?.message || err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
