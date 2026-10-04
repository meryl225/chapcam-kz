import { apiJson } from './api'

// Product IDs App Store Connect, alignes sur lib/apple-iap.ts cote serveur.
export const IOS_PRODUCT_IDS = [
  'com.chapcam.app.subscription.testeur.weekly',
  'com.chapcam.app.subscription.starter.monthly',
  'com.chapcam.app.subscription.premium.quarterly',
  'com.chapcam.app.subscription.vippro.yearly',
  'com.chapcam.app.subscription.vipdebout.yearly',
]

// Statuts pour lesquels le serveur a tranche definitivement : la transaction
// peut etre terminee aupres d'Apple. Sinon on la garde pour la re-verifier.
const SETTLED = new Set(['activated', 'already', 'expired', 'revoked'])
export const isSettled = (status) => SETTLED.has(status)

export async function fetchIosPlans() {
  const { response, body } = await apiJson('/api/mobile/iap/plans')
  if (!response.ok || !Array.isArray(body?.plans)) throw new Error('Forfaits indisponibles')
  return body.plans
}

// Envoie au serveur les transactions StoreKit 2 signees par Apple (JWS).
// Seul le serveur decide si l'abonnement est actif.
export async function verifyPurchases(purchases, source = 'purchase') {
  const transactions = purchases.map((p) => p?.purchaseToken).filter(Boolean)
  if (transactions.length === 0) return { results: [], active: false }
  const { response, body } = await apiJson('/api/mobile/iap/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transactions, source }),
  })
  if (!response.ok || !Array.isArray(body?.results)) {
    throw new Error(body?.error || `Erreur HTTP ${response.status}`)
  }
  return body
}

const PERIOD_LABELS = {
  day: ['jour', 'jours'],
  week: ['semaine', 'semaines'],
  month: ['mois', 'mois'],
  year: ['an', 'ans'],
}

export function periodLabel(product) {
  const unit = String(product?.subscriptionPeriodUnitIOS || '').toLowerCase()
  const count = Number(product?.subscriptionPeriodNumberIOS) || 1
  const labels = PERIOD_LABELS[unit]
  if (!labels) return null
  return count === 1 ? `par ${labels[0]}` : `tous les ${count} ${labels[1]}`
}
