import 'server-only'

// Marge ChapCam : +1000% de bénéfice => prix client = coût × 11.
export const MARKUP_MULTIPLIER = 11

// Taux de secours si l'API de change est indisponible (unités par 1 USD).
const FALLBACK = { XOF: 600, RUB: 90 }

let cached: { rates: Record<string, number>; at: number } | null = null
const RATE_TTL = 6 * 60 * 60 * 1000 // 6 h

/** Récupère les taux live (unités de devise par 1 USD), cache 6 h. */
async function getRates(): Promise<Record<string, number>> {
  if (cached && Date.now() - cached.at < RATE_TTL) return cached.rates
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', { next: { revalidate: 21600 } })
    if (res.ok) {
      const data = (await res.json()) as { result?: string; rates?: Record<string, number> }
      if (data.result === 'success' && data.rates?.XOF && data.rates?.RUB) {
        cached = { rates: data.rates, at: Date.now() }
        return data.rates
      }
    }
  } catch {
    // repli
  }
  cached = { rates: { ...FALLBACK }, at: Date.now() }
  return cached.rates
}

export async function getUsdToXof(): Promise<number> {
  const r = await getRates()
  return r.XOF ?? FALLBACK.XOF
}

export type NativeCurrency = 'USD' | 'RUB'

/** Convertit un coût exprimé dans la devise du fournisseur vers l'USD. */
export async function nativeToUsd(cost: number, currency: NativeCurrency): Promise<number> {
  if (currency === 'USD') return cost
  const r = await getRates()
  const perUsd = r[currency] ?? FALLBACK[currency]
  return cost / perUsd
}

/** Convertit un coût fournisseur (USD) en prix client XOF, marge incluse. */
export function toClientXof(costUsd: number, usdToXof: number): number {
  const raw = costUsd * usdToXof * MARKUP_MULTIPLIER
  // Arrondi au multiple de 5 XOF supérieur, prix plancher 50 XOF.
  return Math.max(50, Math.ceil(raw / 5) * 5)
}
