import type { SupabaseClient } from "@supabase/supabase-js"

// Stockage des medias d'entree Motion / Genjutsu (photo source + video de reference).
//
// Mode prive (MOTION_PRIVATE_STORAGE=true) : bucket non public "motion-inputs",
// chemins "{userId}/...", et Higgsfield recoit une URL signee temporaire.
// Mode historique (par defaut) : bucket public "avatars", chemins "motion/{userId}/...".
// Le mode prive ne doit etre active qu'apres creation du bucket
// (scripts/motion-inputs-private-bucket.sql).

const SUPABASE_URL = "https://ojmzqokffbptmcktnwdy.supabase.co"
const PRIVATE_BUCKET = "motion-inputs"
const LEGACY_BUCKET = "avatars"
const LEGACY_PREFIX = "motion"

// Higgsfield telecharge les medias au demarrage du job, mais un job peut rester
// en file d'attente : 24 h couvre largement l'attente et les nouvelles tentatives.
export const MOTION_SIGNED_URL_TTL_SECONDS = 24 * 60 * 60

export function isMotionPrivateStorage(): boolean {
  return process.env.MOTION_PRIVATE_STORAGE === "true"
}

export function motionBucket(): string {
  return isMotionPrivateStorage() ? PRIVATE_BUCKET : LEGACY_BUCKET
}

export function motionObjectPath(userId: string, fileName: string): string {
  return isMotionPrivateStorage() ? `${userId}/${fileName}` : `${LEGACY_PREFIX}/${userId}/${fileName}`
}

function ownerPrefix(userId: string): string {
  return isMotionPrivateStorage() ? `${userId}/` : `${LEGACY_PREFIX}/${userId}/`
}

// URL transmise a Higgsfield pour un objet deja televerse.
export async function motionFetchUrl(admin: SupabaseClient, path: string): Promise<string | null> {
  const bucket = motionBucket()
  if (!isMotionPrivateStorage()) {
    return admin.storage.from(bucket).getPublicUrl(path).data.publicUrl
  }
  const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, MOTION_SIGNED_URL_TTL_SECONDS)
  if (error || !data?.signedUrl) {
    console.error("[Motion] Signature URL echouee", { path, error: error?.message })
    return null
  }
  return data.signedUrl
}

// Reference renvoyee au client apres preparation d'un upload direct (champ
// "publicUrl" conserve pour l'app iOS existante). En mode prive, ce lien n'est
// pas lisible publiquement : le serveur le re-signe apres l'upload.
export function motionClientReference(admin: SupabaseClient, path: string): string {
  if (!isMotionPrivateStorage()) {
    return admin.storage.from(LEGACY_BUCKET).getPublicUrl(path).data.publicUrl
  }
  return `${SUPABASE_URL}/storage/v1/object/authenticated/${PRIVATE_BUCKET}/${path}`
}

// Extrait le chemin d'objet d'une URL Supabase et verifie qu'il appartient a
// l'utilisateur connecte. Accepte les formes public / sign / authenticated.
export function ownedMotionPathFromUrl(rawUrl: string, userId: string): string | null {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return null
  }
  if (url.protocol !== "https:" || url.host !== new URL(SUPABASE_URL).host) return null
  const bucket = motionBucket()
  const match = url.pathname.match(/^\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+)$/)
  if (!match || match[1] !== bucket) return null
  let path: string
  try {
    path = decodeURIComponent(match[2])
  } catch {
    return null
  }
  if (path.includes("..") || path.includes("//")) return null
  return path.startsWith(ownerPrefix(userId)) ? path : null
}

async function removeFolder(admin: SupabaseClient, bucket: string, folder: string): Promise<number> {
  let removed = 0
  for (;;) {
    const { data, error } = await admin.storage.from(bucket).list(folder, { limit: 1000 })
    if (error) throw error
    const files = (data ?? []).filter((f) => f.id)
    if (files.length === 0) return removed
    const { error: removeError } = await admin.storage.from(bucket).remove(files.map((f) => `${folder}/${f.name}`))
    if (removeError) throw removeError
    removed += files.length
    if (files.length < 1000) return removed
  }
}

// Suppression de compte : dossiers prive et historique, quel que soit le mode.
export async function deleteUserMotionInputs(admin: SupabaseClient, userId: string): Promise<{ private: number; legacy: number }> {
  const legacy = await removeFolder(admin, LEGACY_BUCKET, `${LEGACY_PREFIX}/${userId}`)
  let privateCount = 0
  try {
    privateCount = await removeFolder(admin, PRIVATE_BUCKET, userId)
  } catch (error) {
    // Le bucket prive peut ne pas encore exister avant la migration.
    const message = error instanceof Error ? error.message : String(error)
    if (!/not.?found/i.test(message)) throw error
  }
  return { private: privateCount, legacy }
}
