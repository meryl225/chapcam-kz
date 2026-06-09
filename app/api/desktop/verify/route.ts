import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Verifie / active une licence ChapCam PC contre la table pc_licenses.
// Appelee par le logiciel desktop. Corps attendu :
// { license_key: string, hardware_id: string }
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const license_key = body?.license_key
    const hardware_id = body?.hardware_id

    // 1 + 2. Champs manquants.
    if (!license_key || !hardware_id) {
      return NextResponse.json(
        { valid: false, message: 'Données manquantes.' },
        { status: 400 },
      )
    }

    const supabase = createAdminClient()

    // 3. Rechercher la licence.
    const { data, error } = await supabase
      .from('pc_licenses')
      .select('*')
      .eq('license_key', license_key)
      .maybeSingle()

    if (error) {
      throw error
    }

    // 4. Cle inexistante.
    if (!data) {
      return NextResponse.json({ valid: false, message: 'Clé de licence invalide.' })
    }

    // 5. Licence non active.
    if (data.status !== 'active') {
      return NextResponse.json({ valid: false, message: 'Licence désactivée ou expirée.' })
    }

    // 6. Premiere activation : aucun hardware_id encore lie.
    if (!data.hardware_id) {
      const { error: updateError } = await supabase
        .from('pc_licenses')
        .update({
          hardware_id,
          activated_at: new Date().toISOString(),
        })
        .eq('license_key', license_key)

      if (updateError) {
        throw updateError
      }

      return NextResponse.json({ valid: true })
    }

    // 7. Licence deja liee a un autre PC.
    if (data.hardware_id !== hardware_id) {
      return NextResponse.json({
        valid: false,
        message: 'Licence déjà activée sur un autre PC.\nContacte le support sur chapcam.com',
      })
    }

    // 8. Tout correspond.
    return NextResponse.json({ valid: true })
  } catch {
    return NextResponse.json(
      { valid: false, message: 'Erreur serveur.' },
      { status: 500 },
    )
  }
}
