import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  normalizeLicenseKey,
  recordMachineAndCheckSharing,
  SHARING_WINDOW_DAYS,
} from '@/lib/pc-license'
import { sendLicenseSharingAlertEmail } from '@/lib/email'

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
      const msg =
        data.status === 'suspected_sharing'
          ? 'Licence bloquée : utilisation sur trop de PC différents. Contactez le support.'
          : 'Licence désactivée ou expirée.'
      return NextResponse.json({ valid: false, message: msg })
    }

    // 5bis. Anti-partage : enregistre ce PC et applique la regle 2 PC / 90 jours.
    //       Si une 3e machine differente est detectee, la licence est suspendue
    //       et l'admin notifie. On fait ce controle AVANT toute (re)liaison.
    const sharing = await recordMachineAndCheckSharing(supabase, license_key, hardware_id)
    if (!sharing.allowed) {
      if (sharing.flaggedNow) {
        // Notification admin best-effort (n'empeche pas la reponse).
        try {
          await sendLicenseSharingAlertEmail({
            licenseKey: license_key,
            email: data.email,
            distinctMachines: sharing.distinctMachines,
            windowDays: SHARING_WINDOW_DAYS,
          })
        } catch (e) {
          console.error('[desktop/verify] Alerte partage non envoyee:', (e as Error).message)
        }
      }
      return NextResponse.json({
        valid: false,
        message: 'Licence bloquée : utilisation sur trop de PC différents. Contactez le support.',
      })
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

    // 7. Licence deja liee a une autre empreinte materielle.
    //    Politique : re-liaison automatique (1 PC a la fois). On remplace
    //    l'ancienne empreinte par la nouvelle, ce qui debloque les clients dont
    //    l'app desktop genere une empreinte instable (mise a jour Windows, GPU,
    //    reinstallation...). La licence reste donc liee a un seul PC a la fois.
    if (String(data.hardware_id).trim() !== hardware_id) {
      const previousHardwareId = String(data.hardware_id).trim()

      const { error: rebindError } = await supabase
        .from('pc_licenses')
        .update({
          hardware_id,
          activated_at: new Date().toISOString(),
        })
        .eq('license_key', license_key)
        // garde-fou : on ne re-lie que si l'empreinte est toujours l'ancienne,
        // pour eviter une course entre deux PC qui activent en meme temps.
        .eq('hardware_id', previousHardwareId)

      if (rebindError) {
        throw rebindError
      }

      // Journaliser le transfert (best-effort, n'empeche pas l'activation).
      try {
        await supabase.from('license_rebinds').insert({
          license_key,
          previous_hardware_id: previousHardwareId,
          new_hardware_id: hardware_id,
        })
      } catch {
        // table de log optionnelle : on ignore si elle n'existe pas
      }

      return NextResponse.json({ valid: true, rebound: true })
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
