import 'server-only'
import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

// ============================================================
// Solde de credits "Motion Control" (Kling Motion Control via fal.ai), stocke
// dans Neon. 1 credit = 1 clip de motion-transfer (max 10s).
// C'est un solde SEPARE des points Live Swap ET des credits photo-video, car le
// motion-transfer a un cout fournisseur bien plus eleve. Les credits sont
// attribues a l'achat/renouvellement d'un forfait et s'ACCUMULENT.
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
    CREATE TABLE IF NOT EXISTS motion_credits (
      user_id TEXT PRIMARY KEY,
      balance INTEGER NOT NULL DEFAULT 0,
      total_credited INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `
  _ensured = true
}

/** Retourne le solde de credits Motion ET si une ligne existe deja pour ce user. */
export async function getMotionBalance(
  userId: string,
): Promise<{ balance: number; exists: boolean }> {
  await ensureTable()
  const rows = (await sql`
    SELECT balance FROM motion_credits WHERE user_id = ${userId} LIMIT 1
  `) as { balance: number }[]
  if (rows.length === 0) return { balance: 0, exists: false }
  return { balance: Number(rows[0].balance), exists: true }
}

/** Ajoute des credits au solde (upsert, accumulation). Retourne le nouveau solde. */
export async function addMotionCredits(userId: string, amount: number): Promise<number> {
  await ensureTable()
  if (amount <= 0) return (await getMotionBalance(userId)).balance
  const rows = (await sql`
    INSERT INTO motion_credits (user_id, balance, total_credited, updated_at)
    VALUES (${userId}, ${amount}, ${amount}, now())
    ON CONFLICT (user_id) DO UPDATE SET
      balance = motion_credits.balance + ${amount},
      total_credited = motion_credits.total_credited + ${amount},
      updated_at = now()
    RETURNING balance
  `) as { balance: number }[]
  return Number(rows[0].balance)
}

// Cout en credits Motion par modele de rendu. Source de verite PARTAGEE : la
// route serveur (debit) et l'UI (affichage) doivent utiliser exactement ces
// valeurs pour rester coherentes. Pro coute plus cher car son cout fournisseur
// Kling est ~33% superieur.
export const MOTION_COST_BY_TIER = { standard: 1, pro: 2 } as const
export type MotionTier = keyof typeof MOTION_COST_BY_TIER
export function motionCost(tier: string): number {
  return MOTION_COST_BY_TIER[tier as MotionTier] ?? MOTION_COST_BY_TIER.standard
}

/**
 * Deduit `amount` credits (1 clip = 1 a 2 credits selon le modele). La deduction
 * est ATOMIQUE : elle n'a lieu que si le solde couvre entierement le cout, ce qui
 * evite qu'un clip Pro passe avec un solde de 1. Retourne le solde restant, ou -1
 * si le solde est insuffisant.
 */
export async function deductMotionCredit(userId: string, amount = 1): Promise<number> {
  await ensureTable()
  const cost = Math.max(1, Math.floor(amount))
  const rows = (await sql`
    UPDATE motion_credits
    SET balance = balance - ${cost}, updated_at = now()
    WHERE user_id = ${userId} AND balance >= ${cost}
    RETURNING balance
  `) as { balance: number }[]
  return rows.length === 0 ? -1 : Number(rows[0].balance)
}

/** Rembourse `amount` credits (si la generation echoue apres deduction). */
export async function refundMotionCredit(userId: string, amount = 1): Promise<number> {
  return addMotionCredits(userId, Math.max(1, Math.floor(amount)))
}
