import { Platform } from 'react-native'
import { apiJson } from './api'

export const IS_ANDROID = Platform.OS === 'android'
export const IAP_SUPPORTED = Platform.OS === 'ios' || IS_ANDROID

// Libelles du store natif : Apple In-App Purchase sur iOS, Google Play Billing sur Android.
export const STORE = IS_ANDROID
  ? { name: 'Google Play', company: 'Google', account: 'compte Google', prefix: 'google' }
  : { name: 'App Store', company: 'Apple', account: 'compte Apple', prefix: 'apple' }

// Identifiant du produit pour le store de l'appareil (jamais un id Apple sur Android).
export const skuOf = (item) => (IS_ANDROID ? item?.androidProductId : item?.productId) ?? null

// Product IDs App Store Connect, alignes sur lib/apple-iap.ts et lib/revenuecat.ts.
const IOS_SUBSCRIPTION_IDS = [
  'com.chapcam.app.subscription.testeur.weekly',
  'com.chapcam.app.subscription.starter.monthly',
  'com.chapcam.app.subscription.premium.quarterly',
  'com.chapcam.app.subscription.vippro.yearly',
  'com.chapcam.app.subscription.vipdebout.yearly',
]

// Google Play : « abonnement:offre de base », alignes sur GOOGLE_PLAY_SUBSCRIPTIONS.
const ANDROID_SUBSCRIPTION_IDS = [
  'chapcam_testeur:weekly',
  'chapcam_starter:monthly',
  'chapcam_premium:quarterly',
  'chapcam_vippro:yearly',
  'chapcam_vipdebout:yearly',
]

export const SUBSCRIPTION_PRODUCT_IDS = IS_ANDROID ? ANDROID_SUBSCRIPTION_IDS : IOS_SUBSCRIPTION_IDS
// Conserve pour les ecrans existants.
export const IOS_PRODUCT_IDS = SUBSCRIPTION_PRODUCT_IDS

export const TOKEN_PRODUCT_IDS = IS_ANDROID
  ? ['chapcam_tokens_100', 'chapcam_tokens_250', 'chapcam_tokens_500', 'chapcam_tokens_1000']
  : ['com.chapcam.app.tokens.100', 'com.chapcam.app.tokens.250', 'com.chapcam.app.tokens.500', 'com.chapcam.app.tokens.1000']

export const MINUTES_OFFERING_ID = 'liveswap_minutes'

export const MINUTE_PRODUCT_IDS = IS_ANDROID
  ? ['chapcam_liveswap_5min', 'chapcam_liveswap_15min', 'chapcam_liveswap_25min']
  : ['com.chapcam.app.liveswap.minutes.5', 'com.chapcam.app.liveswap.minutes.15', 'com.chapcam.app.liveswap.minutes.25']

// Contenu des forfaits et packs (sans prix : ils viennent du store via RevenueCat).
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
