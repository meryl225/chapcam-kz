import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminRequest, ADMIN_EMAIL } from '@/lib/admin-auth'
import { PLANS } from '@/lib/plans'
import { LIVE_OFFERS } from '@/lib/live-offers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Catalogue editable : formules d'abonnement + offres Live (ex: flashchap / live15).
const CATALOG = [
  ...PLANS.map((p) => ({ plan: p.id, label: p.name, amount: p.price })),
  ...LIVE_OFFERS.map((o) => ({ plan: o.id, label: o.name, amount: o.price })),
]

// GET admin : liste des liens Wave actuels (pour l'editeur).
// On part du catalogue complet (abonnements + offres Live) et on fusionne
// les URLs deja enregistrees en base, afin que TOUTES les offres soient
// editables meme si leur ligne n'existe pas encore en base.
export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Acces refuse.' }, { status: 403 })
  }
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('wave_links')
    .select('plan, wave_url')

  if (error) {
    return NextResponse.json({ error: 'Erreur lecture.' }, { status: 500 })
  }

  const urlByPlan: Record<string, string> = {}
  for (const row of data ?? []) urlByPlan[row.plan] = row.wave_url || ''

  const links = CATALOG.map((c) => ({ ...c, wave_url: urlByPlan[c.plan] ?? '' }))
  return NextResponse.json({ links })
}

// POST admin : met a jour les liens Wave.
export async function POST(req: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Acces refuse.' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const links = body.links as Array<{ plan: string; wave_url: string }>

    if (!Array.isArray(links)) {
      return NextResponse.json({ error: 'Format invalide.' }, { status: 400 })
    }

    const admin = createAdminClient()

    for (const link of links) {
      const meta = CATALOG.find((c) => c.plan === link.plan)
      if (!meta) continue
      const url = String(link.wave_url || '').trim()
      // Validation legere : doit etre vide ou une URL http(s)
      if (url && !/^https?:\/\//i.test(url)) {
        return NextResponse.json(
          { error: `Lien invalide pour ${link.plan} (doit commencer par http).` },
          { status: 400 },
        )
      }
      // Upsert : cree la ligne si elle n'existe pas encore (cas des offres Live).
      const { error } = await admin.from('wave_links').upsert(
        {
          plan: meta.plan,
          label: meta.label,
          amount: meta.amount,
          wave_url: url,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'plan' },
      )
      if (error) {
        console.error('[admin/wave-links] Erreur upsert:', error.message)
        return NextResponse.json({ error: 'Erreur lors de la mise a jour.' }, { status: 500 })
      }
    }

    await admin.from('admin_logs').insert({
      action: 'update_wave_links',
      admin_email: ADMIN_EMAIL,
      details: { count: links.length },
    })

    return NextResponse.json({ success: true, message: 'Liens Wave mis a jour.' })
  } catch (err: any) {
    console.error('[admin/wave-links] Exception:', err?.message || err)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
