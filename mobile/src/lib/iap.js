import { apiJson } from './api'

// Product IDs App Store Connect, alignes sur lib/apple-iap.ts et lib/revenuecat.ts.
export const IOS_PRODUCT_IDS = [
  'com.chapcam.app.subscription.testeur.weekly',
  'com.chapcam.app.subscription.starter.monthly',
  'com.chapcam.app.subscription.premium.quarterly',
  'com.chapcam.app.subscription.vippro.yearly',
  'com.chapcam.app.subscription.vipdebout.yearly',
]

export const TOKEN_PRODUCT_IDS = [
  'com.chapcam.app.tokens.100',
  'com.chapcam.app.tokens.250',
  'com.chapcam.app.tokens.500',
  'com.chapcam.app.tokens.1000',
]

export const MINUTES_OFFERING_ID = 'liveswap_minutes'

export const MINUTE_PRODUCT_IDS = [
  'com.chapcam.app.liveswap.minutes.5',
  'com.chapcam.app.liveswap.minutes.15',
  'com.chapcam.app.liveswap.minutes.25',
]

// Contenu des forfaits et packs (sans prix : ils viennent d'Apple via RevenueCat).
export async function fetchIosCatalog() {
  const { response, body } = await apiJson('/api/mobile/iap/plans')
  if (!response.ok || !Array.isArray(body?.plans)) throw new Error('Catalogue indisponible')
  return {
    plans: body.plans,
    tokenPacks: Array.isArray(body.tokenPacks) ? body.tokenPacks : [],
    minutePacks: Array.isArray(body.minutePacks) ? body.minutePacks : [],
  }
}

const PERIOD_LABELS = {
  D: ['jour', 'jours'],
  W: ['semaine', 'semaines'],
  M: ['mois', 'mois'],
  Y: ['an', 'ans'],
}

// RevenueCat expose la periode au format ISO 8601 (P1W, P1M, P3M, P1Y).
export function periodLabel(product) {
  const match = /^P(\d+)([DWMY])$/.exec(String(product?.subscriptionPeriod || ''))
  if (!match) return null
  const count = Number(match[1]) || 1
  const labels = PERIOD_LABELS[match[2]]
  return count === 1 ? `par ${labels[0]}` : `tous les ${count} ${labels[1]}`
}
