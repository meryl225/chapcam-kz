import 'server-only'
import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

// ============================================================
// Solde de credits "Traduction Video" (HeyGen video-translation v3), stocke
// dans Neon. 1 credit = 1 video traduite (<= 60s) dans 1 langue, en mode Rapide.
// Le mode Precision (meilleure synchro labiale) coute 2 credits.
// C'est un solde SEPARE des points Live Swap, des credits photo-video ET des
// credits Motion, car la traduction a un cout fournisseur eleve (~1200 F/min en
// mode Rapide, ~2400 F/min en Precision). Credits attribues a l'achat/
// renouvellement d'un forfait + achat de packs, et s'ACCUMULENT.
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
    CREATE TABLE IF NOT EXISTS translation_credits (
      user_id TEXT PRIMARY KEY,
      balance INTEGER NOT NULL DEFAULT 0,
      total_credited INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `
  _ensured = true
}

/** Retourne le solde de credits Traduction ET si une ligne existe deja. */
export async function getTranslationBalance(
  userId: string,
): Promise<{ balance: number; exists: boolean }> {
  await ensureTable()
  const rows = (await sql`
    SELECT balance FROM translation_credits WHERE user_id = ${userId} LIMIT 1
  `) as { balance: number }[]
  if (rows.length === 0) return { balance: 0, exists: false }
  return { balance: Number(rows[0].balance), exists: true }
}

/** Ajoute des credits au solde (upsert, accumulation). Retourne le nouveau solde. */
export async function addTranslationCredits(userId: string, amount: number): Promise<number> {
  await ensureTable()
  if (amount <= 0) return (await getTranslationBalance(userId)).balance
  const rows = (await sql`
    INSERT INTO translation_credits (user_id, balance, total_credited, updated_at)
    VALUES (${userId}, ${amount}, ${amount}, now())
    ON CONFLICT (user_id) DO UPDATE SET
      balance = translation_credits.balance + ${amount},
      total_credited = translation_credits.total_credited + ${amount},
      updated_at = now()
    RETURNING balance
  `) as { balance: number }[]
  return Number(rows[0].balance)
}

/** Deduit N credits (1 = Rapide, 2 = Precision). Retourne le solde restant, ou -1 si insuffisant. */
export async function deductTranslationCredits(userId: string, cost: number): Promise<number> {
  await ensureTable()
  const n = Math.max(1, Math.floor(cost))
  const rows = (await sql`
    UPDATE translation_credits
    SET balance = balance - ${n}, updated_at = now()
    WHERE user_id = ${userId} AND balance >= ${n}
    RETURNING balance
  `) as { balance: number }[]
  return rows.length === 0 ? -1 : Number(rows[0].balance)
}

/** Rembourse N credits (si la generation echoue apres deduction). */
export async function refundTranslationCredits(userId: string, cost: number): Promise<number> {
  return addTranslationCredits(userId, Math.max(1, Math.floor(cost)))
}
