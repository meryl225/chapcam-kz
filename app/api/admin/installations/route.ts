import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminRequest } from '@/lib/admin-auth'

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
    const status = String(body?.status || '').trim()

    if (!id || !['pending', 'done', 'cancelled'].includes(status)) {
      return NextResponse.json({ error: 'Parametres invalides.' }, { status: 400 })
    }

    const admin = createAdminClient()
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
