import 'server-only'
import { neon, type NeonQueryFunction } from '@neondatabase/serverless'
import type { ChapVerifyMedia } from '@/lib/resemble'

// ============================================================
// Suivi des verifications ChapVerify (Neon). Sert a : afficher l'historique,
// suivre le statut, et garantir qu'un remboursement en cas d'echec n'a lieu
// QU'UNE SEULE FOIS (transition de statut atomique).
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

let _ensured = false
async function ensureTable(): Promise<void> {
  if (_ensured) return
  await sql`
    CREATE TABLE IF NOT EXISTS chapverify_jobs (
      uuid TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      media TEXT NOT NULL,
      cost INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'processing',
      verdict TEXT,
      confidence INTEGER,
      filename TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS chapverify_jobs_user_idx ON chapverify_jobs (user_id, created_at DESC)`
  _ensured = true
}

export interface ChapVerifyJob {
  uuid: string
  media: ChapVerifyMedia
  cost: number
  status: 'processing' | 'completed' | 'failed'
  verdict: 'fake' | 'real' | 'unknown' | null
  confidence: number | null
  filename: string | null
  created_at: string
}

export async function createJob(
  userId: string,
  uuid: string,
  media: ChapVerifyMedia,
  cost: number,
  filename: string,
): Promise<void> {
  await ensureTable()
  await sql`
    INSERT INTO chapverify_jobs (uuid, user_id, media, cost, status, filename)
    VALUES (${uuid}, ${userId}, ${media}, ${cost}, 'processing', ${filename})
    ON CONFLICT (uuid) DO NOTHING
  `
}

export async function getJob(userId: string, uuid: string): Promise<ChapVerifyJob | null> {
  await ensureTable()
  const rows = (await sql`
    SELECT uuid, media, cost, status, verdict, confidence, filename, created_at
    FROM chapverify_jobs WHERE uuid = ${uuid} AND user_id = ${userId} LIMIT 1
  `) as ChapVerifyJob[]
  return rows[0] ?? null
}

export async function listJobs(userId: string, limit = 20): Promise<ChapVerifyJob[]> {
  await ensureTable()
  return (await sql`
    SELECT uuid, media, cost, status, verdict, confidence, filename, created_at
    FROM chapverify_jobs WHERE user_id = ${userId}
    ORDER BY created_at DESC LIMIT ${limit}
  `) as ChapVerifyJob[]
}

// Marque comme termine (idempotent). Renvoie true si la ligne a effectivement
// change de statut (utile pour ne journaliser qu'une fois).
export async function markCompleted(
  userId: string,
  uuid: string,
  verdict: string,
  confidence: number,
): Promise<boolean> {
  await ensureTable()
  const rows = (await sql`
    UPDATE chapverify_jobs
    SET status = 'completed', verdict = ${verdict}, confidence = ${confidence}
    WHERE uuid = ${uuid} AND user_id = ${userId} AND status <> 'completed'
    RETURNING uuid
  `) as { uuid: string }[]
  return rows.length > 0
}

// Marque comme echoue. Renvoie true UNIQUEMENT lors de la premiere transition
// vers 'failed' -> le remboursement du credit ne se declenche donc qu'une fois.
export async function markFailed(userId: string, uuid: string): Promise<boolean> {
  await ensureTable()
  const rows = (await sql`
    UPDATE chapverify_jobs
    SET status = 'failed'
    WHERE uuid = ${uuid} AND user_id = ${userId} AND status = 'processing'
    RETURNING uuid
  `) as { uuid: string }[]
  return rows.length > 0
}
