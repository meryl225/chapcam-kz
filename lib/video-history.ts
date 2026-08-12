import 'server-only'
import { neon, type NeonQueryFunction } from '@neondatabase/serverless'
import { put, del } from '@vercel/blob'

// ============================================================
// Historique PERMANENT des videos generees par les outils IA
// (Studio Photo en Video, Motion, Traduction Video).
//
// PROBLEME resolu : les URLs renvoyees par HeyGen/fal EXPIRENT (souvent ~7
// jours). Stocker seulement l'URL fournisseur donne un historique qui casse.
// On RE-HEBERGE donc chaque video terminee dans Vercel Blob (store prive), et
// on conserve le pathname Blob durable dans Neon. Les videos restent alors
// accessibles indefiniment via une route authentifiee.
// ============================================================

export type VideoTool = 'photo_video' | 'motion' | 'translation'

export interface VideoHistoryItem {
  id: string
  tool: VideoTool
  // Reference fournisseur (video_id HeyGen / translation id) : sert a re-heberger
  // a la demande une video dont le blob manque mais encore valide chez HeyGen.
  provider_ref: string | null
  // Chemin du blob prive (a servir via /api/videos/file?pathname=...).
  blob_pathname: string | null
  // Miniature optionnelle (URL directe fournisseur, non critique si elle expire).
  thumbnail_url: string | null
  title: string
  status: 'processing' | 'completed' | 'failed'
  created_at: string
}

let _client: NeonQueryFunction<false, false> | null = null
function getClient(): NeonQueryFunction<false, false> {
  if (!_client) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL is not set')
    _client = neon(url)
  }
  return _client
}
const sql: NeonQueryFunction<false, false> = ((...args: unknown[]) =>
  // @ts-expect-error — relais transparent vers le client Neon (tagged template + appels).
  getClient()(...args)) as NeonQueryFunction<false, false>

let _ensured = false
async function ensureTable(): Promise<void> {
  if (_ensured) return
  await sql`
    CREATE TABLE IF NOT EXISTS video_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL,
      tool TEXT NOT NULL,
      -- Reference cote fournisseur (video_id HeyGen, translation id, request_id fal)
      -- pour eviter les doublons si la meme generation est enregistree 2x.
      provider_ref TEXT,
      blob_pathname TEXT,
      thumbnail_url TEXT,
      title TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'completed',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS video_history_user_idx ON video_history (user_id, created_at DESC)`
  // Un provider_ref donne n'est enregistre qu'une fois par utilisateur.
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS video_history_ref_idx ON video_history (user_id, tool, provider_ref)`
  _ensured = true
}

/**
 * Telecharge une video depuis une URL fournisseur (HeyGen/fal) et la re-heberge
 * dans le store Blob PRIVE. Retourne le pathname durable, ou null en cas d'echec.
 * Non bloquant pour l'appelant : en cas d'erreur, on renvoie null et on garde
 * quand meme une entree d'historique (statut completed sans blob).
 */
export async function rehostToBlob(
  remoteUrl: string,
  userId: string,
  tool: VideoTool,
  ref: string,
): Promise<string | null> {
  try {
    const res = await fetch(remoteUrl)
    if (!res.ok || !res.body) {
      console.error('[video-history] Telechargement source echoue:', res.status)
      return null
    }
    const contentType = res.headers.get('content-type') || 'video/mp4'
    const ext = contentType.includes('webm') ? 'webm' : 'mp4'
    // Chemin lisible et unique : videos/<user>/<tool>/<ref>-<ts>.<ext>
    const safeRef = ref.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'video'
    const pathname = `videos/${userId}/${tool}/${safeRef}-${Date.now()}.${ext}`
    const blob = await put(pathname, res.body, {
      access: 'private',
      contentType,
    })
    return blob.pathname
  } catch (err) {
    console.error('[video-history] Erreur re-hebergement Blob:', err)
    return null
  }
}

/**
 * Enregistre (ou met a jour) une generation terminee dans l'historique.
 * Idempotent par (user, tool, provider_ref) : re-appeler ne cree pas de doublon.
 */
export async function saveVideoHistory(input: {
  userId: string
  tool: VideoTool
  providerRef: string
  blobPathname: string | null
  thumbnailUrl?: string | null
  title?: string
  status?: 'processing' | 'completed' | 'failed'
}): Promise<void> {
  await ensureTable()
  await sql`
    INSERT INTO video_history (user_id, tool, provider_ref, blob_pathname, thumbnail_url, title, status)
    VALUES (
      ${input.userId}, ${input.tool}, ${input.providerRef},
      ${input.blobPathname}, ${input.thumbnailUrl ?? null},
      ${input.title ?? ''}, ${input.status ?? 'completed'}
    )
    ON CONFLICT (user_id, tool, provider_ref)
    DO UPDATE SET
      blob_pathname = COALESCE(EXCLUDED.blob_pathname, video_history.blob_pathname),
      thumbnail_url = COALESCE(EXCLUDED.thumbnail_url, video_history.thumbnail_url),
      status = EXCLUDED.status
  `
}

/**
 * Verifie qu'un provider_ref est deja enregistre AVEC un blob pour cet
 * utilisateur (permet d'eviter de re-heberger la meme video a chaque poll).
 */
export async function isAlreadyRehosted(
  userId: string,
  tool: VideoTool,
  providerRef: string,
): Promise<boolean> {
  await ensureTable()
  const rows = (await sql`
    SELECT 1 FROM video_history
    WHERE user_id = ${userId} AND tool = ${tool}
      AND provider_ref = ${providerRef} AND blob_pathname IS NOT NULL
    LIMIT 1
  `) as unknown[]
  return rows.length > 0
}

/**
 * Supprime une entree d'historique appartenant a l'utilisateur : on efface la
 * video du store Blob prive PUIS la ligne Neon. La verification user_id garantit
 * qu'on ne peut pas supprimer la video d'un autre compte. Retourne true si une
 * ligne a bien ete supprimee.
 */
export async function deleteVideoHistory(
  userId: string,
  id: string,
): Promise<boolean> {
  await ensureTable()
  // 1) Recuperer le blob a supprimer, en s'assurant qu'il appartient a l'utilisateur.
  const rows = (await sql`
    SELECT blob_pathname FROM video_history
    WHERE id = ${id} AND user_id = ${userId}
    LIMIT 1
  `) as { blob_pathname: string | null }[]
  if (rows.length === 0) return false

  // 2) Effacer le fichier Blob (non bloquant : on continue meme si echec).
  const pathname = rows[0].blob_pathname
  if (pathname) {
    try {
      await del(pathname)
    } catch (err) {
      console.error('[video-history] Suppression Blob echouee:', err)
    }
  }

  // 3) Supprimer la ligne Neon.
  await sql`DELETE FROM video_history WHERE id = ${id} AND user_id = ${userId}`
  return true
}

/**
 * Retourne une map { provider_ref -> blob_pathname } pour un utilisateur et un
 * outil donnes. Sert a "durcir" les galeries existantes (ex: Motion) en
 * remplacant les URLs fournisseur (qui expirent) par la copie Blob permanente.
 */
export async function getBlobPathnamesByRef(
  userId: string,
  tool: VideoTool,
): Promise<Record<string, string>> {
  await ensureTable()
  const rows = (await sql`
    SELECT provider_ref, blob_pathname
    FROM video_history
    WHERE user_id = ${userId} AND tool = ${tool}
      AND provider_ref IS NOT NULL AND blob_pathname IS NOT NULL
  `) as { provider_ref: string; blob_pathname: string }[]
  const map: Record<string, string> = {}
  for (const r of rows) map[r.provider_ref] = r.blob_pathname
  return map
}

/**
 * Met a jour le blob_pathname d'une ligne existante (auto-reparation) : quand on
 * a reussi a re-heberger a posteriori une video dont le blob manquait.
 */
export async function setBlobPathname(
  userId: string,
  id: string,
  pathname: string,
): Promise<void> {
  await ensureTable()
  await sql`
    UPDATE video_history
    SET blob_pathname = ${pathname}, status = 'completed'
    WHERE id = ${id} AND user_id = ${userId}
  `
}

/** Liste l'historique d'un utilisateur, tous outils ou filtre par outil. */
export async function listVideoHistory(
  userId: string,
  tool?: VideoTool,
  limit = 50,
): Promise<VideoHistoryItem[]> {
  await ensureTable()
  const rows = tool
    ? ((await sql`
        SELECT id, tool, provider_ref, blob_pathname, thumbnail_url, title, status, created_at
        FROM video_history
        WHERE user_id = ${userId} AND tool = ${tool}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `) as VideoHistoryItem[])
    : ((await sql`
        SELECT id, tool, provider_ref, blob_pathname, thumbnail_url, title, status, created_at
        FROM video_history
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `) as VideoHistoryItem[])
  return rows.map((r) => ({ ...r, id: String(r.id) }))
}
