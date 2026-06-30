import 'server-only'
import { sql } from '@/lib/numbers/db'

/**
 * Couche données des NUMÉROS DURABLES (concept onoff).
 * Un abonnement = un numéro réel loué au mois, payé via le portefeuille FCFA.
 * Tant que l'abonnement est `active`, le client garde le numéro et peut
 * envoyer/recevoir SMS + appels.
 */

export type SubStatus = 'active' | 'past_due' | 'cancelled' | 'expired'

export type SubscriptionRow = {
  id: number
  user_id: string
  provider: string
  phone_e164: string
  provider_number_id: string | null
  country_code: string
  capabilities: string[]
  monthly_price_xof: number
  status: SubStatus
  auto_renew: boolean
  label: string | null
  current_period_start: string
  current_period_end: string
  cancelled_at: string | null
  created_at: string
  updated_at: string
}

export type MessageRow = {
  id: number
  subscription_id: number
  user_id: string
  direction: 'inbound' | 'outbound'
  phone_self: string
  phone_peer: string
  body: string
  provider_message_id: string | null
  status: string
  read: boolean
  created_at: string
}

export type CallRow = {
  id: number
  subscription_id: number
  user_id: string
  direction: 'inbound' | 'outbound'
  phone_self: string
  phone_peer: string
  status: string
  duration_sec: number
  provider_call_id: string | null
  created_at: string
  ended_at: string | null
}

const PERIOD_DAYS = 30

export function nextPeriodEnd(from: Date = new Date()): Date {
  return new Date(from.getTime() + PERIOD_DAYS * 24 * 60 * 60 * 1000)
}

export async function createSubscription(s: {
  userId: string
  phoneE164: string
  providerNumberId: string | null
  countryCode: string
  capabilities: string[]
  monthlyPriceXof: number
  label?: string | null
}): Promise<SubscriptionRow> {
  const periodEnd = nextPeriodEnd()
  const rows = (await sql`
    INSERT INTO numbers_subscriptions
      (user_id, provider, phone_e164, provider_number_id, country_code,
       capabilities, monthly_price_xof, status, auto_renew, label, current_period_end)
    VALUES
      (${s.userId}, 'telnyx', ${s.phoneE164}, ${s.providerNumberId}, ${s.countryCode.toUpperCase()},
       ${s.capabilities as unknown as string}, ${s.monthlyPriceXof}, 'active', TRUE, ${s.label ?? null},
       ${periodEnd.toISOString()})
    RETURNING *
  `) as SubscriptionRow[]
  return rows[0]
}

export async function listSubscriptions(userId: string): Promise<SubscriptionRow[]> {
  return (await sql`
    SELECT * FROM numbers_subscriptions
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `) as SubscriptionRow[]
}

export async function getSubscription(userId: string, id: number): Promise<SubscriptionRow | null> {
  const rows = (await sql`
    SELECT * FROM numbers_subscriptions WHERE user_id = ${userId} AND id = ${id} LIMIT 1
  `) as SubscriptionRow[]
  return rows[0] ?? null
}

/** Récupère un abonnement par son numéro E.164 (utilisé par les webhooks entrants). */
export async function getSubscriptionByPhone(phoneE164: string): Promise<SubscriptionRow | null> {
  const rows = (await sql`
    SELECT * FROM numbers_subscriptions WHERE phone_e164 = ${phoneE164} LIMIT 1
  `) as SubscriptionRow[]
  return rows[0] ?? null
}

export async function setSubscriptionStatus(
  id: number,
  status: SubStatus,
  extra?: { cancelledAt?: Date | null; autoRenew?: boolean },
): Promise<void> {
  await sql`
    UPDATE numbers_subscriptions
    SET status = ${status},
        cancelled_at = COALESCE(${extra?.cancelledAt ? extra.cancelledAt.toISOString() : null}, cancelled_at),
        auto_renew = COALESCE(${extra?.autoRenew ?? null}, auto_renew),
        updated_at = now()
    WHERE id = ${id}
  `
}

/** Renouvelle la période d'un abonnement (après débit mensuel réussi). */
export async function renewSubscription(id: number, newPeriodEnd: Date): Promise<void> {
  await sql`
    UPDATE numbers_subscriptions
    SET current_period_start = now(),
        current_period_end = ${newPeriodEnd.toISOString()},
        status = 'active',
        updated_at = now()
    WHERE id = ${id}
  `
}

export async function setAutoRenew(userId: string, id: number, autoRenew: boolean): Promise<void> {
  await sql`
    UPDATE numbers_subscriptions
    SET auto_renew = ${autoRenew}, updated_at = now()
    WHERE user_id = ${userId} AND id = ${id}
  `
}

/**
 * Abonnements arrivés à échéance (period_end dépassé) encore actifs.
 * Utilisé par le cron de renouvellement/expiration. Non cloisonné par user.
 */
export async function listDueSubscriptions(limit = 200): Promise<SubscriptionRow[]> {
  return (await sql`
    SELECT * FROM numbers_subscriptions
    WHERE status IN ('active','past_due')
      AND current_period_end <= now()
    ORDER BY current_period_end ASC
    LIMIT ${limit}
  `) as SubscriptionRow[]
}

// ----------------------------- Messages -----------------------------

export async function insertMessage(m: {
  subscriptionId: number
  userId: string
  direction: 'inbound' | 'outbound'
  phoneSelf: string
  phonePeer: string
  body: string
  providerMessageId?: string | null
  status?: string
  read?: boolean
}): Promise<MessageRow> {
  const rows = (await sql`
    INSERT INTO numbers_messages
      (subscription_id, user_id, direction, phone_self, phone_peer, body,
       provider_message_id, status, read)
    VALUES
      (${m.subscriptionId}, ${m.userId}, ${m.direction}, ${m.phoneSelf}, ${m.phonePeer}, ${m.body},
       ${m.providerMessageId ?? null}, ${m.status ?? 'sent'}, ${m.read ?? (m.direction === 'outbound')})
    ON CONFLICT (provider_message_id) DO NOTHING
    RETURNING *
  `) as MessageRow[]
  return rows[0]
}

export async function listMessages(userId: string, subscriptionId: number, limit = 200): Promise<MessageRow[]> {
  return (await sql`
    SELECT * FROM numbers_messages
    WHERE user_id = ${userId} AND subscription_id = ${subscriptionId}
    ORDER BY created_at ASC
    LIMIT ${limit}
  `) as MessageRow[]
}

export async function markThreadRead(userId: string, subscriptionId: number, phonePeer: string): Promise<void> {
  await sql`
    UPDATE numbers_messages
    SET read = TRUE
    WHERE user_id = ${userId} AND subscription_id = ${subscriptionId}
      AND phone_peer = ${phonePeer} AND direction = 'inbound' AND read = FALSE
  `
}

export async function countUnread(userId: string): Promise<number> {
  const rows = (await sql`
    SELECT COUNT(*)::int AS n FROM numbers_messages
    WHERE user_id = ${userId} AND direction = 'inbound' AND read = FALSE
  `) as { n: number }[]
  return Number(rows[0]?.n ?? 0)
}

// ----------------------------- Calls -----------------------------

export async function insertCall(c: {
  subscriptionId: number
  userId: string
  direction: 'inbound' | 'outbound'
  phoneSelf: string
  phonePeer: string
  status?: string
  durationSec?: number
  providerCallId?: string | null
  endedAt?: Date | null
}): Promise<CallRow> {
  const rows = (await sql`
    INSERT INTO numbers_calls
      (subscription_id, user_id, direction, phone_self, phone_peer, status,
       duration_sec, provider_call_id, ended_at)
    VALUES
      (${c.subscriptionId}, ${c.userId}, ${c.direction}, ${c.phoneSelf}, ${c.phonePeer}, ${c.status ?? 'completed'},
       ${c.durationSec ?? 0}, ${c.providerCallId ?? null}, ${c.endedAt ? c.endedAt.toISOString() : null})
    RETURNING *
  `) as CallRow[]
  return rows[0]
}

export async function listCalls(userId: string, subscriptionId: number, limit = 100): Promise<CallRow[]> {
  return (await sql`
    SELECT * FROM numbers_calls
    WHERE user_id = ${userId} AND subscription_id = ${subscriptionId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `) as CallRow[]
}
