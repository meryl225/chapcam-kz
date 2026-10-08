import 'server-only'
import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

// Minutes Live Swap achetees en recharge (consommables Apple). Elles vivent dans
// le meme solde que les minutes d'abonnement (subscriptions.points, Supabase),
// mais n'expirent JAMAIS. Ce registre retient la part "recharge" du solde.
//
// Invariant : les minutes d'abonnement sont consommees en premier. La part
// recharge effective est donc toujours min(recharge enregistree, solde total),
// sans rien changer aux routes qui debitent subscriptions.points.

let client: NeonQueryFunction<false, false> | null = null
function sql() {
  if (!client) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set')
    client = neon(process.env.DATABASE_URL)
  }
  return client
}

let migrated = false
async function ensureTables() {
  if (migrated) return
  const db = sql()
  await db`CREATE TABLE IF NOT EXISTS liveswap_topup_balances (
    user_id text PRIMARY KEY,
    points integer NOT NULL DEFAULT 0 CHECK (points >= 0),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`
  await db`CREATE TABLE IF NOT EXISTS liveswap_topup_credits (
    token text PRIMARY KEY,
    user_id text NOT NULL,
    product_id text NOT NULL,
    points integer NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`
  migrated = true
}

/** Enregistre une recharge une seule fois par transaction Apple (idempotent). */
export async function recordTopupCredit(token: string, userId: string, productId: string, points: number) {
  await ensureTables()
  const db = sql()
  const inserted = await db`
    INSERT INTO liveswap_topup_credits (token, user_id, product_id, points)
    VALUES (${token}, ${userId}, ${productId}, ${points})
    ON CONFLICT (token) DO NOTHING
    RETURNING token`
  if (!inserted.length) return false
  await db`
    INSERT INTO liveswap_topup_balances (user_id, points) VALUES (${userId}, ${points})
    ON CONFLICT (user_id) DO UPDATE
      SET points = liveswap_topup_balances.points + EXCLUDED.points, updated_at = now()`
  return true
}

/** Part recharge (non expirable) du solde total `totalPoints`. */
export async function getTopupPoints(userId: string, totalPoints: number) {
  if (totalPoints <= 0) return 0
  try {
    await ensureTables()
    const rows = await sql()`SELECT points FROM liveswap_topup_balances WHERE user_id = ${userId}`
    return Math.min(Math.max(0, Number(rows[0]?.points ?? 0)), totalPoints)
  } catch (error) {
    console.error('[liveswap-topup] lecture impossible:', (error as Error).message)
    return 0
  }
}

/** Aligne le registre sur le solde restant apres expiration de l'abonnement. */
export async function setTopupPoints(userId: string, points: number) {
  await ensureTables()
  await sql()`
    UPDATE liveswap_topup_balances SET points = ${Math.max(0, points)}, updated_at = now()
    WHERE user_id = ${userId}`
}
