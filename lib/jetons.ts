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

export async function reserveJetons(userId: string, providerCostUsd: number, tool: string, meta?: Record<string, unknown>) {
  const amount = providerCostToJetons(providerCostUsd)
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
