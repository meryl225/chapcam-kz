import 'server-only'
import type { CanonCountry, CanonService } from '@/lib/numbers/catalog'
import { getUsdToXof, toClientXof } from '@/lib/numbers/pricing'
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
    priceXof: best ? toClientXof(best.costUsd, usdToXof) : null,
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
    try {
      const result = await adapter.purchase(country, service)
      // Certains fournisseurs (sms-man) ne renvoient pas le coût à l'achat :
      // on retombe sur le coût du devis.
      const costUsd = result.costUsd > 0 ? result.costUsd : q.costUsd
      const priceXof = toClientXof(costUsd, usdToXof)
      return { result: { ...result, costUsd }, priceXof, costUsd, usdToXof }
    } catch (e) {
      lastErr = e as Error
      console.log(`[v0] purchase ${q.provider} failed:`, lastErr?.message)
    }
  }
  throw lastErr ?? new Error("L'achat a échoué chez tous les fournisseurs.")
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
