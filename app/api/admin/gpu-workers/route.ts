import { NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import { getGpuWorkersStatus } from '@/lib/live-access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Etat live des workers GPU (RTX 5090) : charge, file d'attente, disponibilite.
// Reserve a l'admin. Interroge les endpoints /health de chaque worker via
// getGpuWorkersStatus() (qui beneficie deja d'un cache court cote serveur).
export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Acces refuse.' }, { status: 403 })
  }

  try {
    const status = await getGpuWorkersStatus()
    return NextResponse.json(status, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err: any) {
    console.error('[admin/gpu-workers] erreur:', err?.message || err)
    return NextResponse.json({ error: 'Erreur lecture des workers GPU.' }, { status: 500 })
  }
}
