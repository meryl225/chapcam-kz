import 'server-only'
import { createPublicKey, verify as edVerify } from 'node:crypto'

/**
 * Client Telnyx (API v2) pour les NUMÉROS DURABLES (concept onoff).
 * Distinct des fournisseurs OTP (5sim/sms-man/smspool) : ici on PROVISIONNE un
 * numéro réel persistant capable de SMS + voix, attaché à un abonnement mensuel.
 *
 * Sécurité : la clé API ne doit JAMAIS être exposée côté client. Toutes ces
 * fonctions sont `server-only` et appelées uniquement depuis des routes/serveur.
 */

const BASE = 'https://api.telnyx.com/v2'

function apiKey(): string {
  const k = process.env.TELNYX_API_KEY
  if (!k) throw new Error('TELNYX_API_KEY is not set')
  return k
}

function messagingProfileId(): string | undefined {
  return process.env.TELNYX_MESSAGING_PROFILE_ID || undefined
}

function connectionId(): string | undefined {
  return process.env.TELNYX_CONNECTION_ID || undefined
}

async function telnyxFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  })
  const text = await res.text()
  let json: any = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    // réponse non-JSON
  }
  if (!res.ok) {
    const detail = json?.errors?.[0]?.detail || json?.errors?.[0]?.title || text || `HTTP ${res.status}`
    throw new Error(`Telnyx ${res.status}: ${detail}`)
  }
  return json as T
}

export type AvailableNumber = {
  phoneNumber: string // E.164 avec +
  countryCode: string
  features: string[] // ex: ['sms','voice','mms']
  monthlyCostUsd: number
  upfrontCostUsd: number
  region?: string
}

/**
 * Recherche des numéros disponibles à l'achat pour un pays donné.
 * Ne renvoie que ceux capables d'au moins SMS + voix (concept onoff).
 */
export async function searchAvailableNumbers(opts: {
  countryCode: string
  limit?: number
  locality?: string
}): Promise<AvailableNumber[]> {
  const params = new URLSearchParams()
  params.set('filter[country_code]', opts.countryCode.toUpperCase())
  params.set('filter[features][]', 'sms')
  params.append('filter[features][]', 'voice')
  params.set('filter[limit]', String(opts.limit ?? 20))
  params.set('filter[best_effort]', 'true')
  if (opts.locality) params.set('filter[locality]', opts.locality)

  const data = await telnyxFetch<{ data: any[] }>(`/available_phone_numbers?${params.toString()}`)
  return (data.data || []).map((n) => {
    const features: string[] = (n.features || []).map((f: any) => (typeof f === 'string' ? f : f?.name)).filter(Boolean)
    const monthly = Number(n.cost_information?.monthly_cost ?? n.cost_information?.monthly ?? 0)
    const upfront = Number(n.cost_information?.upfront_cost ?? n.cost_information?.upfront ?? 0)
    return {
      phoneNumber: n.phone_number,
      countryCode: (n.country_code || opts.countryCode).toUpperCase(),
      features,
      monthlyCostUsd: monthly,
      upfrontCostUsd: upfront,
      region: n.region_information?.[0]?.region_name,
    }
  })
}

export type OrderedNumber = {
  phoneNumber: string
  orderId: string
  phoneNumberId: string | null
}

/**
 * Commande (achète) un numéro chez Telnyx et l'attache au profil de messagerie.
 * Retourne l'identifiant de commande et, si disponible, l'id du numéro.
 */
export async function orderNumber(phoneNumber: string): Promise<OrderedNumber> {
  const body: Record<string, unknown> = {
    phone_numbers: [{ phone_number: phoneNumber }],
  }
  const mp = messagingProfileId()
  if (mp) body.messaging_profile_id = mp
  const conn = connectionId()
  if (conn) body.connection_id = conn

  const data = await telnyxFetch<{ data: any }>(`/number_orders`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  const order = data.data
  const first = order?.phone_numbers?.[0]
  return {
    phoneNumber,
    orderId: order?.id,
    phoneNumberId: first?.id ?? null,
  }
}

/** Trouve l'id Telnyx d'un numéro possédé à partir de son E.164. */
export async function findOwnedNumberId(phoneNumber: string): Promise<string | null> {
  const params = new URLSearchParams()
  params.set('filter[phone_number]', phoneNumber)
  const data = await telnyxFetch<{ data: any[] }>(`/phone_numbers?${params.toString()}`)
  return data.data?.[0]?.id ?? null
}

/**
 * Libère (supprime) un numéro chez Telnyx. Arrête la facturation côté Telnyx.
 * Idempotent : si le numéro n'existe plus, ne lève pas d'erreur.
 */
export async function releaseNumber(phoneNumberId: string | null, phoneE164?: string): Promise<void> {
  let id = phoneNumberId
  if (!id && phoneE164) id = await findOwnedNumberId(phoneE164)
  if (!id) return
  try {
    await telnyxFetch(`/phone_numbers/${id}`, { method: 'DELETE' })
  } catch (e) {
    // Déjà libéré / introuvable : on considère l'opération comme réussie.
    if (!/404/.test((e as Error).message)) throw e
  }
}

export type SendSmsResult = { providerMessageId: string }

/** Envoie un SMS depuis un numéro ChapCam. */
export async function sendSms(opts: { from: string; to: string; text: string }): Promise<SendSmsResult> {
  const body: Record<string, unknown> = {
    from: opts.from,
    to: opts.to,
    text: opts.text,
  }
  const mp = messagingProfileId()
  if (mp) body.messaging_profile_id = mp

  const data = await telnyxFetch<{ data: any }>(`/messages`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return { providerMessageId: data.data?.id }
}

/**
 * Vérifie la signature Ed25519 d'un webhook Telnyx.
 * Telnyx signe `${timestamp}|${rawBody}` avec sa clé privée ; on vérifie avec
 * la clé publique (base64) fournie dans le portail (TELNYX_PUBLIC_KEY).
 * Rejette aussi les requêtes trop anciennes (anti-rejeu, tolérance 5 min).
 */
export function verifyWebhookSignature(opts: {
  rawBody: string
  signatureB64: string | null
  timestamp: string | null
  toleranceSec?: number
}): boolean {
  const publicKeyB64 = process.env.TELNYX_PUBLIC_KEY
  if (!publicKeyB64) {
    console.log('[v0] TELNYX_PUBLIC_KEY manquante : signature non vérifiable')
    return false
  }
  if (!opts.signatureB64 || !opts.timestamp) return false

  // Anti-rejeu : refuse les timestamps trop vieux.
  const ts = Number(opts.timestamp)
  const tolerance = opts.toleranceSec ?? 300
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > tolerance) {
    return false
  }

  try {
    const signedPayload = Buffer.from(`${opts.timestamp}|${opts.rawBody}`, 'utf8')
    const signature = Buffer.from(opts.signatureB64, 'base64')
    // La clé publique Telnyx est une clé Ed25519 brute (32 octets) en base64.
    const rawKey = Buffer.from(publicKeyB64, 'base64')
    const keyObject = createPublicKey({
      key: Buffer.concat([
        // Préfixe DER SubjectPublicKeyInfo pour Ed25519.
        Buffer.from('302a300506032b6570032100', 'hex'),
        rawKey,
      ]),
      format: 'der',
      type: 'spki',
    })
    return edVerify(null, signedPayload, keyObject, signature)
  } catch (e) {
    console.log('[v0] verifyWebhookSignature error:', (e as Error).message)
    return false
  }
}

export function isTelnyxConfigured(): boolean {
  return Boolean(process.env.TELNYX_API_KEY)
}
