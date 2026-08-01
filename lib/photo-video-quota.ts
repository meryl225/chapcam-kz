import 'server-only'
import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

// ============================================================
// Suivi du quota "Studio Photo en Video" (Neon).
// L'authentification vit dans Supabase, mais — comme le portefeuille
// ChapCam Numbers — le journal d'usage de la photo-video vit dans Neon.
// Le quota est calcule par periode d'abonnement : on compte les videos
// generees depuis la date de debut du forfait Live Swap actif de l'utilisateur.
// (subscriptions.start_date est reinitialise a chaque achat/renouvellement,
//  donc le quota repart a neuf a chaque forfait.)
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

// Cree la table de journal si elle n'existe pas (idempotent, execute a la volee).
let _ensured = false
async function ensureTable(): Promise<void> {
  if (_ensured) return
  await sql`
    CREATE TABLE IF NOT EXISTS photo_video_log (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      video_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS photo_video_log_user_idx ON photo_video_log (user_id, created_at)`
  _ensured = true
}

/** Compte les videos generees par l'utilisateur depuis une date donnee. */
export async function countGenerationsSince(userId: string, since: Date): Promise<number> {
  await ensureTable()
  const rows = (await sql`
    SELECT COUNT(*)::int AS n
    FROM photo_video_log
    WHERE user_id = ${userId} AND created_at >= ${since.toISOString()}
  `) as { n: number }[]
  return rows[0]?.n ?? 0
}

/** Journalise une generation reussie (consomme 1 unite de quota). */
export async function logGeneration(userId: string, videoId: string): Promise<void> {
  await ensureTable()
  await sql`INSERT INTO photo_video_log (user_id, video_id) VALUES (${userId}, ${videoId})`
}
