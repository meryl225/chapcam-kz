// Helpers serveur pour les licences ChapCam PC (table `pc_licenses`).
// A utiliser UNIQUEMENT cote serveur (route handlers / fulfillment) car ils
// s'appuient sur le client admin Supabase (service_role).

import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

type Admin = ReturnType<typeof createAdminClient>

// Genere une cle de licence lisible : CHAPCAM-XXXX-XXXX-XXXX-XXXX
// (caracteres sans ambiguite : pas de 0/O/1/I).
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateLicenseKey(): string {
  const group = () => {
    let s = ''
    for (let i = 0; i < 4; i++) {
      s += ALPHABET[crypto.randomInt(0, ALPHABET.length)]
    }
    return s
  }
  return `CHAPCAM-${group()}-${group()}-${group()}-${group()}`
}

// Normalise une cle saisie par l'utilisateur (majuscules, espaces retires).
export function normalizeLicenseKey(key: string): string {
  return String(key || '').trim().toUpperCase().replace(/\s+/g, '')
}

// Cree une nouvelle licence pour un utilisateur. Genere une cle unique en
// reessayant en cas de collision (extremement improbable).
export async function createPcLicense(
  admin: Admin,
  params: { userId: string | null; email: string },
): Promise<{ key: string } | null> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const key = generateLicenseKey()
    const { error } = await admin.from('pc_licenses').insert({
      user_id: params.userId,
      email: params.email,
      license_key: key,
      hardware_id: null,
      status: 'active',
    })
    if (!error) return { key }
    // 23505 = violation de contrainte unique -> on regenere une cle.
    if ((error as any).code !== '23505') {
      console.error('[pc-license] Insert echoue:', error.message)
      return null
    }
  }
  return null
}

export interface ActivateResult {
  valid: boolean
  message: string
  status?: string
}

// Active une licence sur un PC donne (lie le hardware_id la premiere fois).
//  - cle inconnue / revoquee  -> valid: false
//  - hardware_id vide          -> on l'enregistre (premiere activation)
//  - hardware_id identique     -> OK (meme PC qui se reconnecte)
//  - hardware_id different     -> erreur (cle deja activee ailleurs)
export async function activatePcLicense(
  admin: Admin,
  licenseKey: string,
  hardwareId: string,
): Promise<ActivateResult> {
  const key = normalizeLicenseKey(licenseKey)
  const hw = String(hardwareId || '').trim()

  if (!key || !hw) {
    return { valid: false, message: 'Cle de licence et identifiant materiel requis.' }
  }

  const { data: license, error } = await admin
    .from('pc_licenses')
    .select('id, hardware_id, status')
    .eq('license_key', key)
    .maybeSingle()

  if (error) {
    console.error('[pc-license] Lecture echouee:', error.message)
    return { valid: false, message: 'Erreur serveur.' }
  }
  if (!license) {
    return { valid: false, message: 'Cle de licence introuvable.' }
  }
  if (license.status !== 'active') {
    return { valid: false, message: 'Cette licence a ete revoquee. Contactez le support.', status: license.status }
  }

  // Premiere activation : on lie ce PC.
  if (!license.hardware_id) {
    const { error: updErr } = await admin
      .from('pc_licenses')
      .update({ hardware_id: hw, activated_at: new Date().toISOString() })
      .eq('id', license.id)
      .is('hardware_id', null) // garde-fou anti course
    if (updErr) {
      console.error('[pc-license] Activation echouee:', updErr.message)
      return { valid: false, message: 'Activation impossible. Reessayez.' }
    }
    return { valid: true, message: 'Licence activee sur ce PC.', status: 'active' }
  }

  // Deja activee : on autorise uniquement le meme PC.
  if (license.hardware_id === hw) {
    return { valid: true, message: 'Licence valide.', status: 'active' }
  }

  return {
    valid: false,
    message: 'Cle deja activee sur un autre PC. Contactez le support pour la transferer.',
    status: 'active',
  }
}

// -----------------------------------------------------------------------------
// Anti-partage : 2 machines distinctes max par fenetre glissante de 90 jours.
// -----------------------------------------------------------------------------
export const MAX_MACHINES = 2
export const SHARING_WINDOW_DAYS = 90

export interface SharingCheckResult {
  allowed: boolean          // false = 3e machine detectee -> a bloquer
  flaggedNow: boolean       // true = la licence vient d'etre suspendue par cet appel
  distinctMachines: number  // nb de machines distinctes sur la fenetre (apres decision)
  isNewMachine: boolean
}

// Enregistre la machine courante pour la licence et applique la regle
// anti-partage. Doit etre appelee APRES avoir verifie que la licence est active.
//
//  - Si l'empreinte est deja connue (dans la fenetre) -> on met a jour last_seen.
//  - Si c'est une nouvelle empreinte ET qu'il y a deja MAX_MACHINES machines
//    actives sur la fenetre -> partage suspecte : on NE lie PAS cette machine,
//    on suspend la licence (status = 'suspected_sharing') et on renvoie
//    allowed:false + flaggedNow:true (pour notifier l'admin une seule fois).
export async function recordMachineAndCheckSharing(
  admin: Admin,
  licenseKey: string,
  hardwareId: string,
): Promise<SharingCheckResult> {
  const key = normalizeLicenseKey(licenseKey)
  const hw = String(hardwareId || '').trim()
  const since = new Date(Date.now() - SHARING_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()

  // Filet de securite : si la table n'existe pas encore (migration non jouee),
  // on n'empeche jamais un client legitime d'utiliser son logiciel.
  try {
    // Machines distinctes actives sur la fenetre.
    const { data: machines, error } = await admin
      .from('pc_license_machines')
      .select('hardware_id, last_seen')
      .eq('license_key', key)
      .gte('last_seen', since)

    if (error) {
      console.warn('[pc-license] Anti-partage indisponible (lecture):', error.message)
      return { allowed: true, flaggedNow: false, distinctMachines: 1, isNewMachine: false }
    }

    const known = new Set((machines || []).map((m) => String(m.hardware_id).trim()))
    const isNewMachine = !known.has(hw)

    // Nouvelle machine alors que le quota est deja atteint -> partage suspecte.
    if (isNewMachine && known.size >= MAX_MACHINES) {
      // Suspend la licence une seule fois (flaggedNow true uniquement a la bascule).
      const { data: updated } = await admin
        .from('pc_licenses')
        .update({
          status: 'suspected_sharing',
          flagged_at: new Date().toISOString(),
          flag_reason: `Plus de ${MAX_MACHINES} PC differents en ${SHARING_WINDOW_DAYS} jours`,
        })
        .eq('license_key', key)
        .eq('status', 'active') // ne bascule que depuis 'active'
        .select('id')
      const flaggedNow = !!(updated && updated.length > 0)
      return { allowed: false, flaggedNow, distinctMachines: known.size + 1, isNewMachine: true }
    }

    // Machine autorisee : on enregistre / rafraichit sa derniere utilisation.
    await admin
      .from('pc_license_machines')
      .upsert(
        { license_key: key, hardware_id: hw, last_seen: new Date().toISOString() },
        { onConflict: 'license_key,hardware_id' },
      )

    const distinct = isNewMachine ? known.size + 1 : known.size
    return { allowed: true, flaggedNow: false, distinctMachines: distinct, isNewMachine }
  } catch (e) {
    console.warn('[pc-license] Anti-partage ignore (exception):', (e as Error).message)
    return { allowed: true, flaggedNow: false, distinctMachines: 1, isNewMachine: false }
  }
}

// Verifie a chaque lancement que la licence est toujours valide pour ce PC.
export async function verifyPcLicense(
  admin: Admin,
  licenseKey: string,
  hardwareId: string,
): Promise<{ valid: boolean; message: string }> {
  const key = normalizeLicenseKey(licenseKey)
  const hw = String(hardwareId || '').trim()

  if (!key) return { valid: false, message: 'Cle de licence requise.' }

  const { data: license, error } = await admin
    .from('pc_licenses')
    .select('hardware_id, status')
    .eq('license_key', key)
    .maybeSingle()

  if (error || !license) {
    return { valid: false, message: 'Cle de licence introuvable.' }
  }
  if (license.status !== 'active') {
    return { valid: false, message: 'Licence revoquee.' }
  }
  // Si un hardware_id est fourni, il doit correspondre a celui enregistre.
  if (hw && license.hardware_id && license.hardware_id !== hw) {
    return { valid: false, message: 'Licence utilisee sur un autre PC.' }
  }
  return { valid: true, message: 'Licence valide.' }
}
