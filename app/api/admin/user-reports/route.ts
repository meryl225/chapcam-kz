import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import { listUserReports, setUserReportStatus, type UserReportKind, type UserReportStatus } from '@/lib/user-reports'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'private, no-store' }
const KINDS = new Set(['abuse', 'support', 'all'])
const STATUSES = new Set(['new', 'handled', 'all'])
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(request: NextRequest) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'Non autorisé' }, { status: 401, headers: NO_STORE })

  const params = request.nextUrl.searchParams
  const kind = (KINDS.has(params.get('kind') || '') ? params.get('kind') : 'all') as UserReportKind | 'all'
  const status = (STATUSES.has(params.get('status') || '') ? params.get('status') : 'new') as UserReportStatus | 'all'

  try {
    return NextResponse.json({ reports: await listUserReports(kind, status) }, { headers: NO_STORE })
  } catch (error) {
    console.error('[admin/user-reports] list:', error)
    return NextResponse.json({ error: 'Chargement impossible' }, { status: 500, headers: NO_STORE })
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'Non autorisé' }, { status: 401, headers: NO_STORE })

  const body = await request.json().catch(() => null)
  const id = String(body?.id ?? '')
  const status = body?.status === 'new' ? 'new' : 'handled'
  if (!UUID.test(id)) return NextResponse.json({ error: 'Identifiant invalide' }, { status: 400, headers: NO_STORE })

  const updated = await setUserReportStatus(id, status).catch(() => false)
  if (!updated) return NextResponse.json({ error: 'Introuvable' }, { status: 404, headers: NO_STORE })
  return NextResponse.json({ message: status === 'handled' ? 'Marqué comme traité.' : 'Remis à traiter.' }, { headers: NO_STORE })
}
