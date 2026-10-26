import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { activateSubscription, creditTopupPoints, logPaymentEvent } from '@/lib/fulfillment'
import { recordTopupCredit } from '@/lib/liveswap-topup'
import { creditJetonsOnce, revokeJetonsOnce } from '@/lib/jetons'
import { APPLE_PRODUCTS, deactivateAppleSubscription, emailFor, extendAppleSubscription, planForAppleProduct } from '@/lib/apple-iap'
import { getPlan, type PlanConfig, type PlanId } from '@/lib/plans'

// ============================================================
// Achats iOS (App Store) et Android (Google Play) via RevenueCat.
//
// Le client ne fait jamais foi : apres un achat, une restauration ou un
// webhook, le serveur relit le client RevenueCat avec la cle secrete
// (REVENUECAT_SECRET_API_KEY) et ne credite que ce que le store a confirme.
// app_user_id RevenueCat = id Supabase de l'utilisateur ChapCam.
// ============================================================

type Admin = ReturnType<typeof createAdminClient>

export const REVENUECAT_OFFERING = 'sale'

export type Store = 'app_store' | 'play_store'
const STORE_PREFIX: Record<Store, string> = { app_store: 'apple', play_store: 'google' }

// productId = identifiant App Store, androidProductId = identifiant Google Play.
// Les deux catalogues sont distincts : aucun identifiant Apple n'est reutilise.
// price = prix catalogue en F CFA (meme grille que JETONS_OFFERS), utilise
// pour le journal admin : le montant reel encaisse par le store n'est pas fourni.
export const TOKEN_PACKS: { productId: string; androidProductId: string; jetons: number; price: number }[] = [
  { productId: 'com.chapcam.app.tokens.100', androidProductId: 'chapcam_tokens_100', jetons: 100, price: 1000 },
  { productId: 'com.chapcam.app.tokens.250', androidProductId: 'chapcam_tokens_250', jetons: 250, price: 2500 },
  { productId: 'com.chapcam.app.tokens.500', androidProductId: 'chapcam_tokens_500', jetons: 500, price: 5000 },
  { productId: 'com.chapcam.app.tokens.1000', androidProductId: 'chapcam_tokens_1000', jetons: 1000, price: 10000 },
]

export function tokenPackPrice(productId: string | null | undefined) {
  if (!productId) return null
  return TOKEN_PACKS.find((p) => p.productId === productId || p.androidProductId === productId)?.price ?? null
}

// Recharges Live Swap (consommables, offering RevenueCat dedie). Le
// nombre de minutes vient UNIQUEMENT de ce tableau, jamais du client.
export const LIVESWAP_MINUTES_OFFERING = 'liveswap_minutes'
const LIVESWAP_POINTS_PER_SECOND = 2

// price = prix catalogue en F CFA, utilise pour le journal admin.
export const LIVESWAP_MINUTE_PACKS: { productId: string; androidProductId: string; packageId: string; minutes: number; price: number }[] = [
  { productId: 'com.chapcam.app.liveswap.minutes.5', androidProductId: 'chapcam_minutes_5', packageId: 'liveswap_5min', minutes: 5, price: 9000 },
  { productId: 'com.chapcam.app.liveswap.minutes.15', androidProductId: 'chapcam_minutes_15', packageId: 'liveswap_15min', minutes: 15, price: 24000 },
  { productId: 'com.chapcam.app.liveswap.minutes.25', androidProductId: 'chapcam_minutes_25', packageId: 'liveswap_25min', minutes: 25, price: 42000 },
]

export function minutePackPrice(productId: string | null | undefined) {
  if (!productId) return null
  return LIVESWAP_MINUTE_PACKS.find((p) => p.productId === productId || p.androidProductId === productId)?.price ?? null
}

// Abonnements Google Play : un abonnement par forfait, une offre de base
// (base plan) par periode. Cote SDK Android l'identifiant vaut « abonnement:base ».
// Chaque abonnement correspond a un seul forfait ChapCam : toute offre de base
// de l'abonnement active donc ce forfait.
export const GOOGLE_PLAY_SUBSCRIPTIONS: { subscriptionId: string; planId: PlanId }[] = [
  { subscriptionId: 'chapcam_test_weekly', planId: 'testeur' },
  { subscriptionId: 'chapcam_starter_monthly', planId: 'starter' },
  { subscriptionId: 'chapcam_premium_90days', planId: 'premium' },
  { subscriptionId: 'chapcam_vip_pro_yearly', planId: 'ultimate' },
  { subscriptionId: 'chapcam_vip_debout', planId: 'vipdebout' },
]

export function androidProductIdForPlan(planId: string) {
  return GOOGLE_PLAY_SUBSCRIPTIONS.find((g) => g.planId === planId)?.subscriptionId ?? null
}

const storeProducts = (pack: { productId: string; androidProductId: string }): [string, Store][] => [
  [pack.productId, 'app_store'],
  [pack.androidProductId, 'play_store'],
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
  product_plan_identifier?: string | null
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
  store: Store
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

// Les cles « apple: » existantes sont conservees telles quelles : changer leur
// format recrediterait des achats iOS deja traites.
export const transactionKey = (store: Store, productId: string, entry: { store_transaction_id?: string | null; purchase_date: string; id?: string }) =>
  entry.store_transaction_id ? `${STORE_PREFIX[store]}:${entry.store_transaction_id}` : `rc:${entry.id ?? `${productId}:${entry.purchase_date}`}`

// Abonnement Google Play dans l'API v1 : cle = id d'abonnement, offre de base
// dans product_plan_identifier (ou cle « abonnement:base » selon la config).
// Si plusieurs entrees existent (renouvellements, offres), on garde la plus
// recente par date d'expiration.
function googleSubscription(subscriptions: Record<string, RcSubscription>, g: { subscriptionId: string }) {
  let best: RcSubscription | undefined
  for (const [key, sub] of Object.entries(subscriptions)) {
    if (sub?.store !== 'play_store') continue
    if (key !== g.subscriptionId && !key.startsWith(`${g.subscriptionId}:`)) continue
    const exp = sub.expires_date ? Date.parse(sub.expires_date) : 0
    const bestExp = best?.expires_date ? Date.parse(best.expires_date) : -1
    if (!best || exp > bestExp) best = sub
  }
  return best
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
  store: Store,
): Promise<boolean> {
  const lineage = `${STORE_PREFIX[store]}-owner:${productId}:${sub.original_purchase_date ?? sub.purchase_date}`
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

  const candidates: { productId: string; store: Store; sub: RcSubscription | undefined; plan: PlanConfig | null }[] = [
    ...APPLE_PRODUCTS.map(({ productId }) => {
      const sub = subscriptions[productId]
      return { productId, store: 'app_store' as const, sub: sub?.store === 'app_store' ? sub : undefined, plan: planForAppleProduct(productId) }
    }),
    ...GOOGLE_PLAY_SUBSCRIPTIONS.map((g) => ({
      productId: g.subscriptionId,
      store: 'play_store' as const,
      sub: googleSubscription(subscriptions, g),
      plan: getPlan(g.planId) ?? null,
    })),
  ]

  for (const { productId, store, sub, plan } of candidates) {
    if (!sub || !plan) continue
    const token = transactionKey(store, productId, sub)
    const expiresMs = sub.expires_date ? Date.parse(sub.expires_date) : 0
    const logBase = { source, token, transactionId: token, email, productId: plan.id, amount: plan.price, creditKind: 'subscription', userLinked: true }

    if (sub.refunded_at) {
      await deactivateAppleSubscription(admin, userId, plan, expiresMs || null)
      await logPaymentEvent(admin, { ...logBase, status: 'revoked', failureReason: 'refunded' })
      items.push({ productId, store, transactionId: token, status: 'revoked', expiresAt: sub.expires_date })
      continue
    }
    if (!expiresMs || expiresMs <= Date.now()) {
      items.push({ productId, store, transactionId: token, status: 'expired', expiresAt: sub.expires_date })
      continue
    }

    if (!(await ownsSubscriptionLineage(admin, userId, email, productId, plan.id, sub, token, store))) {
      console.info('[iap-diag] abonnement rattache a un autre compte', { userId, productId, token })
      items.push({ productId, store, transactionId: token, status: 'other_account', expiresAt: sub.expires_date })
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
      items.push({ productId, store, transactionId: token, status: 'already', expiresAt: sub.expires_date })
      continue
    }

    // Renouvellement de test (Sandbox/TestFlight, toutes les 24 h) : on prolonge
    // l'acces sans recrediter le forfait ni compter de revenu.
    const originalMs = sub.original_purchase_date ? Date.parse(sub.original_purchase_date) : NaN
    const isTestRenewal = sub.is_sandbox && Number.isFinite(originalMs) && Date.parse(sub.purchase_date) > originalMs
    if (isTestRenewal) {
      try {
        await extendAppleSubscription(admin, userId, plan, expiresMs)
      } catch (error) {
        await admin.from('processed_payments').update({ credited: false }).eq('token', token)
        throw error
      }
      await admin.from('processed_payments').update({ amount: 0 }).eq('token', token)
      console.info('[iap-diag] renouvellement sandbox prolonge sans credit', { userId, productId, token })
      await logPaymentEvent(admin, { ...logBase, source: `${source}:sandbox`, amount: 0, status: 'sandbox_renewal', credited: false })
      items.push({ productId, store, transactionId: token, status: 'activated', expiresAt: sub.expires_date })
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
    items.push({ productId, store, transactionId: token, status: 'activated', expiresAt: sub.expires_date })
  }

  return { items, active }
}

async function applyTokenPacks(admin: Admin, userId: string, email: string, subscriber: RcSubscriber, source: string) {
  const items: SyncItem[] = []
  let balance: number | null = null
  const purchases = subscriber.non_subscriptions ?? {}

  for (const pack of TOKEN_PACKS) {
    for (const [productId, store] of storeProducts(pack)) {
    for (const entry of purchases[productId] ?? []) {
      if (entry.store !== store) continue
      const token = transactionKey(store, productId, entry)
      const result = await creditJetonsOnce(userId, token, pack.jetons, {
        source,
        productId,
        store,
        sandbox: entry.is_sandbox,
      })
      balance = result.balance
      if (result.credited) {
        await logPaymentEvent(admin, {
          source,
          token,
          transactionId: token,
          email,
          productId,
          amount: pack.price,
          creditKind: 'jetons',
          userLinked: true,
          status: 'completed',
          credited: true,
        })
      }
      items.push({ productId, store, transactionId: token, status: result.credited ? 'credited' : 'already', jetons: pack.jetons })
    }
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
    for (const [productId, store] of storeProducts(pack)) {
    for (const entry of purchases[productId] ?? []) {
      if (entry.store !== store) continue
      const token = transactionKey(store, productId, entry)
      const packPoints = pack.minutes * 60 * LIVESWAP_POINTS_PER_SECOND

      const { error: insertErr } = await admin
        .from('processed_payments')
        .insert({ token, email, product_id: productId, amount: 0, credited: false })
      if (insertErr && insertErr.code !== '23505') throw new Error(`processed_payments insert: ${insertErr.message}`)
      const { data: claimed, error: claimErr } = await admin
        .from('processed_payments')
        .update({ credited: true })
        .eq('token', token)
        .eq('credited', false)
        .select('token')
      if (claimErr) throw new Error(`processed_payments claim: ${claimErr.message}`)
      if (!claimed?.length) {
        items.push({ productId, store, transactionId: token, status: 'already', minutes: pack.minutes })
        continue
      }

      try {
        const before = await readLiveSwapPoints(admin, userId)
        // Part non expirable enregistree avant le solde : idempotente par token,
        // un nouvel essai apres un echec Supabase ne la double donc pas.
        await recordTopupCredit(token, userId, productId, packPoints)
        await creditTopupPoints(admin, userId, email, packPoints)
        points = await readLiveSwapPoints(admin, userId)
        if (points < before + packPoints) throw new Error(`minutes non enregistrees (avant ${before}, apres ${points})`)
        console.info('[iap-diag] minutes Live Swap creditees', { userId, productId: productId, token, minutes: pack.minutes, points, source })
      } catch (error) {
        await admin.from('processed_payments').update({ credited: false }).eq('token', token)
        console.error('[iap-diag] credit minutes echoue', { userId, productId: productId, token, error: (error as Error).message })
        throw error
      }
      await logPaymentEvent(admin, {
        source,
        token,
        transactionId: token,
        email,
        productId: productId,
        amount: pack.price,
        creditKind: 'minutes',
        userLinked: true,
        status: 'completed',
        credited: true,
      })
      items.push({ productId, store, transactionId: token, status: 'credited', minutes: pack.minutes })
    }
    }
  }

  return { items, points }
}

// Remboursement d'un achat unique (jetons ou minutes), signale par le webhook
// RevenueCat CANCELLATION avec cancel_reason CUSTOMER_SUPPORT. Les jetons
// credites pour cette transaction sont retires une seule fois ; les minutes
// Live Swap remboursees sont journalisees pour traitement manuel.
export async function revokeRefundedPurchase(userId: string, event: { store?: string; product_id?: string; transaction_id?: string; type?: string }) {
  const store = event.store === 'PLAY_STORE' ? 'play_store' : event.store === 'APP_STORE' ? 'app_store' : null
  if (!store || !event.product_id || !event.transaction_id) return { handled: false as const }
  const token = `${STORE_PREFIX[store]}:${event.transaction_id}`
  const tokenPack = TOKEN_PACKS.find((p) => p.productId === event.product_id || p.androidProductId === event.product_id)
  const minutePack = LIVESWAP_MINUTE_PACKS.find((p) => p.productId === event.product_id || p.androidProductId === event.product_id)
  if (!tokenPack && !minutePack) return { handled: false as const }

  const admin = createAdminClient()
  const email = await emailFor(admin, userId, null)
  if (tokenPack) {
    const result = await revokeJetonsOnce(token, { source: 'revenuecat_webhook:refund', productId: event.product_id, store })
    if (result.revoked && result.userId !== userId) {
      console.warn('[iap-diag] remboursement sur un autre compte que l acheteur', { token, eventUser: userId, creditedUser: result.userId })
    }
    console.info('[iap-diag] jetons rembourses', { userId, token, revoked: result.revoked })
  } else {
    console.warn('[iap-diag] minutes Live Swap remboursees, a retirer manuellement', { userId, token, minutes: minutePack!.minutes })
  }
  await logPaymentEvent(admin, {
    source: 'revenuecat_webhook:refund',
    token,
    transactionId: token,
    email,
    productId: event.product_id,
    amount: 0,
    creditKind: tokenPack ? 'jetons' : 'minutes',
    userLinked: true,
    status: 'revoked',
    failureReason: 'refunded',
  })
  return { handled: true as const }
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
