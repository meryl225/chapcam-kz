import 'server-only'

// Marge ChapCam : prix client = coût fournisseur × 3 (200% de bénéfice garanti).
export const MARKUP_MULTIPLIER = 3

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

// ------------------------------------------------------------
// Tarification ChapCam (source de vérité du prix client).
// Modèle simple et rentable : MULTIPLICATEUR UNIQUE sur le coût fournisseur.
//   prix client (FCFA) = coût fournisseur (USD) × taux USD→FCFA × 3
//   ... jamais en dessous d'un plancher de 2000 FCFA.
// Le coût fournisseur retenu est toujours le moins cher disponible
// (cf. getBestQuote qui trie par costUsd croissant), donc la marge ×3
// s'applique au meilleur coût d'achat possible.
// ------------------------------------------------------------
export const PRICE_TIERS = {
  // Marge appliquée à TOUS les numéros (chers comme bon marché).
  multiplier: MARKUP_MULTIPLIER,
  // Prix client minimum affiché, même quand le coût fournisseur est quasi nul.
  floorXof: 2000,
} as const

/** Prix client XOF = coût fournisseur USD × taux × marge, plancher 2000 FCFA. */
export function tierPriceXof(costUsd: number, usdToXof: number): number {
  const raw = costUsd * usdToXof * PRICE_TIERS.multiplier
  // Arrondi au multiple de 5 FCFA supérieur, plancher 2000 FCFA.
  return Math.max(PRICE_TIERS.floorXof, Math.ceil(raw / 5) * 5)
}

/**
 * Coût fournisseur MAXIMUM (en USD) que l'on accepte de payer pour rester
 * rentable au `displayedPriceXof` affiché. Envoyé comme plafond (`max_price`)
 * au fournisseur à l'achat : il ne nous assignera jamais un numéro plus cher,
 * ce qui évite de perdre de l'argent sur un pool "premium".
 *   coût max = prix affiché / (taux × marge)
 * (au plancher 2000 FCFA, le coût correspondant peut dépasser le coût réel :
 *  c'est voulu, on accepte jusqu'à ce que la marge ×3 soit atteinte.)
 */
export function tierMaxCostUsd(displayedPriceXof: number, usdToXof: number): number {
  return displayedPriceXof / (usdToXof * PRICE_TIERS.multiplier)
}
