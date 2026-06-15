import 'server-only'
import type { CanonCountry, CanonService } from '@/lib/numbers/catalog'
import { nativeToUsd } from '@/lib/numbers/pricing'
import type { CodeResult, ProviderAdapter, PurchaseResult, Quote } from './types'
import { normalizePhone } from './types'

const BASE = 'https://5sim.net/v1'

function headers() {
  return {
    Authorization: `Bearer ${process.env.FIVESIM_API_KEY ?? ''}`,
    Accept: 'application/json',
  }
}

async function api(path: string) {
  const res = await fetch(`${BASE}${path}`, { headers: headers(), cache: 'no-store' })
  const text = await res.text()
  let json: unknown = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = text
  }
  return { ok: res.ok, status: res.status, json, text }
}

type PriceMap = Record<string, Record<string, Record<string, { cost: number; count: number; rate?: number }>>>

export const fivesim: ProviderAdapter = {
  id: 'fivesim',
  name: '5sim',

  async quote(country: CanonCountry, service: CanonService): Promise<Quote | null> {
    const { ok, json } = await api(`/guest/prices?country=${country.fivesim}&product=${service.fivesim}`)
    if (!ok || !json || typeof json !== 'object') return null
    const map = json as PriceMap
    const products = map[country.fivesim]
    const operators = products?.[service.fivesim]
    if (!operators) return null
    // Choisit l'opérateur le moins cher avec de la disponibilité.
    // Remarque : 5sim expose un champ `rate`, mais sur une échelle peu fiable
    // (souvent 0 même pour des pools à fort stock) ; s'en servir pour choisir
    // l'opérateur conduirait à retenir des numéros absurdement chers. On laisse
    // donc le taux à « inconnu » (neutre) et le scoring qualité s'appuie sur les
    // fournisseurs qui renvoient une vraie valeur (ex: SMSPool).
    let best: { cost: number; count: number } | null = null
    for (const op of Object.values(operators)) {
      if (!op || op.count <= 0) continue
      if (!best || op.cost < best.cost) best = { cost: op.cost, count: op.count }
    }
    if (!best) return null
    const costUsd = await nativeToUsd(best.cost, 'RUB')
    return { provider: 'fivesim', costUsd, count: best.count }
  },

  async purchase(country: CanonCountry, service: CanonService): Promise<PurchaseResult> {
    const { ok, json, text } = await api(`/user/buy/activation/${country.fivesim}/any/${service.fivesim}`)
    if (!ok || !json || typeof json !== 'object') {
      throw new Error(`5sim: achat impossible (${text || 'erreur'})`)
    }
    const data = json as { id?: number | string; phone?: string; price?: number; expires?: string }
    if (!data.id || !data.phone) throw new Error(`5sim: réponse invalide (${text})`)
    const costUsd = await nativeToUsd(Number(data.price ?? 0), 'RUB')
    return {
      provider: 'fivesim',
      providerOrder: String(data.id),
      phone: normalizePhone(data.phone),
      costUsd,
      expiresAt: data.expires ? new Date(data.expires) : null,
    }
  },

  async getCode(providerOrder: string): Promise<CodeResult> {
    const { ok, json } = await api(`/user/check/${providerOrder}`)
    if (!ok || !json || typeof json !== 'object') return { status: 'waiting' }
    const data = json as {
      status?: string
      sms?: { code?: string; text?: string }[]
    }
    const sms = data.sms?.[0]
    if (sms?.code || sms?.text) {
      return { status: 'received', code: sms.code ?? null, fullSms: sms.text ?? null }
    }
    if (data.status === 'CANCELED' || data.status === 'TIMEOUT' || data.status === 'BANNED') {
      return { status: 'cancelled' }
    }
    return { status: 'waiting' }
  },

  async cancel(providerOrder: string): Promise<void> {
    await api(`/user/cancel/${providerOrder}`)
  },

  async finish(providerOrder: string): Promise<void> {
    await api(`/user/finish/${providerOrder}`)
  },

  // --- Location (hosting 5sim) ---
  // 5sim expose les numéros "hosting" via /guest/products/{country}/any
  // (Category === "hosting"). La durée est imposée par 5sim : on tente, et on
  // remonte la durée réelle (champ expires). Indisponible => null/erreur.
  async rentQuote(country: CanonCountry, service: CanonService): Promise<Quote | null> {
    const { ok, json } = await api(`/guest/products/${country.fivesim}/any`)
    if (!ok || !json || typeof json !== 'object') return null
    const products = json as Record<string, { Category?: string; Qty?: number; Price?: number }>
    let best: { cost: number; count: number } | null = null
    for (const [name, p] of Object.entries(products)) {
      if (!p || p.Category !== 'hosting') continue
      if (!name.toLowerCase().includes(service.fivesim.toLowerCase())) continue
      const count = Number(p.Qty ?? 0)
      const cost = Number(p.Price ?? 0)
      if (count <= 0 || cost <= 0) continue
      if (!best || cost < best.cost) best = { cost, count }
    }
    if (!best) return null
    const costUsd = await nativeToUsd(best.cost, 'RUB')
    return { provider: 'fivesim', costUsd, count: best.count }
  },

  async rent(country: CanonCountry, service: CanonService): Promise<PurchaseResult> {
    const { ok, json, text } = await api(`/user/buy/hosting/${country.fivesim}/any/${service.fivesim}`)
    if (!ok || !json || typeof json !== 'object') {
      throw new Error(`5sim: location indisponible (${text || 'erreur'})`)
    }
    const data = json as { id?: number | string; phone?: string; price?: number; expires?: string }
    if (!data.id || !data.phone) throw new Error(`5sim: réponse location invalide (${text})`)
    const costUsd = await nativeToUsd(Number(data.price ?? 0), 'RUB')
    return {
      provider: 'fivesim',
      providerOrder: String(data.id),
      phone: normalizePhone(data.phone),
      costUsd,
      expiresAt: data.expires ? new Date(data.expires) : null,
    }
  },
}
