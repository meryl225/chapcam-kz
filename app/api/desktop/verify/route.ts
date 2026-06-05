import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Normalise une cle saisie (majuscules, espaces retires).
function normalizeKey(key: string): string {
  return String(key || '').trim().toUpperCase().replace(/\s+/g, '')
}

// Verifie / active une licence ChapCam PC.
// Appelee par le logiciel desktop a chaque lancement.
// Corps attendu : { license_key: string, hardware_id?: string }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const licenseKey = normalizeKey(body.license_key || body.licenseKey || '')
    const hardwareId = String(body.hardware_id || body.hardwareId || '').trim()

    if (!licenseKey) {
      return NextResponse.json(
        { valid: false, message: 'Cle de licence requise.' },
        { status: 400 },
      )
    }

    const admin = createAdminClient()

    // 1. Chercher la cle dans la table pc_licenses.
    const { data: license, error } = await admin
      .from('pc_licenses')
      .select('id, hardware_id, status')
      .eq('license_key', licenseKey)
      .maybeSingle()

    if (error) {
      console.error('[desktop/verify] Lecture echouee:', error.message)
      return NextResponse.json({ valid: false, message: 'Erreur serveur.' }, { status: 500 })
    }

    // 2. Cle inexistante.
    if (!license) {
      return NextResponse.json(
        { valid: false, message: 'Cle de licence invalide.' },
        { status: 403 },
      )
    }

    // 3. Licence revoquee.
    if (license.status === 'revoked') {
      return NextResponse.json(
        { valid: false, message: 'Licence revoquee. Contacte le support.' },
        { status: 403 },
      )
    }

    // 4. Premiere activation : hardware_id encore vide -> on lie ce PC.
    if (!license.hardware_id) {
      const { error: updErr } = await admin
        .from('pc_licenses')
        .update({ hardware_id: hardwareId || null, activated_at: new Date().toISOString() })
        .eq('id', license.id)
        .is('hardware_id', null) // garde-fou anti course
      if (updErr) {
        console.error('[desktop/verify] Activation echouee:', updErr.message)
        return NextResponse.json(
          { valid: false, message: 'Activation impossible. Reessaie.' },
          { status: 500 },
        )
      }
      return NextResponse.json({ valid: true, message: 'Licence activee sur ce PC.' }, { status: 200 })
    }

    // 5. Meme PC qui se reconnecte.
    if (license.hardware_id === hardwareId) {
      return NextResponse.json({ valid: true, message: 'Licence valide.' }, { status: 200 })
    }

    // 6. Licence deja liee a un autre PC.
    return NextResponse.json(
      { valid: false, message: 'Licence deja activee sur un autre PC. Contacte le support.' },
      { status: 403 },
    )
  } catch (err) {
    console.error('[desktop/verify] Erreur:', err)
    return NextResponse.json({ valid: false, message: 'Erreur serveur.' }, { status: 500 })
  }
}
