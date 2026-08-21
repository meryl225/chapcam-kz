import 'server-only'
import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

// ============================================================
// Solde de credits "Studio Photo en Video" (Neon).
// 1 credit = 1 video de 30 secondes. Les credits sont attribues au moment ou
// les points Live Swap sont credites (a l'achat/renouvellement d'un forfait) et
// s'ACCUMULENT. C'est un solde SEPARE des points Live Swap.
// L'auth vit dans Supabase mais — comme le portefeuille ChapCam Numbers — le
// solde photo-video vit dans Neon.
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

// Cree la table de credits si elle n'existe pas (idempotent, execute a la volee).
let _ensured = false
async function ensureTable(): Promise<void> {
  if (_ensured) return
  await sql`
    CREATE TABLE IF NOT EXISTS photo_video_credits (
      user_id TEXT PRIMARY KEY,
      balance INTEGER NOT NULL DEFAULT 0,
      total_credited INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `
  _ensured = true
}

/** Retourne le solde de credits video ET si une ligne existe deja pour ce user. */
export async function getPhotoVideoBalance(
  userId: string,
): Promise<{ balance: number; exists: boolean }> {
  await ensureTable()
  const rows = (await sql`
    SELECT balance FROM photo_video_credits WHERE user_id = ${userId} LIMIT 1
  `) as { balance: number }[]
  if (rows.length === 0) return { balance: 0, exists: false }
  return { balance: Number(rows[0].balance), exists: true }
}

/**
 * Total de credits photo->video DEJA credites (achats de packs a la carte,
 * inclusions de forfait, ou dons admin) pour une liste d'utilisateurs.
 * Sert au tableau admin a distinguer un vrai compte gratuit d'un compte qui a
 * achete des credits photo sans souscrire de forfait Live Swap.
 * Renvoie une Map userId -> total_credited (absent = 0).
 */
export async function getPhotoVideoTotalsForUsers(
  userIds: string[],
): Promise<Map<string, number>> {
  const result = new Map<string, number>()
  if (userIds.length === 0) return result
  await ensureTable()
  const rows = (await sql`
    SELECT user_id, total_credited
    FROM photo_video_credits
    WHERE user_id = ANY(${userIds})
  `) as { user_id: string; total_credited: number }[]
  for (const r of rows) result.set(r.user_id, Number(r.total_credited) || 0)
  return result
}

/** Ajoute des credits au solde (upsert, accumulation). Retourne le nouveau solde. */
export async function addPhotoVideoCredits(userId: string, amount: number): Promise<number> {
  await ensureTable()
  if (amount <= 0) return (await getPhotoVideoBalance(userId)).balance
  const rows = (await sql`
    INSERT INTO photo_video_credits (user_id, balance, total_credited, updated_at)
    VALUES (${userId}, ${amount}, ${amount}, now())
    ON CONFLICT (user_id) DO UPDATE SET
      balance = photo_video_credits.balance + ${amount},
      total_credited = photo_video_credits.total_credited + ${amount},
      updated_at = now()
    RETURNING balance
  `) as { balance: number }[]
  return Number(rows[0].balance)
}

/** Deduit 1 credit (1 video de 30s). Retourne le solde restant, ou -1 si vide. */
export async function deductPhotoVideoCredit(userId: string): Promise<number> {
  await ensureTable()
  const rows = (await sql`
    UPDATE photo_video_credits
    SET balance = balance - 1, updated_at = now()
    WHERE user_id = ${userId} AND balance > 0
    RETURNING balance
  `) as { balance: number }[]
  return rows.length === 0 ? -1 : Number(rows[0].balance)
}
