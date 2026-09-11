import 'server-only'
import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

// ============================================================
// Solde de credits "Message Vocal" (ElevenLabs TTS + changement de voix),
// stocke dans Neon. 1 credit = 1 message vocal de 15 s MAX, genere en
// texte->voix OU voix->voix (POOL PARTAGE entre les deux modes).
// Solde SEPARE des points Live Swap, des credits photo-video / Motion /
// Traduction, car ElevenLabs facture au caractere (TTS) ou a la duree (voix).
// Credits attribues a l'achat/renouvellement d'un forfait (seed unique) et,
// plus tard, via des packs de recharge. Ils s'ACCUMULENT.
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
    CREATE TABLE IF NOT EXISTS voice_message_credits (
      user_id TEXT PRIMARY KEY,
      balance INTEGER NOT NULL DEFAULT 0,
      total_credited INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `
  _ensured = true
}

/** Retourne le solde de credits Message Vocal ET si une ligne existe deja. */
export async function getVoiceMessageBalance(
  userId: string,
): Promise<{ balance: number; exists: boolean }> {
  await ensureTable()
  const rows = (await sql`
    SELECT balance FROM voice_message_credits WHERE user_id = ${userId} LIMIT 1
  `) as { balance: number }[]
  if (rows.length === 0) return { balance: 0, exists: false }
  return { balance: Number(rows[0].balance), exists: true }
}

/** Ajoute des credits au solde (upsert, accumulation). Retourne le nouveau solde. */
export async function addVoiceMessageCredits(userId: string, amount: number): Promise<number> {
  await ensureTable()
  if (amount <= 0) return (await getVoiceMessageBalance(userId)).balance
  const rows = (await sql`
    INSERT INTO voice_message_credits (user_id, balance, total_credited, updated_at)
    VALUES (${userId}, ${amount}, ${amount}, now())
    ON CONFLICT (user_id) DO UPDATE SET
      balance = voice_message_credits.balance + ${amount},
      total_credited = voice_message_credits.total_credited + ${amount},
      updated_at = now()
    RETURNING balance
  `) as { balance: number }[]
  return Number(rows[0].balance)
}

/** Deduit N credits. Retourne le solde restant, ou -1 si insuffisant. */
export async function deductVoiceMessageCredits(userId: string, cost = 1): Promise<number> {
  await ensureTable()
  const n = Math.max(1, Math.floor(cost))
  const rows = (await sql`
    UPDATE voice_message_credits
    SET balance = balance - ${n}, updated_at = now()
    WHERE user_id = ${userId} AND balance >= ${n}
    RETURNING balance
  `) as { balance: number }[]
  return rows.length === 0 ? -1 : Number(rows[0].balance)
}

/** Rembourse N credits (si la generation echoue apres deduction). */
export async function refundVoiceMessageCredits(userId: string, cost = 1): Promise<number> {
  return addVoiceMessageCredits(userId, Math.max(1, Math.floor(cost)))
}
