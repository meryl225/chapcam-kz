"use client"

import useSWR from "swr"

// -----------------------------------------------------------------------------
// Conversion de prix INDICATIVE pour la page tarifs.
//
// IMPORTANT : le montant reellement debite reste TOUJOURS en XOF (FCFA), qui est
// la source de verite serveur (lib/plans.ts). La conversion ci-dessous sert
// uniquement a AFFICHER un ordre de grandeur dans la devise du visiteur ; la
// passerelle de paiement (GeniusPay / Stripe / Trybit) fait la conversion reelle
// au taux du marche au moment du paiement.
// -----------------------------------------------------------------------------

export interface CurrencyMeta {
  code: string
  label: string
  /** Locale utilisee pour le formatage Intl.NumberFormat. */
  locale: string
}

// Devises proposees dans le selecteur. XOF en premier (devise de reference).
export const CURRENCIES: CurrencyMeta[] = [
  { code: "XOF", label: "FCFA (XOF)", locale: "fr-FR" },
  { code: "EUR", label: "Euro (EUR)", locale: "fr-FR" },
  { code: "USD", label: "Dollar US (USD)", locale: "en-US" },
  { code: "GBP", label: "Livre (GBP)", locale: "en-GB" },
  { code: "CAD", label: "Dollar CA (CAD)", locale: "en-CA" },
  { code: "NGN", label: "Naira (NGN)", locale: "en-NG" },
  { code: "GHS", label: "Cedi (GHS)", locale: "en-GH" },
  { code: "MAD", label: "Dirham (MAD)", locale: "fr-MA" },
  { code: "XAF", label: "FCFA (XAF)", locale: "fr-FR" },
]

// Taux de secours = combien d'unites de la devise valent 1 XOF (units per XOF).
// Utilises si l'API de taux est indisponible. L'EUR et le XAF sont FIXES
// (le XOF est arrime a l'euro : 655,957 XOF = 1 EUR ; XAF = XOF a parite 1:1).
export const FALLBACK_UNITS_PER_XOF: Record<string, number> = {
  XOF: 1,
  XAF: 1,
  EUR: 1 / 655.957, // parite fixe
  USD: 1 / 610,
  GBP: 1 / 775,
  CAD: 1 / 445,
  NGN: 1 / 0.38,
  GHS: 1 / 40,
  MAD: 1 / 61,
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

/**
 * Recupere les taux XOF -> autres devises (units per 1 XOF).
 * Source : open.er-api.com (gratuit, sans cle). Repli sur les taux fixes.
 */
export function useXofRates(): { rates: Record<string, number>; live: boolean } {
  const { data } = useSWR<{ result?: string; rates?: Record<string, number> }>(
    "https://open.er-api.com/v6/latest/XOF",
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 1000 * 60 * 60, // 1h
      shouldRetryOnError: false,
    },
  )

  if (data?.result === "success" && data.rates) {
    // On garde la parite fixe EUR/XAF meme si l'API renvoie autre chose.
    return {
      rates: { ...data.rates, EUR: FALLBACK_UNITS_PER_XOF.EUR, XAF: 1, XOF: 1 },
      live: true,
    }
  }
  return { rates: FALLBACK_UNITS_PER_XOF, live: false }
}

/** Convertit "50.000" (format FR) ou 50000 en nombre XOF. */
export function parseXof(price: string | number): number {
  if (typeof price === "number") return price
  return Number(price.replace(/[^\d]/g, "")) || 0
}

/**
 * Formate un montant XOF converti dans la devise cible.
 * Renvoie null si la cible est XOF (pas de conversion a afficher).
 */
export function formatConverted(
  priceXof: string | number,
  currency: CurrencyMeta,
  rates: Record<string, number>,
): string | null {
  if (currency.code === "XOF") return null
  const rate = rates[currency.code] ?? FALLBACK_UNITS_PER_XOF[currency.code]
  if (!rate) return null

  const amount = parseXof(priceXof) * rate
  // Sans decimales pour les monnaies "grosses" (Naira, XAF) ; 2 sinon.
  const noDecimals = currency.code === "NGN" || currency.code === "XAF"
  try {
    return new Intl.NumberFormat(currency.locale, {
      style: "currency",
      currency: currency.code,
      maximumFractionDigits: noDecimals ? 0 : amount >= 100 ? 0 : 2,
    }).format(amount)
  } catch {
    return `${Math.round(amount)} ${currency.code}`
  }
}

/** Devine la devise probable a partir de la locale du navigateur. */
export function guessCurrency(): string {
  if (typeof navigator === "undefined") return "XOF"
  const loc = (navigator.languages?.[0] || navigator.language || "").toLowerCase()
  const map: Record<string, string> = {
    us: "USD",
    gb: "GBP",
    ca: "CAD",
    ng: "NGN",
    gh: "GHS",
    ma: "MAD",
  }
  const region = loc.split("-")[1]
  if (region && map[region]) return map[region]
  // Zone euro courante -> EUR ; sinon defaut XOF (Afrique de l'Ouest).
  if (/fr|de|es|it|pt|nl|be/.test(loc)) return "EUR"
  return "XOF"
}
