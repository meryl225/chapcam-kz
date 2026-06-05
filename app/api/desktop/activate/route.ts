import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { activatePcLicense } from '@/lib/pc-license'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Active une licence ChapCam PC sur un ordinateur.
// Appelee par le logiciel desktop lors de la premiere ouverture.
// Corps attendu : { license_key: string, hardware_id: string }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const licenseKey = String(body.license_key || body.licenseKey || '')
    const hardwareId = String(body.hardware_id || body.hardwareId || '')

    if (!licenseKey || !hardwareId) {
      return NextResponse.json(
        { valid: false, message: 'Cle de licence et identifiant materiel requis.' },
        { status: 400 },
      )
    }

    const admin = createAdminClient()
    const result = await activatePcLicense(admin, licenseKey, hardwareId)

    return NextResponse.json(result, { status: result.valid ? 200 : 403 })
  } catch (error) {
    console.error('[desktop/activate] Erreur:', error)
    return NextResponse.json({ valid: false, message: 'Erreur serveur.' }, { status: 500 })
  }
}
