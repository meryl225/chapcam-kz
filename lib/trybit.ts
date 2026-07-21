// ============================================================
// Integration Trybit : paiement crypto pour ChapCam.
// Chemin PARALLELE et independant de PayDunya : il reutilise seulement les
// briques de credit partagees exportees par lib/fulfillment.ts
// (creditPurchase, creditNumbersWallet, logPaymentEvent, resolveUserIdByEmail).
// Le code PayDunya n'est jamais modifie.
//
// Securite : on ne fait JAMAIS confiance au corps du postback. On reconfirme
// toujours le statut de la facture aupres de l'API Trybit (server-to-server)
// avant de crediter. Le JWT HS256 du postback n'est qu'une premiere barriere.
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

const TRYBIT_BASE_URL = 'https://api.trybit.com/v2'

// Trybit ne gere pas le FCFA (XOF). On convertit au taux fixe de la zone CFA
// (parite garantie de l'euro : 1 EUR = 655,957 XOF) et on facture en EUR.
const XOF_PER_EUR = 655.957

export function xofToEur(amountXof: number): number {
  const eur = amountXof / XOF_PER_EUR
  // Deux decimales, minimum 0,50 EUR (garde-fou anti montant nul).
  return Math.max(0.5, Math.round(eur * 100) / 100)
}

export function trybitConfigured(): boolean {
  return Boolean(
    process.env.TRYBIT_API_KEY && process.env.TRYBIT_SHOP_ID && process.env.TRYBIT_SECRET,
  )
}

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Token ${process.env.TRYBIT_API_KEY}`,
    'Content-Type': 'application/json',
  }
}

// Normalise un identifiant de facture au format sans prefixe INV- (celui du
// postback) ou avec prefixe (celui de l'API). On garde une version "nue" pour
// la cle d'idempotence et une version prefixee pour l'appel /merchant/info.
export function bareUuid(uuid: string): string {
  return String(uuid || '').replace(/^INV-/i, '')
}
export function prefixedUuid(uuid: string): string {
  const bare = bareUuid(uuid)
  return bare ? `INV-${bare}` : ''
}

export interface TrybitInvoice {
  uuid: string // avec prefixe INV-
  link: string // page de paiement Trybit
}

// Cree une facture Trybit. Le montant est en XOF (source de verite serveur) et
// converti en EUR pour Trybit. `orderId` nous relie a payment_requests.
export async function createTrybitInvoice(params: {
  amountXof: number
  orderId: string
  email: string
}): Promise<TrybitInvoice | null> {
  const body = {
    shop_id: process.env.TRYBIT_SHOP_ID,
    amount: xofToEur(params.amountXof),
    currency: 'EUR',
    order_id: params.orderId,
    email: params.email,
    add_fields: {
      // Duree de vie de la facture : 24h pour laisser le temps de payer.
      time_to_pay: { hours: 24, minutes: 0 },
    },
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20000)
    const res = await fetch(`${TRYBIT_BASE_URL}/invoice/create`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timeout)
    const data = await res.json().catch(() => null)
    if (!res.ok || data?.status !== 'success' || !data?.result?.link) {
      console.error(`[Trybit] Creation facture echouee (HTTP ${res.status}):`, data)
      return null
    }
    return { uuid: data.result.uuid, link: data.result.link }
  } catch (e) {
    console.error('[Trybit] Appel create injoignable:', e)
    return null
  }
}

export interface TrybitInvoiceInfo {
  uuid: string
  status: string // created | paid | partial | overpaid | canceled
  invoiceStatus: string // success | ...
  orderId: string | null
  amountUsd: number
  raw: any
}

// Recupere l'etat autoritaire d'une facture aupres de Trybit.
export async function getTrybitInvoiceInfo(uuid: string): Promise<TrybitInvoiceInfo | null> {
  const id = prefixedUuid(uuid)
  if (!id) return null
  try {
    const res = await fetch(`${TRYBIT_BASE_URL}/invoice/merchant/info`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ uuids: [id] }),
      cache: 'no-store',
    })
    const data = await res.json().catch(() => null)
    const row = data?.result?.[0]
    if (!res.ok || data?.status !== 'success' || !row) {
      console.error(`[Trybit] merchant/info echoue (HTTP ${res.status}):`, data)
      return null
    }
    return {
      uuid: row.uuid,
      status: String(row.status || '').toLowerCase(),
      invoiceStatus: String(row.invoice_status || '').toLowerCase(),
      orderId: row.order_id && row.order_id !== 'None' ? String(row.order_id) : null,
      amountUsd: Number(row.amount_usd || 0),
      raw: row,
    }
  } catch (e) {
    console.error('[Trybit] getTrybitInvoiceInfo echec:', e)
    return null
  }
}

// Verifie la signature JWT HS256 du postback avec la cle secrete Trybit.
// Implementation manuelle (HMAC) pour eviter une dependance externe.
export function verifyTrybitToken(token: string | null | undefined): boolean {
  const secret = process.env.TRYBIT_SECRET
  if (!secret) return false
  if (!token || typeof token !== 'string') return false
  const parts = token.trim().split('.')
  if (parts.length !== 3) return false
  const [header, payload, signature] = parts
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${payload}`)
    .digest('base64url')
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  if (a.length !== b.length) return false
  if (!crypto.timingSafeEqual(a, b)) return false
  // Verifie l'expiration si presente (le token est valide 5 min).
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (claims?.exp && Date.now() / 1000 > Number(claims.exp)) return false
  } catch {
    /* payload non lisible : la signature reste la garantie principale */
  }
  return true
}

// Une facture est consideree payee si Trybit la marque paid/overpaid.
function isPaid(info: TrybitInvoiceInfo): boolean {
  return (
    info.invoiceStatus === 'success' &&
    (info.status === 'paid' || info.status === 'overpaid')
  )
}

type FulfillOutcome = {
  status: 'completed' | 'pending' | 'cancelled' | 'error'
  alreadyDone: boolean
  result?: PurchaseResult
}

// Credite une facture Trybit de maniere idempotente. Reconfirme toujours le
// statut aupres de Trybit avant tout credit.
export async function fulfillTrybitInvoice(params: {
  uuid: string
  source?: string
}): Promise<FulfillOutcome> {
  const { uuid, source = 'trybit_callback' } = params
  const admin = createAdminClient()
  const token = `trybit_${bareUuid(uuid)}`

  // 1) Reconfirmation autoritaire aupres de Trybit.
  const info = await getTrybitInvoiceInfo(uuid)
  if (!info) {
    await logPaymentEvent(admin, {
      source,
      token,
      status: 'error',
      credited: false,
      failureReason: 'Reconfirmation Trybit impossible (API/reseau)',
    })
    return { status: 'error', alreadyDone: false }
  }

  // 2) Retrouver la demande liee (via order_id => wave_transaction_reference,
  //    repli via l'uuid stocke dans paydunya_token).
  let reqRow: any = null
  if (info.orderId) {
    const { data } = await admin
      .from('payment_requests')
      .select('*')
      .eq('wave_transaction_reference', info.orderId)
      .like('paydunya_token', 'INV-%')
      .maybeSingle()
    reqRow = data
  }
  if (!reqRow) {
    const { data } = await admin
      .from('payment_requests')
      .select('*')
      .eq('paydunya_token', prefixedUuid(uuid))
      .maybeSingle()
    reqRow = data
  }

  // 3) Statut non paye : on trace (hors reconciliation) et on sort.
  if (!isPaid(info)) {
    const mapped = info.status === 'canceled' ? 'cancelled' : 'pending'
    if (source !== 'trybit_reconcile') {
      await logPaymentEvent(admin, {
        source,
        token,
        email: reqRow?.email || null,
        productId: reqRow?.plan || null,
        amount: info.amountUsd,
        status: mapped,
        credited: false,
        failureReason:
          mapped === 'cancelled'
            ? 'Facture crypto annulee/expiree cote Trybit'
            : 'Facture crypto non encore payee',
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
      failureReason: 'Demande crypto introuvable pour cette facture (order_id/uuid non lies)',
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
    amount: info.amountUsd,
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
    // Reservation non creditee : recente => credit en cours ailleurs (on attend) ;
    // ancienne => orpheline (on retente, la reservation servant de verrou).
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
    // Le credit a jete : on libere le verrou pour permettre une nouvelle tentative.
    await admin.from('processed_payments').delete().eq('token', token)
    const reason = (e as Error)?.message || 'Exception pendant le credit'
    await logPaymentEvent(admin, {
      source,
      token,
      email,
      productId,
      amount: info.amountUsd,
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
    amount: info.amountUsd,
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
      action: 'trybit_approve',
      payment_request_id: reqRow.id,
      admin_email: ADMIN_EMAIL,
      details: {
        uuid: prefixedUuid(uuid),
        product: productId,
        amount_usd: info.amountUsd,
        kind: result.kind,
        user_linked: result.userLinked,
        auto: true,
      },
    })
  }

  return { status: 'completed', alreadyDone: false, result }
}
