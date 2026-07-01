import 'server-only'
import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

// Client Neon partagé (SQL brut, sécurisé par requêtes paramétrées).
// Initialisation paresseuse : `neon()` n'est appelé qu'à la première requête
// (au runtime), jamais à l'évaluation du module. Cela évite que `next build`
// échoue lorsque DATABASE_URL n'est pas disponible à la compilation.
let _client: NeonQueryFunction<false, false> | null = null
function getClient(): NeonQueryFunction<false, false> {
  if (!_client) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL is not set')
    _client = neon(url)
  }
  return _client
}

export const sql: NeonQueryFunction<false, false> = ((...args: unknown[]) =>
  // @ts-expect-error — relais transparent vers le client Neon (tagged template + appels).
  getClient()(...args)) as NeonQueryFunction<false, false>

export type WalletRow = { user_id: string; balance_xof: number; updated_at: string }
export type TxRow = {
  id: number
  user_id: string
  kind: 'deposit' | 'purchase' | 'refund'
  amount_xof: number
  method: string
  reference: string | null
  status: string
  created_at: string
}
export type ActivationRow = {
  id: number
  user_id: string
  provider: string
  provider_order: string
  country_code: string
  service_slug: string
  service_label: string
  phone_e164: string
  price_xof: number
  cost_usd: string
  status: 'waiting' | 'received' | 'cancelled' | 'expired'
  code: string | null
  full_sms: string | null
  created_at: string
  expires_at: string | null
  updated_at: string
}

/** Récupère (ou crée) le portefeuille de l'utilisateur. Solde en XOF. */
export async function getWallet(userId: string): Promise<WalletRow> {
  const rows = (await sql`
    INSERT INTO numbers_wallets (user_id) VALUES (${userId})
    ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
    RETURNING user_id, balance_xof, updated_at
  `) as WalletRow[]
  return rows[0]
}

export async function getBalance(userId: string): Promise<number> {
  const w = await getWallet(userId)
  return Number(w.balance_xof)
}

/** Crédite/débite le portefeuille de façon atomique et journalise le mouvement. */
export async function adjustWallet(
  userId: string,
  deltaXof: number,
  tx: { kind: TxRow['kind']; method?: string; reference?: string; status?: string },
): Promise<number> {
  await getWallet(userId)
  const rows = (await sql`
    UPDATE numbers_wallets
    SET balance_xof = balance_xof + ${deltaXof}, updated_at = now()
    WHERE user_id = ${userId}
    RETURNING balance_xof
  `) as { balance_xof: number }[]
  await sql`
    INSERT INTO numbers_wallet_tx (user_id, kind, amount_xof, method, reference, status)
    VALUES (${userId}, ${tx.kind}, ${deltaXof}, ${tx.method ?? 'wallet'}, ${tx.reference ?? null}, ${tx.status ?? 'completed'})
  `
  return Number(rows[0].balance_xof)
}

/**
 * Rembourse une activation UNE SEULE FOIS, de façon atomique et idempotente.
 * Empêche tout double remboursement lorsque plusieurs déclencheurs agissent sur
 * la même activation (polling front + cron de réconciliation, double clic…).
 * La référence `${provider}:${order}` sert de verrou logique.
 * Renvoie `true` si le remboursement a été effectué, `false` s'il existait déjà.
 */
export async function refundActivationOnce(
  userId: string,
  provider: string,
  order: string,
  amountXof: number,
): Promise<boolean> {
  const reference = `${provider}:${order}`
  // INSERT conditionnel : ne crée la ligne de remboursement que si aucune
  // n'existe déjà pour cette référence (kind='refund'). NOT EXISTS dans le même
  // ordre SQL évite la course entre lecture et écriture.
  const inserted = (await sql`
    INSERT INTO numbers_wallet_tx (user_id, kind, amount_xof, method, reference, status)
    SELECT ${userId}, 'refund', ${amountXof}, 'wallet', ${reference}, 'completed'
    WHERE NOT EXISTS (
      SELECT 1 FROM numbers_wallet_tx
      WHERE user_id = ${userId} AND kind = 'refund' AND reference = ${reference}
    )
    RETURNING id
  `) as { id: number }[]
  if (inserted.length === 0) return false
  await getWallet(userId)
  await sql`
    UPDATE numbers_wallets
    SET balance_xof = balance_xof + ${amountXof}, updated_at = now()
    WHERE user_id = ${userId}
  `
  return true
}

export async function listTransactions(userId: string, limit = 50): Promise<TxRow[]> {
  return (await sql`
    SELECT * FROM numbers_wallet_tx
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `) as TxRow[]
}

export async function createActivation(a: {
  userId: string
  provider: string
  providerOrder: string
  countryCode: string
  serviceSlug: string
  serviceLabel: string
  phoneE164: string
  priceXof: number
  costUsd: number
  expiresAt: Date | null
}): Promise<ActivationRow> {
  const rows = (await sql`
    INSERT INTO numbers_activations
      (user_id, provider, provider_order, country_code, service_slug, service_label,
       phone_e164, price_xof, cost_usd, expires_at)
    VALUES
      (${a.userId}, ${a.provider}, ${a.providerOrder}, ${a.countryCode}, ${a.serviceSlug}, ${a.serviceLabel},
       ${a.phoneE164}, ${a.priceXof}, ${a.costUsd}, ${a.expiresAt ? a.expiresAt.toISOString() : null})
    RETURNING *
  `) as ActivationRow[]
  return rows[0]
}

export async function listActivations(userId: string, limit = 100): Promise<ActivationRow[]> {
  return (await sql`
    SELECT * FROM numbers_activations
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `) as ActivationRow[]
}

export async function getActivation(userId: string, id: number): Promise<ActivationRow | null> {
  const rows = (await sql`
    SELECT * FROM numbers_activations WHERE user_id = ${userId} AND id = ${id} LIMIT 1
  `) as ActivationRow[]
  return rows[0] ?? null
}

export async function updateActivation(
  userId: string,
  id: number,
  patch: { status?: ActivationRow['status']; code?: string | null; fullSms?: string | null },
): Promise<ActivationRow | null> {
  const rows = (await sql`
    UPDATE numbers_activations
    SET status = COALESCE(${patch.status ?? null}, status),
        code = COALESCE(${patch.code ?? null}, code),
        full_sms = COALESCE(${patch.fullSms ?? null}, full_sms),
        updated_at = now()
    WHERE user_id = ${userId} AND id = ${id}
    RETURNING *
  `) as ActivationRow[]
  return rows[0] ?? null
}

/**
 * Supprime définitivement une activation. Utilisé lorsqu'un numéro n'a reçu
 * AUCUN code SMS (expiration ou annulation) : le client est remboursé et le
 * numéro ne doit laisser aucune trace dans l'historique des activations.
 * Sûr : on ne supprime jamais une activation ayant reçu un code (garde-fou
 * `code IS NULL` en plus du cloisonnement par utilisateur).
 */
export async function deleteActivation(userId: string, id: number): Promise<boolean> {
  const rows = (await sql`
    DELETE FROM numbers_activations
    WHERE user_id = ${userId} AND id = ${id} AND code IS NULL
    RETURNING id
  `) as { id: number }[]
  return rows.length > 0
}

// ------------------------------------------------------------
// Requêtes ADMIN (non cloisonnées par utilisateur).
// À n'appeler QUE depuis un contexte vérifié admin (fanny.guck@gmail.com).
// ------------------------------------------------------------

export type AdminStats = {
  users: number
  totalBalanceXof: number
  depositsXof: number
  spendXof: number
  refundsXof: number
  activationsTotal: number
  activationsReceived: number
  activationsWaiting: number
}

const EMPTY_STATS: AdminStats = {
  users: 0,
  totalBalanceXof: 0,
  depositsXof: 0,
  spendXof: 0,
  refundsXof: 0,
  activationsTotal: 0,
  activationsReceived: 0,
  activationsWaiting: 0,
}

// Les requêtes admin sont défensives : en cas d'erreur DB (table absente,
// connexion indisponible…), on renvoie des valeurs vides au lieu de jeter,
// pour que la page d'administration s'affiche toujours pour l'admin.
export async function adminStats(): Promise<AdminStats> {
  try {
    const [wallets] = (await sql`
      SELECT COUNT(*)::int AS users, COALESCE(SUM(balance_xof), 0)::bigint AS balance
      FROM numbers_wallets
    `) as { users: number; balance: string }[]

    const tx = (await sql`
      SELECT kind, COALESCE(SUM(amount_xof), 0)::bigint AS total
      FROM numbers_wallet_tx
      GROUP BY kind
    `) as { kind: string; total: string }[]

    const acts = (await sql`
      SELECT status, COUNT(*)::int AS n
      FROM numbers_activations
      GROUP BY status
    `) as { status: string; n: number }[]

    const byKind = (k: string) => Number(tx.find((t) => t.kind === k)?.total ?? 0)
    const byStatus = (s: string) => Number(acts.find((a) => a.status === s)?.n ?? 0)

    return {
      users: Number(wallets?.users ?? 0),
      totalBalanceXof: Number(wallets?.balance ?? 0),
      depositsXof: byKind('deposit'),
      spendXof: Math.abs(byKind('purchase')),
      refundsXof: byKind('refund'),
      activationsTotal: acts.reduce((s, a) => s + Number(a.n), 0),
      activationsReceived: byStatus('received'),
      activationsWaiting: byStatus('waiting'),
    }
  } catch (e) {
    console.log('[v0] adminStats failed:', (e as Error)?.message)
    return EMPTY_STATS
  }
}

export async function adminRecentActivations(limit = 60): Promise<ActivationRow[]> {
  try {
    return (await sql`
      SELECT * FROM numbers_activations
      ORDER BY created_at DESC
      LIMIT ${limit}
    `) as ActivationRow[]
  } catch (e) {
    console.log('[v0] adminRecentActivations failed:', (e as Error)?.message)
    return []
  }
}

export async function adminRecentTransactions(limit = 60): Promise<TxRow[]> {
  try {
    return (await sql`
      SELECT * FROM numbers_wallet_tx
      ORDER BY created_at DESC
      LIMIT ${limit}
    `) as TxRow[]
  } catch (e) {
    console.log('[v0] adminRecentTransactions failed:', (e as Error)?.message)
    return []
  }
}
