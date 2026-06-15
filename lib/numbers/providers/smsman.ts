import 'server-only'
import { normalize, type CanonCountry, type CanonService } from '@/lib/numbers/catalog'
import { nativeToUsd } from '@/lib/numbers/pricing'
import type { CodeResult, ProviderAdapter, PurchaseResult, Quote } from './types'
import { normalizePhone } from './types'

const BASE = 'https://api.sms-man.com/control'

function token() {
  return process.env.SMSMAN_API_TOKEN ?? ''
}

async function api(path: string, params: Record<string, string | number> = {}) {
  const qs = new URLSearchParams({ token: token(), ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) })
  const res = await fetch(`${BASE}${path}?${qs.toString()}`, { cache: 'no-store' })
  const text = await res.text()
  let json: unknown = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = text
  }
  return { ok: res.ok, json, text }
}

type RefItem = { id: number | string; name?: string; title?: string }
type RefCache = { countries: RefItem[]; applications: RefItem[]; at: number } | null
let refCache: RefCache = null
const REF_TTL = 12 * 60 * 60 * 1000

function asList(json: unknown): RefItem[] {
  if (Array.isArray(json)) return json as RefItem[]
  if (json && typeof json === 'object') return Object.values(json as Record<string, RefItem>)
  return []
}

async function refs() {
  if (refCache && Date.now() - refCache.at < REF_TTL) return refCache
  const [c, a] = await Promise.all([api('/countries'), api('/applications')])
  refCache = { countries: asList(c.json), applications: asList(a.json), at: Date.now() }
  return refCache
}

function findId(items: RefItem[], keywords: string[]): string | null {
  for (const it of items) {
    const name = normalize(String(it.name ?? it.title ?? ''))
    if (keywords.some((k) => name.includes(normalize(k)))) return String(it.id)
  }
  return null
}

async function resolveIds(country: CanonCountry, service: CanonService) {
  const r = await refs()
  const countryId = findId(r.countries, country.match)
  const appId = findId(r.applications, service.match)
  return { countryId, appId }
}

export const smsman: ProviderAdapter = {
  id: 'smsman',
  name: 'sms-man',

  async quote(country: CanonCountry, service: CanonService): Promise<Quote | null> {
    const { countryId, appId } = await resolveIds(country, service)
    if (!countryId || !appId) return null
    const { ok, json } = await api('/limits', { country_id: countryId, application_id: appId })
    if (!ok || !json) return null
    const list = Array.isArray(json) ? json : [json]
    const entry = list[0] as { cost?: number | string; count?: number | string } | undefined
    if (!entry) return null
    const cost = Number(entry.cost ?? 0)
    const count = Number(entry.count ?? 0)
    if (!(cost > 0) || count <= 0) return null
    const costUsd = await nativeToUsd(cost, 'RUB')
    return { provider: 'smsman', costUsd, count }
  },

  async purchase(country: CanonCountry, service: CanonService): Promise<PurchaseResult> {
    const { countryId, appId } = await resolveIds(country, service)
    if (!countryId || !appId) throw new Error('sms-man: pays/service non disponible')
    const { ok, json, text } = await api('/get-number', { country_id: countryId, application_id: appId })
    const data = (json ?? {}) as { request_id?: number | string; number?: string; error_code?: string; error_msg?: string }
    if (!ok || data.error_code || !data.request_id || !data.number) {
      throw new Error(`sms-man: ${data.error_msg || data.error_code || text || 'achat impossible'}`)
    }
    return {
      provider: 'smsman',
      providerOrder: String(data.request_id),
      phone: normalizePhone(data.number),
      costUsd: 0, // facturé via le devis (quote) — coût réel non renvoyé ici
      expiresAt: new Date(Date.now() + 20 * 60 * 1000),
    }
  },

  async getCode(providerOrder: string): Promise<CodeResult> {
    const { json } = await api('/get-sms', { request_id: providerOrder })
    const data = (json ?? {}) as { sms_code?: string; error_code?: string }
    if (data.sms_code) return { status: 'received', code: data.sms_code, fullSms: data.sms_code }
    if (data.error_code && data.error_code !== 'wait_sms') return { status: 'cancelled' }
    return { status: 'waiting' }
  },

  async cancel(providerOrder: string): Promise<void> {
    await api('/set-status', { request_id: providerOrder, status: 'reject' })
  },

  async finish(providerOrder: string): Promise<void> {
    await api('/set-status', { request_id: providerOrder, status: 'close' })
  },
}
