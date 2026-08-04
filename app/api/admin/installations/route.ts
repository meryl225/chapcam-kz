import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminRequest } from '@/lib/admin-auth'
import { sendInstallationConfirmationEmail } from '@/lib/email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET admin : liste des demandes d'installation (filtres search + status).
export async function GET(req: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Acces refuse.' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const search = (searchParams.get('search') || '').trim().toLowerCase()
    const status = (searchParams.get('status') || '').trim()

    const admin = createAdminClient()
    let query = admin
      .from('installation_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)

    if (status && ['pending', 'done', 'cancelled'].includes(status)) {
      query = query.eq('status', status)
    }
    if (search) {
      query = query.or(
        `email.ilike.%${search}%,phone.ilike.%${search}%,location.ilike.%${search}%`,
      )
    }

    const { data, error } = await query
    if (error) {
      console.error('[admin/installations] Erreur:', error.message)
      return NextResponse.json({ error: 'Erreur lecture.' }, { status: 500 })
    }

    // Compteurs globaux (independants des filtres) : total + par statut.
    const [totalRes, pendingRes, doneRes, cancelledRes] = await Promise.all([
      admin.from('installation_requests').select('*', { count: 'exact', head: true }),
      admin.from('installation_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      admin.from('installation_requests').select('*', { count: 'exact', head: true }).eq('status', 'done'),
      admin.from('installation_requests').select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
    ])

    const counts = {
      total: totalRes.count ?? 0,
      pending: pendingRes.count ?? 0,
      done: doneRes.count ?? 0,
      cancelled: cancelledRes.count ?? 0,
    }

    return NextResponse.json({ requests: data ?? [], counts })
  } catch (err: any) {
    console.error('[admin/installations] Exception:', err?.message || err)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}

// POST admin : changer le statut d'une demande (pending -> done / cancelled).
export async function POST(req: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Acces refuse.' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const id = String(body?.id || '').trim()
    const action = String(body?.action || '').trim()

    if (!id) {
      return NextResponse.json({ error: 'Parametres invalides.' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Action "confirm" : envoyer au client un email de prise en compte
    // (l'invitant a nous appeler ou nous ecrire sur WhatsApp).
    if (action === 'confirm') {
      const { data: request, error: fetchError } = await admin
        .from('installation_requests')
        .select('email, full_name')
        .eq('id', id)
        .single()

      if (fetchError || !request) {
        console.error('[admin/installations] Demande introuvable:', fetchError?.message)
        return NextResponse.json({ error: 'Demande introuvable.' }, { status: 404 })
      }
      if (!request.email) {
        return NextResponse.json(
          { error: 'Aucune adresse email pour ce client.' },
          { status: 400 },
        )
      }

      const result = await sendInstallationConfirmationEmail(request.email, request.full_name)
      if (!result.success) {
        return NextResponse.json(
          { error: "Echec de l'envoi de l'email. Reessayez." },
          { status: 500 },
        )
      }

      return NextResponse.json({ message: `Email de confirmation envoye a ${request.email}.` })
    }

    // Sinon : changement de statut classique.
    const status = String(body?.status || '').trim()
    if (!['pending', 'done', 'cancelled'].includes(status)) {
      return NextResponse.json({ error: 'Parametres invalides.' }, { status: 400 })
    }

    const { error } = await admin
      .from('installation_requests')
      .update({ status })
      .eq('id', id)

    if (error) {
      console.error('[admin/installations] Erreur update:', error.message)
      return NextResponse.json({ error: 'Erreur lors de la mise a jour.' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Statut mis a jour.' })
  } catch (err: any) {
    console.error('[admin/installations] Exception POST:', err?.message || err)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
