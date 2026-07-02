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

type RefItem = { id: number | string; name?: string; title?: string; code?: string }
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

function findByKeywords(items: RefItem[], keywords: string[]): string | null {
  for (const it of items) {
    const name = normalize(String(it.name ?? it.title ?? ''))
    if (keywords.some((k) => name.includes(normalize(k)))) return String(it.id)
  }
  return null
}

async function resolveIds(country: CanonCountry, service: CanonService) {
  const r = await refs()
  // Pays : résolution par CODE ISO exact (sms-man fournit `code`), bien plus
  // fiable que le matching par nom (ex: "Niger" ⊂ "Nigeria", "Oman" ⊂ "Romania").
  // Repli sur les mots-clés `match` si le code n'est pas trouvé.
  const byCode = r.countries.find((c) => String(c.code ?? '').toUpperCase() === country.code.toUpperCase())
  const countryId = byCode ? String(byCode.id) : findByKeywords(r.countries, country.match)
  const appId = findByKeywords(r.applications, service.match)
  return { countryId, appId }
}

/**
 * sms-man ne renvoie PAS de taux de réussite. On l'estime à partir de la
 * disponibilité (`count` = nombre de numéros en stock) : plus il y a de
 * numéros, plus la probabilité de recevoir le SMS est élevée. Échelle bornée
 * 80–95 % pour rester honnête (jamais 100 %).
 */
function estimateSuccessRate(count: number): number {
  if (!(count > 0)) return 0
  const rate = 80 + Math.floor(Math.log10(count)) * 3
  return Math.max(80, Math.min(95, rate))
}

/** Extrait la première entrée d'une réponse sms-man indexée par id (ou tableau). */
function firstEntry(json: unknown): { cost?: number | string; count?: number | string } | undefined {
  if (Array.isArray(json)) return json[0]
  if (json && typeof json === 'object') return Object.values(json as Record<string, unknown>)[0] as never
  return undefined
}

export const smsman: ProviderAdapter = {
  id: 'smsman',
  name: 'sms-man',

  async quote(country: CanonCountry, service: CanonService): Promise<Quote | null> {
    const { countryId, appId } = await resolveIds(country, service)
    if (!countryId || !appId) return null
    // /get-prices renvoie { "<appId>": { cost, count, ... } } (coût en RUB).
    const { ok, json } = await api('/get-prices', { country_id: countryId, application_id: appId })
    if (!ok || !json) return null
    const entry = firstEntry(json)
    if (!entry) return null
    const cost = Number(entry.cost ?? 0)
    const count = Number(entry.count ?? 0)
    if (!(cost > 0) || count <= 0) return null
    const costUsd = await nativeToUsd(cost, 'RUB')
    return { provider: 'smsman', costUsd, count, successRate: estimateSuccessRate(count) }
  },

  async purchase(country: CanonCountry, service: CanonService): Promise<PurchaseResult> {
    const { countryId, appId } = await resolveIds(country, service)
    if (!countryId || !appId) throw new Error('SMSMAN_UNSUPPORTED: pays/service non disponible')

    // sms-man renvoie souvent "no_numbers, try again" alors que le stock affiché
    // (count de /get-prices) est théorique et pas toujours réel. On réessaie
    // quelques fois pour absorber les indisponibilités transitoires.
    let last: { error_code?: string; error_msg?: string; text?: string } = {}
    for (let attempt = 0; attempt < 4; attempt++) {
      const { ok, json, text } = await api('/get-number', { country_id: countryId, application_id: appId })
      const data = (json ?? {}) as { request_id?: number | string; number?: string; error_code?: string; error_msg?: string }
      if (ok && !data.error_code && data.request_id && data.number) {
        return {
          provider: 'smsman',
          providerOrder: String(data.request_id),
          phone: normalizePhone(data.number),
          costUsd: 0, // facturé via le devis (quote) — coût réel non renvoyé ici
          expiresAt: new Date(Date.now() + 20 * 60 * 1000),
        }
      }
      last = { error_code: data.error_code, error_msg: data.error_msg, text }
      // Solde fournisseur insuffisant : inutile de réessayer.
      if (data.error_code === 'balance') break
      // Stock vide : on retente après un court délai (sauf au dernier tour).
      if (attempt < 3) await new Promise((r) => setTimeout(r, 700))
    }

    // Erreurs typées pour un message client précis (voir route /purchase).
    if (last.error_code === 'balance') throw new Error('SMSMAN_BALANCE: solde fournisseur insuffisant')
    if (last.error_code === 'no_numbers') throw new Error('SMSMAN_NO_NUMBERS: aucun numéro disponible actuellement')
    throw new Error(`sms-man: ${last.error_msg || last.error_code || last.text || 'achat impossible'}`)
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
