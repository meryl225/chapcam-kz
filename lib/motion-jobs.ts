import 'server-only'
import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

// ============================================================
// Historique des generations "Motion" (Kling Motion Control via fal.ai ET
// image->video Higgsfield), stocke dans Neon.
//
// PROBLEME resolu : avant, une generation n'existait qu'en memoire cote client.
// Si l'utilisateur quittait la page pendant le rendu (2 a 5 min), le request_id
// et le polling etaient perdus -> la video terminee etait introuvable.
//
// Desormais chaque generation est persistee. Le client peut reprendre le
// polling au retour sur la page, et l'historique reste disponible durablement.
// ============================================================

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

export type MotionJobStatus = 'processing' | 'completed' | 'failed'
export type MotionJobProvider = 'fal' | 'higgsfield' | 'kling'

export interface MotionJob {
  id: string
  request_id: string
  provider: MotionJobProvider
  model: string
  prompt: string
  status: MotionJobStatus
  video_url: string | null
  created_at: string
}

// Cree la table si elle n'existe pas (idempotent, execute a la volee).
let _ensured = false
async function ensureTable(): Promise<void> {
  if (_ensured) return
  await sql`
    CREATE TABLE IF NOT EXISTS motion_jobs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL,
      request_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      model TEXT NOT NULL DEFAULT 'standard',
      prompt TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'processing',
      video_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `
  // Chemins des fichiers Blob PUBLICS temporaires (image + video) uploades pour
  // que Kling puisse les telecharger. On les stocke (JSON) afin de pouvoir les
  // SUPPRIMER une fois la tache terminee (succes ou echec), cote poll ou webhook.
  // Ajoute a la volee pour les tables deja existantes.
  await sql`ALTER TABLE motion_jobs ADD COLUMN IF NOT EXISTS input_paths TEXT`
  // Index pour retrouver rapidement les jobs d'un utilisateur, et pour les
  // mises a jour ciblees par request_id.
  await sql`CREATE INDEX IF NOT EXISTS motion_jobs_user_idx ON motion_jobs (user_id, created_at DESC)`
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS motion_jobs_req_idx ON motion_jobs (user_id, request_id)`
  // Un id de tache fournisseur est globalement unique -> permet au webhook (sans
  // session) de retrouver le proprietaire par request_id seul.
  await sql`CREATE INDEX IF NOT EXISTS motion_jobs_reqonly_idx ON motion_jobs (request_id)`
  _ensured = true
}

/** Enregistre une nouvelle generation (statut "processing"). */
export async function createMotionJob(input: {
  userId: string
  requestId: string
  provider: MotionJobProvider
  model: string
  prompt: string
  // Chemins Blob temporaires (image + video) a supprimer en fin de tache.
  inputPaths?: string[]
}): Promise<void> {
  await ensureTable()
  const inputPaths = input.inputPaths && input.inputPaths.length ? JSON.stringify(input.inputPaths) : null
  await sql`
    INSERT INTO motion_jobs (user_id, request_id, provider, model, prompt, status, input_paths)
    VALUES (${input.userId}, ${input.requestId}, ${input.provider}, ${input.model}, ${input.prompt}, 'processing', ${inputPaths})
    ON CONFLICT (user_id, request_id) DO NOTHING
  `
}

/**
 * Retrouve le proprietaire d'un job a partir du seul request_id (id de tache
 * fournisseur). INDISPENSABLE au webhook Kling : la notification n'a aucune
 * session. Renvoie aussi les chemins Blob temporaires a nettoyer.
 */
export async function findMotionJobOwner(
  requestId: string,
): Promise<{ userId: string; inputPaths: string[] } | null> {
  await ensureTable()
  const rows = (await sql`
    SELECT user_id, input_paths FROM motion_jobs
    WHERE request_id = ${requestId}
    LIMIT 1
  `) as { user_id: string; input_paths: string | null }[]
  if (rows.length === 0) return null
  return { userId: String(rows[0].user_id), inputPaths: parsePaths(rows[0].input_paths) }
}

/** Renvoie les chemins Blob temporaires (image + video) d'un job donne. */
export async function getMotionJobInputPaths(userId: string, requestId: string): Promise<string[]> {
  await ensureTable()
  const rows = (await sql`
    SELECT input_paths FROM motion_jobs
    WHERE user_id = ${userId} AND request_id = ${requestId}
    LIMIT 1
  `) as { input_paths: string | null }[]
  return rows.length ? parsePaths(rows[0].input_paths) : []
}

/** Vide la colonne input_paths une fois les fichiers temporaires supprimes. */
export async function clearMotionJobInputPaths(userId: string, requestId: string): Promise<void> {
  await ensureTable()
  await sql`
    UPDATE motion_jobs SET input_paths = NULL
    WHERE user_id = ${userId} AND request_id = ${requestId}
  `
}

function parsePaths(raw: string | null): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((p): p is string => typeof p === 'string') : []
  } catch {
    return []
  }
}

/** Marque un job comme termine et enregistre l'URL de la video. */
export async function markMotionJobCompleted(
  userId: string,
  requestId: string,
  videoUrl: string,
): Promise<void> {
  await ensureTable()
  await sql`
    UPDATE motion_jobs
    SET status = 'completed', video_url = ${videoUrl}, updated_at = now()
    WHERE user_id = ${userId} AND request_id = ${requestId}
  `
}

/**
 * Marque un job comme echoue.
 * Ne transitionne QUE depuis 'processing' (jamais depuis 'completed'/'failed'),
 * et renvoie true UNIQUEMENT lors de la premiere transition vers 'failed'.
 * Permet a l'appelant de rembourser le credit une seule fois, meme si le
 * polling repasse plusieurs fois sur un job echoue.
 */
export async function markMotionJobFailed(userId: string, requestId: string): Promise<boolean> {
  await ensureTable()
  const rows = (await sql`
    UPDATE motion_jobs
    SET status = 'failed', updated_at = now()
    WHERE user_id = ${userId} AND request_id = ${requestId} AND status = 'processing'
    RETURNING id
  `) as { id: string }[]
  return rows.length > 0
}

/** Liste les generations d'un utilisateur (plus recentes d'abord). */
export async function listMotionJobs(userId: string, limit = 30): Promise<MotionJob[]> {
  await ensureTable()
  const rows = (await sql`
    SELECT id, request_id, provider, model, prompt, status, video_url, created_at
    FROM motion_jobs
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `) as MotionJob[]
  return rows.map((r) => ({ ...r, id: String(r.id) }))
}
