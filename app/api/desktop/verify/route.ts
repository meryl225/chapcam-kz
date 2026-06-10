import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizeLicenseKey } from '@/lib/pc-license'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Verifie / active une licence ChapCam PC contre la table pc_licenses.
// Appelee par le logiciel desktop. Corps attendu :
// { license_key: string, hardware_id: string }
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    // Normalisation : les cles sont stockees en MAJUSCULES (CHAPCAM-XXXX-...).
    // Sans ca, une cle tapee en minuscules ou avec des espaces / un espace
    // colle par copier-coller etait rejetee a tort comme "invalide".
    const license_key = normalizeLicenseKey(body?.license_key || '')
    // On nettoie aussi le hardware_id (espaces / sauts de ligne parasites) pour
    // eviter un faux "deja active sur un autre PC" du au seul formatage.
    const hardware_id = String(body?.hardware_id || '').trim()

    // 1 + 2. Champs manquants.
    if (!license_key || !hardware_id) {
      return NextResponse.json(
        { valid: false, message: 'Données manquantes.' },
        { status: 400 },
      )
    }

    const supabase = createAdminClient()

    // 3. Rechercher la licence (cle deja normalisee).
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
        .is('hardware_id', null) // garde-fou anti course (double activation)

      if (updateError) {
        throw updateError
      }

      return NextResponse.json({ valid: true })
    }

    // 7. Licence deja liee a un autre PC (comparaison sur valeur nettoyee).
    if (String(data.hardware_id).trim() !== hardware_id) {
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
