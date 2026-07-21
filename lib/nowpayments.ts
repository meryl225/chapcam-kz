// ============================================================
// Integration NOWPayments : paiement crypto pour ChapCam.
// Chemin PARALLELE et independant de PayDunya et de Trybit : il reutilise
// seulement les briques de credit partagees exportees par lib/fulfillment.ts
// (creditPurchase, creditNumbersWallet, logPaymentEvent).
// Les codes PayDunya et Trybit ne sont jamais modifies.
//
// Securite : on ne fait JAMAIS confiance au corps de l'IPN. On verifie d'abord
// sa signature HMAC-SHA512 (x-nowpayments-sig), PUIS on reconfirme toujours le
// statut du paiement aupres de l'API NOWPayments (server-to-server) avant de
// crediter.
// ============================================================

import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { ADMIN_EMAIL } from '@/lib/admin-auth'
import {
  creditPurchase,
  creditNumbersWallet,
  logPaymentEvent,
  type PurchaseResult,
} from '@/lib/fulfillment'

const NOWPAYMENTS_BASE_URL = 'https://api.nowpayments.io/v1'

// NOWPayments ne gere pas le FCFA (XOF). On convertit au taux fixe de la zone
// CFA (parite garantie de l'euro : 1 EUR = 655,957 XOF) et on facture en EUR.
const XOF_PER_EUR = 655.957

export function xofToEur(amountXof: number): number {
  const eur = amountXof / XOF_PER_EUR
  // Montant ENTIER en EUR (aucune virgule) pour des tarifs crypto stables.
  // On arrondit au superieur pour ne jamais sous-facturer, minimum 1 EUR.
  return Math.max(1, Math.ceil(eur))
}

export function nowpaymentsConfigured(): boolean {
  return Boolean(process.env.NOWPAYMENTS_API_KEY)
}

function apiHeaders(): Record<string, string> {
  return {
    'x-api-key': process.env.NOWPAYMENTS_API_KEY as string,
    'Content-Type': 'application/json',
  }
}

// Prefixe utilise pour stocker l'id de facture NOWPayments dans la colonne
// paydunya_token. Permet de distinguer les demandes NOWPayments (NP-...) des
// demandes Trybit (INV-...) et PayDunya (token PayDunya).
export function prefixedInvoiceId(id: string | number): string {
  const bare = String(id ?? '').replace(/^NP-/i, '')
  return bare ? `NP-${bare}` : ''
}

export interface NowInvoice {
  id: string // id de la facture NOWPayments
  link: string // page de paiement hebergee
}

// Cree une facture NOWPayments. Le montant est en XOF (source de verite
// serveur) et converti en EUR. `orderId` nous relie a payment_requests, et les
// URLs d'IPN / succes / annulation sont passees a la creation (contrairement a
// Trybit ou elles sont configurees dans le tableau de bord).
export async function createNowInvoice(params: {
  amountXof: number
  orderId: string
  email: string
  origin: string
}): Promise<NowInvoice | null> {
  const base = (params.origin || 'https://chapcam.com').replace(/\/$/, '')
  // Prix libelle en EUR (montant entier). On ne force PAS de crypto : NOWPayments
  // laisse l'utilisateur choisir n'importe quelle crypto et n'importe quel reseau
  // (BTC, ETH, USDT, etc.) et convertit au taux du marche. Le montant en tokens
  // aura donc des decimales, mais l'equivalent EUR facture reste fixe.
  const body = {
    price_amount: xofToEur(params.amountXof),
    price_currency: 'eur',
    order_id: params.orderId,
    order_description: 'Recharge ChapCam',
    ipn_callback_url: `${base}/api/payment/nowpayments/callback`,
    success_url: `${base}/dashboard/payment-success?provider=nowpayments`,
    cancel_url: `${base}/dashboard/plans`,
    is_fixed_rate: true,
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20000)
    const res = await fetch(`${NOWPAYMENTS_BASE_URL}/invoice`, {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timeout)
    const data = await res.json().catch(() => null)
    if (!res.ok || !data?.id || !data?.invoice_url) {
      console.error(`[NOWPayments] Creation facture echouee (HTTP ${res.status}):`, data)
      return null
    }
    return { id: String(data.id), link: String(data.invoice_url) }
  } catch (e) {
    console.error('[NOWPayments] Appel create injoignable:', e)
    return null
  }
}

export interface NowPaymentInfo {
  paymentId: string
  paymentStatus: string // waiting | confirming | confirmed | sending | partially_paid | finished | failed | refunded | expired
  orderId: string | null
  invoiceId: string | null
  priceAmount: number
  raw: any
}

// Recupere l'etat autoritaire d'un paiement aupres de NOWPayments.
export async function getNowPayment(paymentId: string): Promise<NowPaymentInfo | null> {
  const id = String(paymentId || '').trim()
  if (!id) return null
  try {
    const res = await fetch(`${NOWPAYMENTS_BASE_URL}/payment/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: apiHeaders(),
      cache: 'no-store',
    })
    const data = await res.json().catch(() => null)
    if (!res.ok || !data?.payment_id) {
      console.error(`[NOWPayments] GET payment echoue (HTTP ${res.status}):`, data)
      return null
    }
    return {
      paymentId: String(data.payment_id),
      paymentStatus: String(data.payment_status || '').toLowerCase(),
      orderId: data.order_id ? String(data.order_id) : null,
      invoiceId: data.invoice_id ? String(data.invoice_id) : null,
      priceAmount: Number(data.price_amount || 0),
      raw: data,
    }
  } catch (e) {
    console.error('[NOWPayments] getNowPayment echec:', e)
    return null
  }
}

// Tri recursif des cles d'un objet (requis pour reconstruire la signature IPN
// exactement comme NOWPayments l'a calculee).
function sortObject(obj: any): any {
  if (Array.isArray(obj)) return obj.map(sortObject)
  if (obj && typeof obj === 'object') {
    return Object.keys(obj)
      .sort()
      .reduce((acc: Record<string, any>, key) => {
        acc[key] = sortObject(obj[key])
        return acc
      }, {})
  }
  return obj
}

// Verifie la signature HMAC-SHA512 de l'IPN NOWPayments (header
// x-nowpayments-sig) calculee sur le JSON aux cles triees avec l'IPN secret.
export function verifyNowSignature(rawBody: string, signature: string | null | undefined): boolean {
  const secret = process.env.NOWPAYMENTS_IPN_SECRET
  if (!secret) {
    // Sans secret configure, on ne peut pas verifier : on refuse par securite.
    console.error('[NOWPayments] NOWPAYMENTS_IPN_SECRET manquant')
    return false
  }
  if (!signature || typeof signature !== 'string') return false
  let parsed: any
  try {
    parsed = JSON.parse(rawBody)
  } catch {
    return false
  }
  const sorted = JSON.stringify(sortObject(parsed))
  const expected = crypto.createHmac('sha512', secret).update(sorted).digest('hex')
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

// Un paiement est considere paye lorsque NOWPayments le marque "finished".
function isPaid(info: NowPaymentInfo): boolean {
  return info.paymentStatus === 'finished'
}

// Statuts terminaux d'echec (facture annulee / expiree / remboursee).
function isFailed(info: NowPaymentInfo): boolean {
  return ['failed', 'refunded', 'expired'].includes(info.paymentStatus)
}

type FulfillOutcome = {
  status: 'completed' | 'pending' | 'cancelled' | 'error'
  alreadyDone: boolean
  result?: PurchaseResult
}

// Credite un paiement NOWPayments de maniere idempotente. Reconfirme toujours
// le statut aupres de NOWPayments avant tout credit.
export async function fulfillNowPayment(params: {
  paymentId: string
  source?: string
}): Promise<FulfillOutcome> {
  const { paymentId, source = 'nowpayments_callback' } = params
  const admin = createAdminClient()
  const token = `nowpayments_${paymentId}`

  // 1) Reconfirmation autoritaire aupres de NOWPayments.
  const info = await getNowPayment(paymentId)
  if (!info) {
    await logPaymentEvent(admin, {
      source,
      token,
      status: 'error',
      credited: false,
      failureReason: 'Reconfirmation NOWPayments impossible (API/reseau)',
    })
    return { status: 'error', alreadyDone: false }
  }

  // 2) Retrouver la demande liee via order_id (=> wave_transaction_reference).
  let reqRow: any = null
  if (info.orderId) {
    const { data } = await admin
      .from('payment_requests')
      .select('*')
      .eq('wave_transaction_reference', info.orderId)
      .like('paydunya_token', 'NP-%')
      .maybeSingle()
    reqRow = data
  }
  if (!reqRow && info.invoiceId) {
    const { data } = await admin
      .from('payment_requests')
      .select('*')
      .eq('paydunya_token', prefixedInvoiceId(info.invoiceId))
      .maybeSingle()
    reqRow = data
  }

  // 3) Statut non paye : on trace (hors reconciliation) et on sort.
  if (!isPaid(info)) {
    const mapped = isFailed(info) ? 'cancelled' : 'pending'
    if (source !== 'nowpayments_reconcile') {
      await logPaymentEvent(admin, {
        source,
        token,
        email: reqRow?.email || null,
        productId: reqRow?.plan || null,
        amount: info.priceAmount,
        status: mapped,
        credited: false,
        failureReason:
          mapped === 'cancelled'
            ? 'Paiement crypto annule/expire cote NOWPayments'
            : 'Paiement crypto non encore confirme',
        raw: info.raw,
      })
    }
    return { status: mapped, alreadyDone: false }
  }

  // Garde-fou : demande deja approuvee.
  if (reqRow && reqRow.status === 'approved') {
    return { status: 'completed', alreadyDone: true }
  }

  const cd = reqRow || {}
  const productId = String(cd.plan || '')
  const email = String(cd.email || '')
  const fullName = String(cd.full_name || 'Client ChapCam')
  const userId = (cd.user_id as string | null) || null

  if (!productId || !email) {
    await logPaymentEvent(admin, {
      source,
      token,
      status: 'error',
      credited: false,
      failureReason: 'Demande crypto introuvable pour ce paiement (order_id/invoice non lies)',
      raw: info.raw,
    })
    return { status: 'error', alreadyDone: false }
  }

  // 4) Idempotence ATOMIQUE : on reserve le token avant de crediter. La cle
  //    primaire de processed_payments garantit qu'une seule source (callback /
  //    status) reussit l'insert ; les autres recoivent une violation d'unicite.
  const { error: claimErr } = await admin.from('processed_payments').insert({
    token,
    email,
    product_id: productId,
    amount: info.priceAmount,
    credited: false,
  })
  if (claimErr) {
    const { data: existingClaim } = await admin
      .from('processed_payments')
      .select('credited, created_at')
      .eq('token', token)
      .maybeSingle()
    if (existingClaim?.credited) {
      return { status: 'completed', alreadyDone: true }
    }
    const IN_FLIGHT_GRACE_MS = 3 * 60 * 1000
    const ageMs = existingClaim?.created_at
      ? Date.now() - new Date(existingClaim.created_at).getTime()
      : Number.POSITIVE_INFINITY
    if (ageMs < IN_FLIGHT_GRACE_MS) {
      return { status: 'pending', alreadyDone: false }
    }
  }

  // 5) Credit effectif (formule / live / installation / pc / voix / wallet).
  const isNumbersWallet = productId === 'numbers_wallet' || cd.kind === 'numbers_wallet'
  let result: PurchaseResult
  try {
    result = isNumbersWallet
      ? await creditNumbersWallet({
          userId,
          email,
          amountXof: Number(reqRow?.amount || 0),
          token,
        })
      : await creditPurchase(admin, { productId, email, fullName, userId })
  } catch (e) {
    await admin.from('processed_payments').delete().eq('token', token)
    const reason = (e as Error)?.message || 'Exception pendant le credit'
    await logPaymentEvent(admin, {
      source,
      token,
      email,
      productId,
      amount: info.priceAmount,
      status: 'completed',
      credited: false,
      userLinked: !!userId,
      failureReason: `Credit crypto echoue (exception) : ${reason}`,
      raw: info.raw,
    })
    return { status: 'error', alreadyDone: false }
  }

  if (result.ok) {
    await admin.from('processed_payments').update({ credited: true }).eq('token', token)
  } else {
    await admin.from('processed_payments').delete().eq('token', token)
  }

  await logPaymentEvent(admin, {
    source,
    token,
    email,
    productId,
    amount: info.priceAmount,
    status: 'completed',
    credited: result.ok,
    creditKind: result.kind,
    userLinked: result.userLinked,
    failureReason: result.ok ? null : result.message,
    raw: info.raw,
  })

  // 6) Marquer la demande approuvee.
  const now = new Date()
  if (reqRow) {
    await admin
      .from('payment_requests')
      .update({
        status: 'approved',
        validated_at: now.toISOString(),
        paid_amount: reqRow.amount,
        paid_at: now.toISOString(),
        user_id: userId,
      })
      .eq('id', reqRow.id)
      .neq('status', 'approved')

    await admin.from('admin_logs').insert({
      action: 'nowpayments_approve',
      payment_request_id: reqRow.id,
      admin_email: ADMIN_EMAIL,
      details: {
        payment_id: paymentId,
        invoice_id: info.invoiceId,
        product: productId,
        amount_eur: info.priceAmount,
        kind: result.kind,
        user_linked: result.userLinked,
        auto: true,
      },
    })
  }

  return { status: 'completed', alreadyDone: false, result }
}
