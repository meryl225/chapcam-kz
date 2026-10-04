import 'server-only'
import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

const FCFA_PER_USD = 600
const JETONS_PER_10000_FCFA = 1000
const JETONS_PER_USD = (FCFA_PER_USD * JETONS_PER_10000_FCFA) / 10000

let client: NeonQueryFunction<false, false> | null = null
function sqlClient() {
  if (!client) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set')
    client = neon(process.env.DATABASE_URL)
  }
  return client
}

const sql = ((...args: unknown[]) => (sqlClient() as unknown as (...values: unknown[]) => unknown)(...args)) as NeonQueryFunction<false, false>
let migrated = false

function providerCostToJetons(costUsd: number) {
  return Math.max(1, Math.ceil(Math.max(0, costUsd) * JETONS_PER_USD))
}

async function ensureWallet(userId: string) {
  if (!migrated) {
    await sql`
      INSERT INTO jetons_wallets (user_id, balance, total_credited)
      SELECT user_id, SUM(balance), SUM(balance)
      FROM (
        SELECT user_id, balance FROM motion_credits
        UNION ALL SELECT user_id, balance FROM photo_video_credits
        UNION ALL SELECT user_id, balance FROM translation_credits
        UNION ALL SELECT user_id, balance FROM voice_message_credits
      ) credits
      GROUP BY user_id
      ON CONFLICT (user_id) DO NOTHING
    `
    migrated = true
  }
  await sql`INSERT INTO jetons_wallets (user_id) VALUES (${userId}) ON CONFLICT (user_id) DO NOTHING`
}

export async function getJetonsBalance(userId: string) {
  await ensureWallet(userId)
  const rows = await sql`SELECT balance, total_credited, total_spent FROM jetons_wallets WHERE user_id = ${userId} LIMIT 1` as Array<{ balance: number; total_credited: number; total_spent: number }>
  return { balance: Number(rows[0]?.balance ?? 0), totalCredited: Number(rows[0]?.total_credited ?? 0), totalSpent: Number(rows[0]?.total_spent ?? 0) }
}

export async function creditJetons(userId: string, amount: number, meta?: Record<string, unknown>) {
  const value = Math.max(0, Math.floor(amount))
  if (!value) return getJetonsBalance(userId)
  await ensureWallet(userId)
  const rows = await sql`
    UPDATE jetons_wallets SET balance = balance + ${value}, total_credited = total_credited + ${value}, updated_at = now()
    WHERE user_id = ${userId} RETURNING balance
  ` as Array<{ balance: number }>
  await sql`INSERT INTO jetons_ledger (user_id, amount, balance_after, kind, meta) VALUES (${userId}, ${value}, ${Number(rows[0].balance)}, 'credit', ${meta ? JSON.stringify(meta) : null})`
  return getJetonsBalance(userId)
}

let iapTableReady = false

/**
 * Credite un achat (pack de jetons) une seule fois par transaction.
 * La reservation, le credit et l'ecriture du journal tiennent dans une seule
 * requete : deux synchronisations simultanees ne peuvent pas crediter deux fois.
 */
export async function creditJetonsOnce(userId: string, transactionId: string, amount: number, meta?: Record<string, unknown>) {
  const value = Math.max(0, Math.floor(amount))
  if (!iapTableReady) {
    await sql`
      CREATE TABLE IF NOT EXISTS jetons_iap_credits (
        transaction_id text PRIMARY KEY,
        user_id text NOT NULL,
        jetons integer NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `
    iapTableReady = true
  }
  await ensureWallet(userId)
  const metaJson = JSON.stringify({ ...meta, transactionId })
  const rows = await sql`
    WITH claim AS (
      INSERT INTO jetons_iap_credits (transaction_id, user_id, jetons)
      VALUES (${transactionId}, ${userId}, ${value})
      ON CONFLICT (transaction_id) DO NOTHING
      RETURNING user_id, jetons
    ), wallet AS (
      UPDATE jetons_wallets w
      SET balance = w.balance + c.jetons, total_credited = w.total_credited + c.jetons, updated_at = now()
      FROM claim c WHERE w.user_id = c.user_id
      RETURNING w.user_id, w.balance, c.jetons
    )
    INSERT INTO jetons_ledger (user_id, amount, balance_after, kind, meta)
    SELECT user_id, jetons, balance, 'credit', ${metaJson} FROM wallet
    RETURNING balance_after
  ` as Array<{ balance_after: number }>
  if (rows[0]) return { credited: true as const, balance: Number(rows[0].balance_after) }
  return { credited: false as const, balance: (await getJetonsBalance(userId)).balance }
}

export async function reserveJetons(userId: string, providerCostUsd: number, tool: string, meta?: Record<string, unknown>) {
  return debitJetons(userId, providerCostToJetons(providerCostUsd), providerCostUsd, tool, meta)
}

/** Debite un nombre EXACT de jetons (prix fixe), sans conversion depuis un cout USD. */
export async function reserveFixedJetons(userId: string, jetons: number, tool: string, meta?: Record<string, unknown>) {
  const amount = Math.max(1, Math.floor(jetons))
  return debitJetons(userId, amount, Math.round((amount / JETONS_PER_USD) * 10000) / 10000, tool, meta)
}

async function debitJetons(userId: string, amount: number, providerCostUsd: number, tool: string, meta?: Record<string, unknown>) {
  await ensureWallet(userId)
  const rows = await sql`
    UPDATE jetons_wallets SET balance = balance - ${amount}, total_spent = total_spent + ${amount}, updated_at = now()
    WHERE user_id = ${userId} AND balance >= ${amount} RETURNING balance
  ` as Array<{ balance: number }>
  if (!rows[0]) return { ok: false as const, required: amount, ...(await getJetonsBalance(userId)) }
  const balance = Number(rows[0].balance)
  await sql`INSERT INTO jetons_ledger (user_id, amount, balance_after, kind, tool, provider_cost_usd, meta) VALUES (${userId}, ${-amount}, ${balance}, 'usage', ${tool}, ${providerCostUsd}, ${meta ? JSON.stringify(meta) : null})`
  return { ok: true as const, charged: amount, balance }
}

export { providerCostToJetons, JETONS_PER_USD }
