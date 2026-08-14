// ============================================================
// Integration GeniusPay : paiement par carte bancaire internationale + mobile
// money (checkout hebergee GeniusPay) pour ChapCam.
// Chemin PARALLELE et independant de PayDunya / Trybit : il reutilise seulement
// les briques de credit partagees exportees par lib/fulfillment.ts
// (creditPurchase, creditNumbersWallet, logPaymentEvent). Aucun autre code de
// paiement n'est modifie.
//
// Securite (identique a Trybit) : on ne fait JAMAIS confiance au corps du
// webhook pour crediter. On reconfirme TOUJOURS le statut du paiement aupres de
// l'API GeniusPay (server-to-server) avant tout credit. La signature HMAC du
// webhook n'est qu'une premiere barriere.
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

const GENIUSPAY_BASE_URL = 'https://geniuspay.ci/api/v1/merchant'

export function geniuspayConfigured(): boolean {
  return Boolean(process.env.GENIUSPAY_API_KEY && process.env.GENIUSPAY_API_SECRET)
}

function authHeaders(): Record<string, string> {
  return {
    'X-API-Key': process.env.GENIUSPAY_API_KEY || '',
    'X-API-Secret': process.env.GENIUSPAY_API_SECRET || '',
    'Content-Type': 'application/json',
    // OBLIGATOIRE : l'API GeniusPay est en Laravel. Sans cet en-tete, la moindre
    // erreur (ou meme un succes) est renvoyee sous forme de REDIRECTION HTML vers
    // la page d'accueil au lieu de JSON — ce qui faisait echouer le parsing et
    // renvoyait « Paiement par carte indisponible ». Avec Accept: application/json,
    // Laravel repond systematiquement en JSON (201 a la creation).
    Accept: 'application/json',
  }
}

// Metadonnees que l'on attache au paiement a la creation et que GeniusPay nous
// retourne telles quelles dans le GET et le webhook. Elles suffisent a crediter
// sans dependre de la base (la base reste un repli / trace admin).
export interface GeniusPayMetadata {
  kind: string
  product_id: string
  user_id: string | null
  email: string
  full_name: string
  /** Code pays ISO2 choisi dans le selecteur (traçabilite). */
  country?: string
  /** Identifiant de la methode choisie (traçabilite). */
  method?: string
}

export interface GeniusPayCreation {
  reference: string // MTX-XXXXXXXXXX
  checkoutUrl: string // page de paiement hebergee GeniusPay
}

// Un seul appel POST /payments. Retourne la creation, ou null en cas d'echec.
async function postGeniusPayPayment(body: Record<string, any>): Promise<GeniusPayCreation | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000)
  try {
    const res = await fetch(`${GENIUSPAY_BASE_URL}/payments`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: 'no-store',
    })
    const data = await res.json().catch(() => null)
    const d = data?.data
    const checkoutUrl = d?.checkout_url || d?.payment_url
    if (!res.ok || !data?.success || !d?.reference || !checkoutUrl) {
      console.error(
        `[GeniusPay] Creation paiement echouee (HTTP ${res.status}, method=${body.payment_method || 'none'}):`,
        data,
      )
      return null
    }
    return { reference: String(d.reference), checkoutUrl: String(checkoutUrl) }
  } catch (e) {
    console.error('[GeniusPay] Appel create injoignable:', e)
    return null
  } finally {
    clearTimeout(timeout)
  }
}

// Cree un paiement GeniusPay en mode "checkout hebergee". Le montant est en XOF
// (source de verite serveur) ; GeniusPay convertit vers la devise du payeur.
//
// - `country` (optionnel) : code ISO2 envoye comme customer.country pour
//   pre-filtrer les operateurs locaux sur la page de checkout hebergee.
// - `paymentMethod` : conserve UNIQUEMENT pour la tracabilite (metadata). On ne
//   l'envoie PAS a l'API — voir la note ci-dessous.
//
// IMPORTANT — pourquoi on N'ENVOIE JAMAIS `payment_method` :
//   Verifie empiriquement sur l'API live : des qu'on envoie `payment_method`
//   (quelle que soit sa valeur : wave, orange_money, ET MEME card), GeniusPay
//   resout TOUJOURS le paiement en Wave et renvoie une URL directe
//   `pay.wave.com`, ignorant la methode demandee. Aucun champ (channels,
//   payment_methods, preferred_method, gateway...) ne permet de pre-selectionner
//   ou restreindre la methode sur la page hebergee. Le SEUL comportement correct
//   est donc d'omettre `payment_method` : GeniusPay renvoie alors sa vraie page
//   de checkout hebergee (`geniuspay.ci/checkout/...`), pre-filtree par le pays,
//   ou le client choisit lui-meme sa methode (Mobile Money OU carte). C'est ce
//   qui evite le "toujours renvoye vers Wave".
export async function createGeniusPayPayment(params: {
  amountXof: number
  description: string
  email: string
  fullName: string
  phone?: string
  country?: string | null
  /** Conserve pour compat/tracabilite ; NON transmis a l'API (force Wave). */
  paymentMethod?: string | null
  metadata: GeniusPayMetadata
  successUrl: string
  errorUrl: string
}): Promise<GeniusPayCreation | null> {
  return postGeniusPayPayment({
    amount: params.amountXof,
    currency: 'XOF',
    description: params.description.slice(0, 500),
    customer: {
      name: params.fullName,
      email: params.email,
      ...(params.phone ? { phone: params.phone } : {}),
      ...(params.country ? { country: params.country } : {}),
    },
    success_url: params.successUrl,
    error_url: params.errorUrl,
    metadata: params.metadata,
  })
}

export interface GeniusPayInfo {
  reference: string
  status: string // pending | processing | completed | failed | expired | cancelled | refunded
  amount: number
  metadata: Partial<GeniusPayMetadata> & Record<string, any>
  raw: any
}

// Recupere l'etat autoritaire d'un paiement aupres de GeniusPay.
export async function getGeniusPayPayment(reference: string): Promise<GeniusPayInfo | null> {
  const ref = String(reference || '').trim()
  if (!ref) return null
  try {
    const res = await fetch(`${GENIUSPAY_BASE_URL}/payments/${encodeURIComponent(ref)}`, {
      method: 'GET',
      headers: authHeaders(),
      cache: 'no-store',
    })
    const data = await res.json().catch(() => null)
    const d = data?.data
    if (!res.ok || !data?.success || !d?.reference) {
      console.error(`[GeniusPay] Recuperation paiement echouee (HTTP ${res.status}):`, data)
      return null
    }
    return {
      reference: String(d.reference),
      status: String(d.status || '').toLowerCase(),
      amount: Number(d.amount || 0),
      metadata: (d.metadata as Record<string, any>) || {},
      raw: d,
    }
  } catch (e) {
    console.error('[GeniusPay] getGeniusPayPayment echec:', e)
    return null
  }
}

// Verifie la signature HMAC-SHA256 du webhook GeniusPay.
// Format documente : HMAC-SHA256(timestamp + "." + json_payload, secret).
// Le "json_payload" cote GeniusPay est un re-encodage du corps ; pour eviter
// tout faux rejet du a une difference d'encodage (ordre des cles, espaces), on
// accepte une correspondance soit avec le corps BRUT recu, soit avec un
// re-encodage compact. La garantie monetaire reelle reste la reconfirmation
// server-to-server (getGeniusPayPayment) faite avant tout credit.
export function verifyGeniusPayWebhook(params: {
  timestamp: string | null | undefined
  rawBody: string
  signature: string | null | undefined
}): boolean {
  const secret = process.env.GENIUSPAY_WEBHOOK_SECRET
  if (!secret) return false
  const { timestamp, rawBody, signature } = params
  if (!timestamp || !signature) return false

  // Protection anti-rejeu : le timestamp ne doit pas etre trop ancien (5 min).
  const ts = Number(timestamp)
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false

  const candidates: string[] = [rawBody]
  try {
    candidates.push(JSON.stringify(JSON.parse(rawBody)))
  } catch {
    /* corps non JSON : on reste sur le brut */
  }

  for (const payload of candidates) {
    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${payload}`)
      .digest('hex')
    const a = Buffer.from(expected)
    const b = Buffer.from(String(signature))
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) return true
  }
  return false
}

function isPaid(info: GeniusPayInfo): boolean {
  return info.status === 'completed'
}

type FulfillOutcome = {
  status: 'completed' | 'pending' | 'cancelled' | 'error'
  alreadyDone: boolean
  result?: PurchaseResult
}

// Credite un paiement GeniusPay de maniere idempotente. Reconfirme toujours le
// statut aupres de GeniusPay avant tout credit.
export async function fulfillGeniusPayPayment(params: {
  reference: string
  source?: string
}): Promise<FulfillOutcome> {
  const { reference, source = 'geniuspay_callback' } = params
  const admin = createAdminClient()
  const token = `genius_${reference}`

  // 1) Reconfirmation autoritaire aupres de GeniusPay.
  const info = await getGeniusPayPayment(reference)
  if (!info) {
    await logPaymentEvent(admin, {
      source,
      token,
      status: 'error',
      credited: false,
      failureReason: 'Reconfirmation GeniusPay impossible (API/reseau)',
    })
    return { status: 'error', alreadyDone: false }
  }

  // 2) Retrouver la demande liee (via la reference stockee dans paydunya_token).
  const { data: reqRow } = await admin
    .from('payment_requests')
    .select('*')
    .eq('paydunya_token', reference)
    .maybeSingle()

  // 3) Statut non paye : on trace (hors reconciliation) et on sort.
  if (!isPaid(info)) {
    const mapped =
      info.status === 'cancelled' ||
      info.status === 'failed' ||
      info.status === 'expired' ||
      info.status === 'refunded'
        ? 'cancelled'
        : 'pending'
    if (source !== 'geniuspay_reconcile') {
      await logPaymentEvent(admin, {
        source,
        token,
        email: reqRow?.email || info.metadata?.email || null,
        productId: reqRow?.plan || info.metadata?.product_id || null,
        amount: info.amount,
        status: mapped,
        credited: false,
        failureReason:
          mapped === 'cancelled'
            ? `Paiement GeniusPay non abouti (statut: ${info.status})`
            : 'Paiement GeniusPay non encore confirme',
        raw: info.raw,
      })
    }
    return { status: mapped, alreadyDone: false }
  }

  // Garde-fou : demande deja approuvee.
  if (reqRow && reqRow.status === 'approved') {
    return { status: 'completed', alreadyDone: true }
  }

  // 4) Donnees produit : les metadata GeniusPay sont la source primaire (on les
  //    a nous-memes envoyees a la creation), avec repli sur la demande en base.
  const md = info.metadata || {}
  const productId = String(md.product_id || reqRow?.plan || '')
  const email = String(md.email || reqRow?.email || '')
  const fullName = String(md.full_name || reqRow?.full_name || 'Client ChapCam')
  const userId = (md.user_id as string | null) || (reqRow?.user_id as string | null) || null
  const kind = String(md.kind || reqRow?.kind || '')

  if (!productId || !email) {
    await logPaymentEvent(admin, {
      source,
      token,
      status: 'error',
      credited: false,
      failureReason: 'Donnees produit introuvables pour ce paiement (metadata/demande absentes)',
      raw: info.raw,
    })
    return { status: 'error', alreadyDone: false }
  }

  // 5) Idempotence ATOMIQUE : on reserve le token avant de crediter. La cle
  //    primaire de processed_payments garantit qu'une seule source (callback /
  //    status) reussit l'insert ; les autres recoivent une violation d'unicite.
  const { error: claimErr } = await admin.from('processed_payments').insert({
    token,
    email,
    product_id: productId,
    amount: info.amount,
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

  // 6) Credit effectif (formule / live / installation / pc / voix / wallet).
  const isNumbersWallet = productId === 'numbers_wallet' || kind === 'numbers_wallet'
  let result: PurchaseResult
  try {
    result = isNumbersWallet
      ? await creditNumbersWallet({
          userId,
          email,
          amountXof: Number(reqRow?.amount || info.amount || 0),
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
      amount: info.amount,
      status: 'completed',
      credited: false,
      userLinked: !!userId,
      failureReason: `Credit GeniusPay echoue (exception) : ${reason}`,
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
    amount: info.amount,
    status: 'completed',
    credited: result.ok,
    creditKind: result.kind,
    userLinked: result.userLinked,
    failureReason: result.ok ? null : result.message,
    raw: info.raw,
  })

  // 7) Marquer la demande approuvee.
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
      action: 'geniuspay_approve',
      payment_request_id: reqRow.id,
      admin_email: ADMIN_EMAIL,
      details: {
        reference,
        product: productId,
        amount: info.amount,
        kind: result.kind,
        user_linked: result.userLinked,
        auto: true,
      },
    })
  }

  return { status: 'completed', alreadyDone: false, result }
}
