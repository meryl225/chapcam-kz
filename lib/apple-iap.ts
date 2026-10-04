// ============================================================
// Achats integres Apple (StoreKit 2) pour l'app iOS ChapCam.
//
// Regle absolue : un abonnement n'est JAMAIS active sur la seule parole du
// client. Chaque transaction est un JWS signe par Apple, dont la chaine de
// certificats est verifiee jusqu'a l'Apple Root CA G3 avant tout credit.
// Le credit reutilise activateSubscription() (meme table Supabase
// `subscriptions`, memes jetons/quotas que les paiements du site).
// ============================================================

import {
  Environment,
  SignedDataVerifier,
  type JWSTransactionDecodedPayload,
} from '@apple/app-store-server-library'
import { createAdminClient } from '@/lib/supabase/admin'
import { activateSubscription, logPaymentEvent } from '@/lib/fulfillment'
import { getPlan, type PlanConfig, type PlanId } from '@/lib/plans'
import { normalizePlanName } from '@/lib/watermark'
import { APPLE_ROOT_CA_G3_BASE64 } from '@/lib/apple-root-ca'

type Admin = ReturnType<typeof createAdminClient>

export const APPLE_BUNDLE_ID = process.env.APPLE_BUNDLE_ID || 'com.chapcam.app'

// Les 5 forfaits vendus dans l'app iOS, dans l'ordre d'affichage.
export const APPLE_PRODUCTS: { productId: string; planId: PlanId }[] = [
  { productId: 'com.chapcam.app.subscription.testeur.weekly', planId: 'testeur' },
  { productId: 'com.chapcam.app.subscription.starter.monthly', planId: 'starter' },
  { productId: 'com.chapcam.app.subscription.premium.quarterly', planId: 'premium' },
  { productId: 'com.chapcam.app.subscription.vippro.yearly', planId: 'ultimate' },
  { productId: 'com.chapcam.app.subscription.vipdebout.yearly', planId: 'vipdebout' },
]

export function planForAppleProduct(productId: string | undefined | null): PlanConfig | null {
  const entry = APPLE_PRODUCTS.find((p) => p.productId === productId)
  return entry ? getPlan(entry.planId) ?? null : null
}

const verifiers = new Map<Environment, SignedDataVerifier>()

function verifierFor(environment: Environment): SignedDataVerifier | null {
  const cached = verifiers.get(environment)
  if (cached) return cached
  const appAppleId = process.env.APPLE_APP_APPLE_ID ? Number(process.env.APPLE_APP_APPLE_ID) : undefined
  // Apple impose l'identifiant numerique de l'app pour verifier en production.
  if (environment === Environment.PRODUCTION && !appAppleId) return null
  const verifier = new SignedDataVerifier(
    [Buffer.from(APPLE_ROOT_CA_G3_BASE64, 'base64')],
    true,
    environment,
    APPLE_BUNDLE_ID,
    appAppleId,
  )
  verifiers.set(environment, verifier)
  return verifier
}

// Lit l'environnement annonce par le JWS (non fiable) uniquement pour choisir
// le bon verificateur ; la verification cryptographique reste obligatoire.
function claimedEnvironment(jws: string): Environment {
  try {
    const payload = JSON.parse(Buffer.from(jws.split('.')[1] || '', 'base64url').toString('utf8'))
    return payload?.environment === Environment.SANDBOX ? Environment.SANDBOX : Environment.PRODUCTION
  } catch {
    return Environment.PRODUCTION
  }
}

async function verifyEnvelope<T>(jws: string, run: (v: SignedDataVerifier) => Promise<T>): Promise<T> {
  const environment = claimedEnvironment(jws)
  const verifier = verifierFor(environment)
  if (!verifier) {
    throw new Error('APPLE_APP_APPLE_ID manquant : verification production impossible')
  }
  return run(verifier)
}

export function verifyAppleTransaction(jws: string) {
  return verifyEnvelope(jws, (v) => v.verifyAndDecodeTransaction(jws))
}

export function verifyAppleNotification(jws: string) {
  return verifyEnvelope(jws, (v) => v.verifyAndDecodeNotification(jws))
}

export type AppleApplyStatus = 'activated' | 'already' | 'expired' | 'revoked' | 'rejected'

export interface AppleApplyResult {
  status: AppleApplyStatus
  productId: string | null
  transactionId: string | null
  expiresAt: string | null
  reason?: string
}

export async function emailFor(admin: Admin, userId: string, fallback?: string | null) {
  if (fallback) return fallback
  try {
    const { data } = await admin.auth.admin.getUserById(userId)
    return data?.user?.email || ''
  } catch {
    return ''
  }
}

// Retire l'acces quand Apple rembourse/revoque la periode qui l'a ouvert.
export async function deactivateAppleSubscription(admin: Admin, userId: string, plan: PlanConfig, expiresAt: number | null) {
  const { data: existing } = await admin
    .from('subscriptions')
    .select('id, plan, end_date, is_active')
    .eq('user_id', userId)
    .maybeSingle()
  if (!existing?.is_active || existing.plan !== normalizePlanName(plan.id)) return
  // Ne coupe pas une periode plus longue achetee ailleurs (site, admin).
  const end = existing.end_date ? new Date(existing.end_date).getTime() : 0
  if (expiresAt && end > expiresAt + 24 * 60 * 60 * 1000) return
  const now = new Date().toISOString()
  await admin
    .from('subscriptions')
    .update({ is_active: false, status: 'revoked', end_date: now, expires_at: now })
    .eq('id', existing.id)
}

// Applique une transaction Apple DEJA verifiee pour l'utilisateur donne.
export async function applyAppleTransaction(
  admin: Admin,
  tx: JWSTransactionDecodedPayload,
  opts: { userId: string; email?: string | null; source: string },
): Promise<AppleApplyResult> {
  const base = {
    productId: tx.productId ?? null,
    transactionId: tx.transactionId ?? null,
    expiresAt: tx.expiresDate ? new Date(tx.expiresDate).toISOString() : null,
  }
  const plan = planForAppleProduct(tx.productId)
  if (!plan || !tx.transactionId) {
    return { ...base, status: 'rejected', reason: 'Produit inconnu' }
  }
  if (tx.bundleId !== APPLE_BUNDLE_ID) {
    return { ...base, status: 'rejected', reason: 'Bundle invalide' }
  }
  // L'achat est lie au compte via appAccountToken = id Supabase de l'acheteur.
  if (!tx.appAccountToken || tx.appAccountToken.toLowerCase() !== opts.userId.toLowerCase()) {
    return { ...base, status: 'rejected', reason: 'Achat lie a un autre compte ChapCam' }
  }

  const email = await emailFor(admin, opts.userId, opts.email)
  const logBase = {
    source: opts.source,
    token: `apple:${tx.transactionId}`,
    transactionId: tx.transactionId,
    email,
    productId: plan.id,
    amount: plan.price,
    creditKind: 'subscription',
    userLinked: true,
  }

  if (tx.revocationDate) {
    await deactivateAppleSubscription(admin, opts.userId, plan, tx.expiresDate ?? null)
    await logPaymentEvent(admin, { ...logBase, status: 'revoked', failureReason: tx.revocationReason?.toString() ?? null })
    return { ...base, status: 'revoked' }
  }
  if (!tx.expiresDate || tx.expiresDate <= Date.now()) {
    return { ...base, status: 'expired' }
  }

  // Reservation atomique (cle primaire processed_payments.token) : une seule
  // source (app, restauration, notification Apple) credite chaque transaction.
  const token = `apple:${tx.transactionId}`
  const { error: claimErr } = await admin.from('processed_payments').insert({
    token,
    email,
    product_id: plan.id,
    amount: plan.price,
    credited: false,
  })
  if (claimErr) {
    const { data: claim } = await admin.from('processed_payments').select('credited').eq('token', token).maybeSingle()
    if (claim?.credited) return { ...base, status: 'already' }
  }

  await activateSubscription(admin, opts.userId, email, plan, { endDate: new Date(tx.expiresDate) })
  await admin.from('processed_payments').update({ credited: true }).eq('token', token)
  await logPaymentEvent(admin, { ...logBase, status: 'completed', credited: true })
  return { ...base, status: 'activated' }
}
