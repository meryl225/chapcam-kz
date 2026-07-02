import 'server-only'
import type { CanonCountry, CanonService } from '@/lib/numbers/catalog'
import { getUsdToXof, tierPriceXof } from '@/lib/numbers/pricing'
import { smsman } from './smsman'
import { DEFAULT_SUCCESS_RATE, MIN_SUCCESS_RATE } from './types'
import type { CodeResult, ProviderAdapter, ProviderId, PurchaseResult, Quote } from './types'

export const adapters: Record<ProviderId, ProviderAdapter> = {
  smsman,
}

const ALL = [smsman]

/** Taux de réussite effectif d'un devis (valeur par défaut si non communiquée). */
function effectiveRate(q: Quote): number {
  return typeof q.successRate === 'number' && q.successRate > 0 ? q.successRate : DEFAULT_SUCCESS_RATE
}

/**
 * Classe les devis « prix client, puis qualité » pour viser un taux de réussite
 * SMS d'au moins MIN_SUCCESS_RATE % sans jamais faire payer plus le client :
 *  1. Les offres atteignant le seuil passent avant celles qui ne l'atteignent pas.
 *  2. Au sein de chaque groupe, on trie par PALIER de prix client croissant
 *     (le client paie un prix par paliers : deux coûts du même palier sont
 *     identiques pour lui), puis par taux de réussite décroissant (à prix client
 *     égal, on prend le plus fiable), puis par coût fournisseur croissant.
 * L'ordre obtenu sert au prix affiché ET à l'ordre d'achat (bascule auto).
 */
export function rankQuotes(quotes: Quote[], usdToXof: number): Quote[] {
  const cmp = (a: Quote, b: Quote) =>
    tierPriceXof(a.costUsd, usdToXof) - tierPriceXof(b.costUsd, usdToXof) ||
    effectiveRate(b) - effectiveRate(a) ||
    a.costUsd - b.costUsd
  const eligible = quotes.filter((q) => effectiveRate(q) >= MIN_SUCCESS_RATE).sort(cmp)
  const fallback = quotes.filter((q) => effectiveRate(q) < MIN_SUCCESS_RATE).sort(cmp)
  return [...eligible, ...fallback]
}

export type BestQuote = {
  available: boolean
  priceXof: number | null
  best: Quote | null
  quotes: Quote[]
  usdToXof: number
}

/** Interroge tous les fournisseurs et renvoie le moins cher, prix client en XOF. */
export async function getBestQuote(country: CanonCountry, service: CanonService): Promise<BestQuote> {
  const [usdToXof, results] = await Promise.all([
    getUsdToXof(),
    Promise.all(
      ALL.map((a) =>
        a.quote(country, service).catch((e) => {
          console.log(`[v0] quote ${a.id} failed:`, (e as Error)?.message)
          return null
        }),
      ),
    ),
  ])
  const quotes = rankQuotes(results.filter((q): q is Quote => !!q && q.costUsd > 0), usdToXof)
  const best = quotes[0] ?? null
  return {
    available: !!best,
    priceXof: best ? tierPriceXof(best.costUsd, usdToXof) : null,
    best,
    quotes,
    usdToXof,
  }
}

export type PurchaseOutcome = {
  result: PurchaseResult
  priceXof: number
  costUsd: number
  usdToXof: number
}

/**
 * Achète chez le fournisseur le moins cher ; en cas d'échec, bascule
 * automatiquement vers le suivant. Le prix client (XOF) est figé au moment de
 * l'achat à partir du devis retenu.
 */
export async function purchaseCheapest(country: CanonCountry, service: CanonService): Promise<PurchaseOutcome> {
  const { quotes, usdToXof } = await getBestQuote(country, service)
  if (quotes.length === 0) throw new Error('Aucun fournisseur ne propose ce pays/service actuellement.')

  let lastErr: Error | null = null
  for (const q of quotes) {
    const adapter = adapters[q.provider]
    // PLUS DE PLAFOND ANTI-PERTE : peu importe le coût du fournisseur, ChapCam
    // facture toujours coût réel × 3 (cf. tierPriceXof). On ne peut donc jamais
    // vendre à perte, et on n'a plus besoin d'écarter un fournisseur plus cher.
    // On passe simplement le coût du DEVIS de CE fournisseur comme repère
    // `max_price` (avec une petite tolérance) pour ne pas se voir attribuer un
    // pool "premium" sans rapport avec le tarif annoncé.
    const providerMaxUsd = q.costUsd > 0 ? q.costUsd * 1.2 : undefined
    try {
      const result = await adapter.purchase(country, service, providerMaxUsd)
      // Certains fournisseurs (sms-man) ne renvoient pas le coût à l'achat :
      // on retombe sur le coût du devis.
      const costUsd = result.costUsd > 0 ? result.costUsd : q.costUsd
      // Prix client = coût réel payé × 3 (plancher 2000 FCFA).
      const priceXof = tierPriceXof(costUsd, usdToXof)
      return { result: { ...result, costUsd }, priceXof, costUsd, usdToXof }
    } catch (e) {
      lastErr = e as Error
      console.log(`[v0] purchase ${q.provider} failed:`, lastErr?.message)
    }
  }
  // Détail technique (fournisseur, coûts, plafond) en logs serveur seulement ;
  // on lance une erreur classifiée pour un message client précis.
  if (lastErr) console.log('[v0] purchase: tous les fournisseurs ont échoué:', lastErr.message)
  if (lastErr?.message.includes('SMSMAN_NO_NUMBERS')) throw new Error('NO_NUMBERS')
  if (lastErr?.message.includes('SMSMAN_BALANCE')) throw new Error('PROVIDER_BALANCE')
  throw new Error('NUMBER_UNAVAILABLE')
}

/** Devis de LOCATION : interroge les fournisseurs supportant la location. */
export async function getRentQuote(
  country: CanonCountry,
  service: CanonService,
  minHours: number,
): Promise<BestQuote> {
  const renters = ALL.filter((a) => typeof a.rentQuote === 'function' && typeof a.rent === 'function')
  const [usdToXof, results] = await Promise.all([
    getUsdToXof(),
    Promise.all(
      renters.map((a) =>
        a.rentQuote!(country, service, minHours).catch((e) => {
          console.log(`[v0] rentQuote ${a.id} failed:`, (e as Error)?.message)
          return null
        }),
      ),
    ),
  ])
  const quotes = rankQuotes(results.filter((q): q is Quote => !!q && q.costUsd > 0), usdToXof)
  const best = quotes[0] ?? null
  return {
    available: !!best,
    priceXof: best ? tierPriceXof(best.costUsd, usdToXof) : null,
    best,
    quotes,
    usdToXof,
  }
}

/** Loue chez le fournisseur le moins cher ; bascule auto en cas d'échec. */
export async function rentCheapest(
  country: CanonCountry,
  service: CanonService,
  minHours: number,
): Promise<PurchaseOutcome> {
  const { quotes, usdToXof } = await getRentQuote(country, service, minHours)
  if (quotes.length === 0) throw new Error('Aucun fournisseur ne propose la location pour ce pays/service.')

  let lastErr: Error | null = null
  for (const q of quotes) {
    const adapter = adapters[q.provider]
    if (!adapter.rent) continue
    // Plus de plafond : on facture coût réel × 3 (cf. purchaseCheapest).
    const providerMaxUsd = q.costUsd > 0 ? q.costUsd * 1.2 : undefined
    try {
      const result = await adapter.rent(country, service, minHours, providerMaxUsd)
      const costUsd = result.costUsd > 0 ? result.costUsd : q.costUsd
      const priceXof = tierPriceXof(costUsd, usdToXof)
      return { result: { ...result, costUsd }, priceXof, costUsd, usdToXof }
    } catch (e) {
      lastErr = e as Error
      console.log(`[v0] rent ${q.provider} failed:`, lastErr?.message)
    }
  }
  if (lastErr) console.log('[v0] location: tous les fournisseurs ont échoué:', lastErr.message)
  throw new Error('NUMBER_UNAVAILABLE')
}

export async function getCodeFor(provider: ProviderId, order: string): Promise<CodeResult> {
  return adapters[provider].getCode(order)
}

export async function cancelFor(provider: ProviderId, order: string): Promise<void> {
  return adapters[provider].cancel(order)
}

export async function finishFor(provider: ProviderId, order: string): Promise<void> {
  const a = adapters[provider]
  if (a.finish) await a.finish(order)
}
