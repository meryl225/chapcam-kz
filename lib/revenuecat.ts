import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { activateSubscription, creditTopupPoints, logPaymentEvent } from '@/lib/fulfillment'
import { recordTopupCredit } from '@/lib/liveswap-topup'
import { creditJetonsOnce } from '@/lib/jetons'
import { APPLE_PRODUCTS, deactivateAppleSubscription, emailFor, planForAppleProduct } from '@/lib/apple-iap'

// ============================================================
// Achats iOS (App Store) et Android (Google Play) via RevenueCat.
//
// Le client ne fait jamais foi : apres un achat, une restauration ou un
// webhook, le serveur relit le client RevenueCat avec la cle secrete
// (REVENUECAT_SECRET_API_KEY) et ne credite que ce qu'Apple a confirme.
// app_user_id RevenueCat = id Supabase de l'utilisateur ChapCam.
// ============================================================

type Admin = ReturnType<typeof createAdminClient>

export const REVENUECAT_OFFERING = 'sale'

export const TOKEN_PACKS: { productId: string; jetons: number }[] = [
  { productId: 'com.chapcam.app.tokens.100', jetons: 100 },
  { productId: 'com.chapcam.app.tokens.250', jetons: 250 },
  { productId: 'com.chapcam.app.tokens.500', jetons: 500 },
  { productId: 'com.chapcam.app.tokens.1000', jetons: 1000 },
]

// Recharges Live Swap (consommables Apple, offering RevenueCat dedie). Le
// nombre de minutes vient UNIQUEMENT de ce tableau, jamais du client.
export const LIVESWAP_MINUTES_OFFERING = 'liveswap_minutes'
const LIVESWAP_POINTS_PER_SECOND = 2

export const LIVESWAP_MINUTE_PACKS: { productId: string; packageId: string; minutes: number }[] = [
  { productId: 'com.chapcam.app.liveswap.minutes.5', packageId: 'liveswap_5min', minutes: 5 },
  { productId: 'com.chapcam.app.liveswap.minutes.15', packageId: 'liveswap_15min', minutes: 15 },
  { productId: 'com.chapcam.app.liveswap.minutes.25', packageId: 'liveswap_25min', minutes: 25 },
]

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const isChapcamUserId = (id: unknown): id is string => typeof id === 'string' && UUID_PATTERN.test(id)

interface RcSubscription {
  expires_date: string | null
  purchase_date: string
  original_purchase_date?: string | null
  store: string
  is_sandbox: boolean
  refunded_at?: string | null
  store_transaction_id?: string | null
}

interface RcNonSubscription {
  id: string
  purchase_date: string
  store: string
  is_sandbox: boolean
  store_transaction_id?: string | null
}

interface RcSubscriber {
  subscriptions?: Record<string, RcSubscription>
  non_subscriptions?: Record<string, RcNonSubscription[]>
}

export class RevenueCatUnavailableError extends Error {}

async function fetchSubscriber(userId: string): Promise<RcSubscriber> {
  const key = process.env.REVENUECAT_SECRET_API_KEY
  if (!key) throw new RevenueCatUnavailableError('REVENUECAT_SECRET_API_KEY manquant')
  const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    cache: 'no-store',
  })
  if (!response.ok) throw new RevenueCatUnavailableError(`RevenueCat HTTP ${response.status}`)
  const body = await response.json()
  return body?.subscriber ?? {}
}

export type SyncStatus = 'activated' | 'already' | 'credited' | 'expired' | 'revoked' | 'other_account'

export interface SyncItem {
  productId: string
  transactionId: string
  status: SyncStatus
  jetons?: number
  minutes?: number
  expiresAt?: string | null
}

export interface SyncResult {
  items: SyncItem[]
  subscriptionActive: boolean
  balance: number | null
  liveSwapPoints: number | null
}

// Achats credites : App Store (iOS) et Google Play (Android).
const isSupportedStore = (store: string) => store === 'app_store' || store === 'play_store'

const storePrefix = (store: string) => (store === 'play_store' ? 'google' : 'apple')

const transactionKey = (productId: string, entry: { store: string; store_transaction_id?: string | null; purchase_date: string; id?: string }) =>
  entry.store_transaction_id ? `${storePrefix(entry.store)}:${entry.store_transaction_id}` : `rc:${entry.id ?? `${productId}:${entry.purchase_date}`}`

// Google Play peut indexer un abonnement par « produit:base-plan ».
function findSubscription(subscriptions: Record<string, RcSubscription>, productId: string): RcSubscription | null {
  const direct = subscriptions[productId]
  if (direct && isSupportedStore(direct.store)) return direct
  const playEntries = Object.entries(subscriptions)
    .filter(([key, sub]) => key.startsWith(`${productId}:`) && sub.store === 'play_store')
    .map(([, sub]) => sub)
    .sort((a, b) => Date.parse(b.expires_date ?? '') - Date.parse(a.expires_date ?? ''))
  return playEntries[0] ?? null
}

// Un abonnement Apple appartient au compte Apple, pas au compte ChapCam. Quand
// un autre compte ChapCam se connecte sur le meme iPhone, RevenueCat peut lui
// transferer l'abonnement (et ses renouvellements, qui ont chacun un nouvel id
// de transaction). On rattache donc la lignee de l'abonnement (produit + date
// d'achat d'origine) au premier compte ChapCam credite, et les autres comptes
// ne recoivent jamais le forfait.
async function ownsSubscriptionLineage(
  admin: Admin,
  userId: string,
  email: string,
  productId: string,
  planId: string,
  sub: RcSubscription,
  transactionToken: string,
): Promise<boolean> {
  const lineage = `${storePrefix(sub.store)}-owner:${productId}:${sub.original_purchase_date ?? sub.purchase_date}`
  const myToken = `${lineage}:${userId}`
  const firstOwner = async () => {
    const { data, error } = await admin
      .from('processed_payments')
      .select('token')
      .like('token', `${lineage}:%`)
      .order('created_at', { ascending: true })
      .limit(1)
    if (error) throw new Error(`processed_payments owner: ${error.message}`)
    return data?.[0]?.token ?? null
  }

  const owner = await firstOwner()
  if (owner) return owner === myToken

  // Lignee creditee avant ce controle : elle n'est a ce compte que si son
  // forfait est bien celui enregistre sur ce compte.
  const { data: claimed } = await admin
    .from('processed_payments')
    .select('credited')
    .eq('token', transactionToken)
    .maybeSingle()
  if (claimed?.credited) {
    const { data: row } = await admin.from('subscriptions').select('plan, is_active').eq('user_id', userId).maybeSingle()
    if (!row?.is_active || row.plan !== planId) return false
  }

  const { error: insertErr } = await admin
    .from('processed_payments')
    .insert({ token: myToken, email, product_id: planId, amount: 0, credited: true })
  if (insertErr && insertErr.code !== '23505') throw new Error(`processed_payments owner insert: ${insertErr.message}`)
  return (await firstOwner()) === myToken
}

async function applySubscriptions(admin: Admin, userId: string, email: string, subscriber: RcSubscriber, source: string) {
  const items: SyncItem[] = []
  let active = false
  const subscriptions = subscriber.subscriptions ?? {}

  for (const { productId } of APPLE_PRODUCTS) {
    const sub = findSubscription(subscriptions, productId)
    const plan = planForAppleProduct(productId)
    if (!sub || !plan) continue
    const token = transactionKey(productId, sub)
    const expiresMs = sub.expires_date ? Date.parse(sub.expires_date) : 0
    const logBase = { source, token, transactionId: token, email, productId: plan.id, amount: plan.price, creditKind: 'subscription', userLinked: true }

    if (sub.refunded_at) {
      await deactivateAppleSubscription(admin, userId, plan, expiresMs || null)
      await logPaymentEvent(admin, { ...logBase, status: 'revoked', failureReason: 'refunded' })
      items.push({ productId, transactionId: token, status: 'revoked', expiresAt: sub.expires_date })
      continue
    }
    if (!expiresMs || expiresMs <= Date.now()) {
      items.push({ productId, transactionId: token, status: 'expired', expiresAt: sub.expires_date })
      continue
    }

    if (!(await ownsSubscriptionLineage(admin, userId, email, productId, plan.id, sub, token))) {
      console.info('[iap-diag] abonnement rattache a un autre compte', { userId, productId, token })
      items.push({ productId, transactionId: token, status: 'other_account', expiresAt: sub.expires_date })
      continue
    }

    active = true
    // Reservation atomique par transaction Apple : l'app et le webhook peuvent
    // arriver en meme temps, seul celui qui bascule credited false -> true credite.
    const { error: insertErr } = await admin.from('processed_payments').insert({
      token,
      email,
      product_id: plan.id,
      amount: plan.price,
      credited: false,
    })
    if (insertErr && insertErr.code !== '23505') throw new Error(`processed_payments insert: ${insertErr.message}`)
    const { data: claimed, error: claimErr } = await admin
      .from('processed_payments')
      .update({ credited: true })
      .eq('token', token)
      .eq('credited', false)
      .select('token')
    if (claimErr) throw new Error(`processed_payments claim: ${claimErr.message}`)
    if (!claimed?.length) {
      console.info('[iap-diag] deja credite', { userId, productId, token })
      items.push({ productId, transactionId: token, status: 'already', expiresAt: sub.expires_date })
      continue
    }

    try {
      await activateSubscription(admin, userId, email, plan, { endDate: new Date(expiresMs) })
      // activateSubscription journalise ses erreurs sans les lever : on relit la
      // ligne pour ne jamais marquer credite un forfait qui n'a pas ete ecrit.
      const { data: written } = await admin
        .from('subscriptions')
        .select('plan, is_active, end_date')
        .eq('user_id', userId)
        .maybeSingle()
      const writtenEnd = written?.end_date ? Date.parse(written.end_date) : 0
      if (!written?.is_active || writtenEnd < expiresMs - 60_000) {
        throw new Error(`abonnement non enregistre (${JSON.stringify(written)})`)
      }
      console.info('[iap-diag] forfait applique', { userId, productId, plan: plan.id, token, endDate: written.end_date, jetons: plan.jetons, source })
    } catch (error) {
      await admin.from('processed_payments').update({ credited: false }).eq('token', token)
      console.error('[iap-diag] activation echouee', { userId, productId, token, error: (error as Error).message })
      throw error
    }
    await logPaymentEvent(admin, { ...logBase, status: 'completed', credited: true })
    items.push({ productId, transactionId: token, status: 'activated', expiresAt: sub.expires_date })
  }

  return { items, active }
}

async function applyTokenPacks(admin: Admin, userId: string, email: string, subscriber: RcSubscriber, source: string) {
  const items: SyncItem[] = []
  let balance: number | null = null
  const purchases = subscriber.non_subscriptions ?? {}

  for (const pack of TOKEN_PACKS) {
    for (const entry of purchases[pack.productId] ?? []) {
      if (!isSupportedStore(entry.store)) continue
      const token = transactionKey(pack.productId, entry)
      const result = await creditJetonsOnce(userId, token, pack.jetons, {
        source,
        productId: pack.productId,
        store: entry.store,
        sandbox: entry.is_sandbox,
      })
      balance = result.balance
      if (result.credited) {
        await logPaymentEvent(admin, {
          source,
          token,
          transactionId: token,
          email,
          productId: pack.productId,
          amount: 0,
          creditKind: 'jetons',
          userLinked: true,
          status: 'completed',
          credited: true,
        })
      }
      items.push({ productId: pack.productId, transactionId: token, status: result.credited ? 'credited' : 'already', jetons: pack.jetons })
    }
  }

  return { items, balance }
}

async function readLiveSwapPoints(admin: Admin, userId: string) {
  const { data, error } = await admin.from('subscriptions').select('points').eq('user_id', userId).maybeSingle()
  if (error) throw new Error(`subscriptions points: ${error.message}`)
  return Number(data?.points ?? 0)
}

// Chaque transaction Apple est reservee dans processed_payments (cle primaire
// token) : seule la source qui bascule credited false -> true ajoute les minutes.
async function applyMinutePacks(admin: Admin, userId: string, email: string, subscriber: RcSubscriber, source: string) {
  const items: SyncItem[] = []
  let points: number | null = null
  const purchases = subscriber.non_subscriptions ?? {}

  for (const pack of LIVESWAP_MINUTE_PACKS) {
    for (const entry of purchases[pack.productId] ?? []) {
      if (!isSupportedStore(entry.store)) continue
      const token = transactionKey(pack.productId, entry)
      const packPoints = pack.minutes * 60 * LIVESWAP_POINTS_PER_SECOND

      const { error: insertErr } = await admin
        .from('processed_payments')
        .insert({ token, email, product_id: pack.productId, amount: 0, credited: false })
      if (insertErr && insertErr.code !== '23505') throw new Error(`processed_payments insert: ${insertErr.message}`)
      const { data: claimed, error: claimErr } = await admin
        .from('processed_payments')
        .update({ credited: true })
        .eq('token', token)
        .eq('credited', false)
        .select('token')
      if (claimErr) throw new Error(`processed_payments claim: ${claimErr.message}`)
      if (!claimed?.length) {
        items.push({ productId: pack.productId, transactionId: token, status: 'already', minutes: pack.minutes })
        continue
      }

      try {
        const before = await readLiveSwapPoints(admin, userId)
        // Part non expirable enregistree avant le solde : idempotente par token,
        // un nouvel essai apres un echec Supabase ne la double donc pas.
        await recordTopupCredit(token, userId, pack.productId, packPoints)
        await creditTopupPoints(admin, userId, email, packPoints)
        points = await readLiveSwapPoints(admin, userId)
        if (points < before + packPoints) throw new Error(`minutes non enregistrees (avant ${before}, apres ${points})`)
        console.info('[iap-diag] minutes Live Swap creditees', { userId, productId: pack.productId, token, minutes: pack.minutes, points, source })
      } catch (error) {
        await admin.from('processed_payments').update({ credited: false }).eq('token', token)
        console.error('[iap-diag] credit minutes echoue', { userId, productId: pack.productId, token, error: (error as Error).message })
        throw error
      }
      await logPaymentEvent(admin, {
        source,
        token,
        transactionId: token,
        email,
        productId: pack.productId,
        amount: 0,
        creditKind: 'minutes',
        userLinked: true,
        status: 'completed',
        credited: true,
      })
      items.push({ productId: pack.productId, transactionId: token, status: 'credited', minutes: pack.minutes })
    }
  }

  return { items, points }
}

export async function syncRevenueCatCustomer(userId: string, opts: { email?: string | null; source: string }): Promise<SyncResult> {
  const subscriber = await fetchSubscriber(userId)
  const admin = createAdminClient()
  const email = await emailFor(admin, userId, opts.email)
  console.info('[iap-diag] revenuecat', {
    userId,
    source: opts.source,
    supabaseUserFound: Boolean(email),
    subscriptions: Object.fromEntries(
      Object.entries(subscriber.subscriptions ?? {}).map(([id, s]) => [id, { expires: s.expires_date, tx: s.store_transaction_id, sandbox: s.is_sandbox }]),
    ),
  })
  const subs = await applySubscriptions(admin, userId, email, subscriber, opts.source)
  const packs = await applyTokenPacks(admin, userId, email, subscriber, opts.source)
  const minutes = await applyMinutePacks(admin, userId, email, subscriber, opts.source)
  return {
    items: [...subs.items, ...packs.items, ...minutes.items],
    subscriptionActive: subs.active,
    balance: packs.balance,
    liveSwapPoints: minutes.points,
  }
}
