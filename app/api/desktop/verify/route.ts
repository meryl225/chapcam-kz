import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyPcLicense } from '@/lib/pc-license'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Verifie qu'une licence ChapCam PC est toujours valide.
// Appelee par le logiciel desktop a chaque lancement.
// Corps attendu : { license_key: string, hardware_id?: string }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const licenseKey = String(body.license_key || body.licenseKey || '')
    const hardwareId = String(body.hardware_id || body.hardwareId || '')

    if (!licenseKey) {
      return NextResponse.json({ valid: false, message: 'Cle de licence requise.' }, { status: 400 })
    }

    const admin = createAdminClient()
    const result = await verifyPcLicense(admin, licenseKey, hardwareId)

    return NextResponse.json(result, { status: result.valid ? 200 : 403 })
  } catch (error) {
    console.error('[desktop/verify] Erreur:', error)
    return NextResponse.json({ valid: false, message: 'Erreur serveur.' }, { status: 500 })
  }
}
