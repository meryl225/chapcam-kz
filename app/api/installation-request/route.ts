import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Apps que l'utilisateur peut demander a faire installer avec ChapCam.
const ALLOWED_APPS = [
  'WhatsApp',
  'Telegram',
  'Microsoft Teams',
  'Google Meet',
  'Zoom',
  'Skype',
  'Discord',
  'Autre',
]

// GET : renvoie les demandes d'installation de l'utilisateur connecte
// (pour le suivi + le bouton de paiement des frais d'installation).
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Vous devez etre connecte.' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('installation_requests')
      .select('id, location, apps, status, paid, paid_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('[installation-request] Erreur lecture:', error.message)
      return NextResponse.json({ error: 'Erreur de lecture.' }, { status: 500 })
    }

    return NextResponse.json({ requests: data ?? [] })
  } catch (err: any) {
    console.error('[installation-request] Exception GET:', err?.message || err)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}

// POST : un client connecte demande l'installation de ChapCam avec ses apps
// d'appel video (lieu d'installation + numero joignable).
export async function POST(req: NextRequest) {
  try {
    // 1) Auth : seul un utilisateur connecte peut envoyer une demande.
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Vous devez etre connecte.' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Requete invalide.' }, { status: 400 })
    }

    const phone = String(body.phone || '').trim()
    const location = String(body.location || '').trim()
    const note = String(body.note || '').trim()
    const fullName = String(body.fullName || '').trim()
    const rawApps = Array.isArray(body.apps) ? body.apps : []

    // 2) Validation
    if (phone.length < 6) {
      return NextResponse.json({ error: 'Numero joignable invalide.' }, { status: 400 })
    }
    if (location.length < 2) {
      return NextResponse.json({ error: "Lieu d'installation requis." }, { status: 400 })
    }
    const apps = rawApps
      .map((a: unknown) => String(a).trim())
      .filter((a: string) => ALLOWED_APPS.includes(a))
    if (apps.length === 0) {
      return NextResponse.json(
        { error: 'Selectionnez au moins une application.' },
        { status: 400 },
      )
    }

    // 3) Insertion via le client service_role (contourne la RLS proprement).
    const admin = createAdminClient()
    const { error } = await admin.from('installation_requests').insert({
      user_id: user.id,
      email: user.email ?? null,
      full_name: fullName || null,
      phone,
      location,
      apps,
      note: note || null,
      status: 'pending',
    })

    if (error) {
      console.error('[installation-request] Erreur insertion:', error.message)
      return NextResponse.json(
        { error: "Erreur lors de l'enregistrement de la demande." },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message:
        'Demande envoyee ! Notre equipe vous contactera au numero indique pour planifier l\'installation.',
    })
  } catch (err: any) {
    console.error('[installation-request] Exception:', err?.message || err)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
