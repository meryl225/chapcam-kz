import 'server-only'
import type { CanonCountry, CanonService } from '@/lib/numbers/catalog'
import { getUsdToXof, tierMaxCostUsd, tierPriceXof } from '@/lib/numbers/pricing'
import { fivesim } from './fivesim'
import { smsman } from './smsman'
import { smspool } from './smspool'
import type { CodeResult, ProviderAdapter, ProviderId, PurchaseResult, Quote } from './types'

export const adapters: Record<ProviderId, ProviderAdapter> = {
  fivesim,
  smsman,
  smspool,
}

const ALL = [fivesim, smsman, smspool]

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
  const quotes = results.filter((q): q is Quote => !!q && q.costUsd > 0)
  quotes.sort((a, b) => a.costUsd - b.costUsd)
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

  // Prix client AFFICHÉ = palier du devis le moins cher (= ce que voit l'utilisateur
  // dans le popup de confirmation). On le fige ici pour ne JAMAIS facturer plus que
  // le prix annoncé, même si le coût réel renvoyé par le fournisseur à l'achat
  // franchit un palier supérieur (ex: devis 0,08 $ -> 2000 FCFA, mais achat
  // facturé 0,15 $ qui tomberait sinon dans le palier 5000 FCFA).
  const displayedPriceXof = tierPriceXof(quotes[0].costUsd, usdToXof)
  // Coût fournisseur max accepté pour rester rentable au prix affiché.
  const maxCostUsd = tierMaxCostUsd(displayedPriceXof, usdToXof)

  let lastErr: Error | null = null
  for (const q of quotes) {
    const adapter = adapters[q.provider]
    try {
      const result = await adapter.purchase(country, service, maxCostUsd)
      // Certains fournisseurs (sms-man) ne renvoient pas le coût à l'achat :
      // on retombe sur le coût du devis.
      const costUsd = result.costUsd > 0 ? result.costUsd : q.costUsd
      // Garde-fou final : si malgré le plafond le coût réel dépasse ce qu'on
      // accepte (fournisseur ne respectant pas max_price), on annule pour ne pas
      // vendre à perte, puis on tente le fournisseur suivant.
      if (costUsd > maxCostUsd * 1.05) {
        await adapter.cancel(result.providerOrder).catch(() => {})
        throw new Error(`Coût réel ${costUsd}$ > plafond ${maxCostUsd}$ — achat annulé`)
      }
      // On facture le prix affiché au client (jamais davantage).
      const priceXof = Math.min(displayedPriceXof, tierPriceXof(costUsd, usdToXof))
      return { result: { ...result, costUsd }, priceXof, costUsd, usdToXof }
    } catch (e) {
      lastErr = e as Error
      console.log(`[v0] purchase ${q.provider} failed:`, lastErr?.message)
    }
  }
  throw lastErr ?? new Error("L'achat a échoué chez tous les fournisseurs.")
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
  const quotes = results.filter((q): q is Quote => !!q && q.costUsd > 0)
  quotes.sort((a, b) => a.costUsd - b.costUsd)
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

  // Prix affiché = palier du devis le moins cher : on ne facture jamais plus.
  const displayedPriceXof = tierPriceXof(quotes[0].costUsd, usdToXof)
  const maxCostUsd = tierMaxCostUsd(displayedPriceXof, usdToXof)

  let lastErr: Error | null = null
  for (const q of quotes) {
    const adapter = adapters[q.provider]
    if (!adapter.rent) continue
    try {
      const result = await adapter.rent(country, service, minHours, maxCostUsd)
      const costUsd = result.costUsd > 0 ? result.costUsd : q.costUsd
      if (costUsd > maxCostUsd * 1.05) {
        await adapter.cancel(result.providerOrder).catch(() => {})
        throw new Error(`Coût réel ${costUsd}$ > plafond ${maxCostUsd}$ — location annulée`)
      }
      const priceXof = Math.min(displayedPriceXof, tierPriceXof(costUsd, usdToXof))
      return { result: { ...result, costUsd }, priceXof, costUsd, usdToXof }
    } catch (e) {
      lastErr = e as Error
      console.log(`[v0] rent ${q.provider} failed:`, lastErr?.message)
    }
  }
  throw lastErr ?? new Error('La location a échoué chez tous les fournisseurs.')
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
