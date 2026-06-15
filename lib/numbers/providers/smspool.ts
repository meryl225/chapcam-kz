import 'server-only'
import { normalize, type CanonCountry, type CanonService } from '@/lib/numbers/catalog'
import type { CodeResult, ProviderAdapter, PurchaseResult, Quote } from './types'
import { normalizePhone } from './types'

const BASE = 'https://api.smspool.net'

function key() {
  return process.env.SMSPOOL_API_KEY ?? ''
}

async function post(path: string, fields: Record<string, string> = {}) {
  const body = new FormData()
  body.append('key', key())
  for (const [k, v] of Object.entries(fields)) body.append(k, v)
  const res = await fetch(`${BASE}${path}`, { method: 'POST', body, cache: 'no-store' })
  const text = await res.text()
  let json: unknown = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = text
  }
  return { ok: res.ok, json, text }
}

type RefItem = { ID?: number | string; id?: number | string; name?: string; short_name?: string }
type RefCache = { countries: RefItem[]; services: RefItem[]; at: number } | null
let refCache: RefCache = null
const REF_TTL = 12 * 60 * 60 * 1000

function asList(json: unknown): RefItem[] {
  if (Array.isArray(json)) return json as RefItem[]
  if (json && typeof json === 'object') return Object.values(json as Record<string, RefItem>)
  return []
}

function idOf(it: RefItem): string {
  return String(it.ID ?? it.id ?? '')
}

/** Normalise un taux de réussite vers une échelle 0-100, ou undefined si inconnu. */
function parseRate(raw: unknown): number | undefined {
  if (raw == null) return undefined
  const n = Number(String(raw).replace('%', '').trim())
  if (!Number.isFinite(n) || n <= 0) return undefined
  // Une valeur <= 1 est probablement une fraction (0.72 -> 72%).
  return n <= 1 ? n * 100 : Math.min(100, n)
}

async function refs() {
  if (refCache && Date.now() - refCache.at < REF_TTL) return refCache
  const [c, s] = await Promise.all([post('/country/retrieve_all'), post('/service/retrieve_all')])
  refCache = { countries: asList(c.json), services: asList(s.json), at: Date.now() }
  return refCache
}

async function resolveIds(country: CanonCountry, service: CanonService) {
  const r = await refs()
  let countryId: string | null = null
  for (const it of r.countries) {
    const short = normalize(String(it.short_name ?? ''))
    const name = normalize(String(it.name ?? ''))
    if (short === normalize(country.code) || country.match.some((k) => name.includes(normalize(k)))) {
      countryId = idOf(it)
      break
    }
  }
  let serviceId: string | null = null
  for (const it of r.services) {
    const name = normalize(String(it.name ?? ''))
    if (service.match.some((k) => name.includes(normalize(k)))) {
      serviceId = idOf(it)
      break
    }
  }
  return { countryId, serviceId }
}

export const smspool: ProviderAdapter = {
  id: 'smspool',
  name: 'SMSPool',

  async quote(country: CanonCountry, service: CanonService): Promise<Quote | null> {
    // Sans cle API, SMSPool ne peut pas vendre : on ne le propose pas du tout
    // (sinon il apparait "disponible" via l'endpoint prix public puis echoue a l'achat).
    if (!key()) return null
    const { countryId, serviceId } = await resolveIds(country, service)
    if (!countryId || !serviceId) return null
    const { ok, json } = await post('/request/price', { country: countryId, service: serviceId })
    if (!ok || !json || typeof json !== 'object') return null
    const data = json as { price?: number | string; success?: number; success_rate?: number | string }
    const cost = Number(data.price ?? 0)
    if (!(cost > 0)) return null
    // smspool facture en USD. On capte le taux de réussite annoncé (0-100) pour
    // le scoring qualité côté sélection.
    return { provider: 'smspool', costUsd: cost, count: 1, successRate: parseRate(data.success_rate ?? data.success) }
  },

  async purchase(country: CanonCountry, service: CanonService, maxCostUsd?: number): Promise<PurchaseResult> {
    if (!key()) throw new Error('SMSPool: clé API non configurée (SMSPOOL_API_KEY)')
    const { countryId, serviceId } = await resolveIds(country, service)
    if (!countryId || !serviceId) throw new Error('SMSPool: pays/service non disponible')
    const fields: Record<string, string> = { country: countryId, service: serviceId }
    // Plafond anti-perte : SMSPool n'assignera jamais un numéro dont le coût
    // dépasse `max_price` (USD), évitant qu'un pool "premium" coûte plus que le
    // prix affiché au client. Si rien n'est dispo sous ce plafond, l'achat échoue
    // (le client est alors invité à réessayer / changer de pays).
    if (typeof maxCostUsd === 'number' && maxCostUsd > 0) {
      fields.max_price = maxCostUsd.toFixed(2)
    }
    const { ok, json, text } = await post('/purchase/sms', fields)
    const data = (json ?? {}) as {
      success?: number
      number?: string
      phonenumber?: string
      cost?: number | string
      order_id?: string
      orderid?: string
      message?: string
    }
    const order = data.order_id ?? data.orderid
    const phone = data.number ?? data.phonenumber
    if (!ok || data.success !== 1 || !order || !phone) {
      throw new Error(`SMSPool: ${data.message || text || 'achat impossible'}`)
    }
    return {
      provider: 'smspool',
      providerOrder: String(order),
      phone: normalizePhone(phone),
      costUsd: Number(data.cost ?? 0),
      expiresAt: new Date(Date.now() + 20 * 60 * 1000),
    }
  },

  async getCode(providerOrder: string): Promise<CodeResult> {
    const { json } = await post('/sms/check', { orderid: providerOrder })
    const data = (json ?? {}) as { status?: number | string; sms?: string; full_sms?: string }
    if (data.sms) return { status: 'received', code: data.sms, fullSms: data.full_sms ?? data.sms }
    const status = Number(data.status)
    // 6 = refunded/expired, 0 = cancelled
    if (status === 6 || status === 0) return { status: 'cancelled' }
    return { status: 'waiting' }
  },

  async cancel(providerOrder: string): Promise<void> {
    await post('/sms/cancel', { orderid: providerOrder })
  },
}
