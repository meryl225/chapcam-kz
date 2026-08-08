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
export type MotionJobProvider = 'fal' | 'higgsfield'

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
  // Index pour retrouver rapidement les jobs d'un utilisateur, et pour les
  // mises a jour ciblees par request_id.
  await sql`CREATE INDEX IF NOT EXISTS motion_jobs_user_idx ON motion_jobs (user_id, created_at DESC)`
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS motion_jobs_req_idx ON motion_jobs (user_id, request_id)`
  _ensured = true
}

/** Enregistre une nouvelle generation (statut "processing"). */
export async function createMotionJob(input: {
  userId: string
  requestId: string
  provider: MotionJobProvider
  model: string
  prompt: string
}): Promise<void> {
  await ensureTable()
  await sql`
    INSERT INTO motion_jobs (user_id, request_id, provider, model, prompt, status)
    VALUES (${input.userId}, ${input.requestId}, ${input.provider}, ${input.model}, ${input.prompt}, 'processing')
    ON CONFLICT (user_id, request_id) DO NOTHING
  `
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

/** Marque un job comme echoue. */
export async function markMotionJobFailed(userId: string, requestId: string): Promise<void> {
  await ensureTable()
  await sql`
    UPDATE motion_jobs
    SET status = 'failed', updated_at = now()
    WHERE user_id = ${userId} AND request_id = ${requestId}
  `
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
