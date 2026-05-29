import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminRequest } from '@/lib/admin-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET admin : liste des demandes avec filtres (search email/numero, status).
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
      .from('payment_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)

    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query = query.eq('status', status)
    }
    if (search) {
      query = query.or(`email.ilike.%${search}%,phone_number.ilike.%${search}%`)
    }

    const { data, error } = await query
    if (error) {
      console.error('[admin/payments] Erreur:', error.message)
      return NextResponse.json({ error: 'Erreur lecture.' }, { status: 500 })
    }

    return NextResponse.json({ requests: data ?? [] })
  } catch (err: any) {
    console.error('[admin/payments] Exception:', err?.message || err)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
