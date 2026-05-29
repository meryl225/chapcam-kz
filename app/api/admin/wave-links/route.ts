import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminRequest, ADMIN_EMAIL } from '@/lib/admin-auth'
import { PLANS } from '@/lib/plans'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_PLANS = PLANS.map((p) => p.id)

// GET admin : liste des liens Wave actuels (pour l'editeur).
export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Acces refuse.' }, { status: 403 })
  }
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('wave_links')
    .select('plan, label, amount, wave_url')
    .order('amount', { ascending: true })

  if (error) {
    return NextResponse.json({ error: 'Erreur lecture.' }, { status: 500 })
  }
  return NextResponse.json({ links: data ?? [] })
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
      if (!VALID_PLANS.includes(link.plan as any)) continue
      const url = String(link.wave_url || '').trim()
      // Validation legere : doit etre vide ou une URL http(s)
      if (url && !/^https?:\/\//i.test(url)) {
        return NextResponse.json(
          { error: `Lien invalide pour ${link.plan} (doit commencer par http).` },
          { status: 400 },
        )
      }
      const { error } = await admin
        .from('wave_links')
        .update({ wave_url: url, updated_at: new Date().toISOString() })
        .eq('plan', link.plan)
      if (error) {
        console.error('[admin/wave-links] Erreur update:', error.message)
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
