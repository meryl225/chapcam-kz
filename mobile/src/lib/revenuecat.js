import { Platform } from 'react-native'
import Constants from 'expo-constants'
import Purchases, { PRODUCT_CATEGORY, PURCHASES_ERROR_CODE, STORE_REPLACEMENT_MODE } from 'react-native-purchases'
import { apiJson } from './api'
import { IAP_SUPPORTED, IS_ANDROID, STORE } from './iap'

export const OFFERING_ID = 'sale'

const extra = Constants.expoConfig?.extra ?? {}
// Cle publique RevenueCat propre a chaque store : appl_… pour iOS, goog_… pour Android.
const API_KEY = Platform.OS === 'android'
  ? process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY ?? extra.revenueCatAndroidApiKey
  : process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? extra.revenueCatIosApiKey
const KEY_NAME = Platform.OS === 'android' ? 'EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY' : 'EXPO_PUBLIC_REVENUECAT_IOS_API_KEY'

let configuredFor = null

// RevenueCat est identifie par l'id Supabase : le serveur relit les achats de
// ce meme identifiant, donc un achat ne peut etre credite qu'a ce compte.
export async function ensureRevenueCat(userId) {
  if (!IAP_SUPPORTED) throw new Error('unsupported')
  if (!API_KEY) throw new Error(`Clé RevenueCat ${Platform.OS} manquante (${KEY_NAME})`)
  if (configuredFor === null) {
    Purchases.configure({ apiKey: API_KEY, appUserID: userId })
    configuredFor = userId
  }
  // Jamais d'achat sous un identifiant anonyme ou celui d'un autre compte.
  const current = await Purchases.getAppUserID()
  if (current !== userId) {
    await Purchases.logIn(userId)
  }
  configuredFor = userId
}

export async function logOutRevenueCat() {
  if (configuredFor === null) return
  try {
    await Purchases.logOut()
  } catch {
    // Deja anonyme : rien a faire.
  }
  configuredFor = null
}

// Produits Apple (prix localises) pour les ids demandes : d'abord l'offering
// « sale », puis lecture directe des produits absents de l'offering.
export async function loadStoreProducts(productIds, category, offeringId = OFFERING_ID) {
  const byId = {}
  try {
    const offerings = await Purchases.getOfferings()
    const offering = offerings?.all?.[offeringId] ?? offerings?.current
    for (const pkg of offering?.availablePackages ?? []) {
      const id = pkg?.product?.identifier
      if (productIds.includes(id)) byId[id] = { product: pkg.product, pkg }
    }
  } catch {
    // Offering indisponible : lecture directe des produits ci-dessous.
  }
  const missing = productIds.filter((id) => !byId[id])
  if (missing.length > 0) {
    // Google Play attend l'id d'abonnement seul et renvoie « abonnement:offre de base ».
    const query = IS_ANDROID ? [...new Set(missing.map((id) => id.split(':')[0]))] : missing
    const products = await Purchases.getProducts(
      query,
      category === 'subs' ? PRODUCT_CATEGORY.SUBSCRIPTION : PRODUCT_CATEGORY.NON_SUBSCRIPTION,
    )
    for (const product of products ?? []) {
      if (missing.includes(product.identifier)) byId[product.identifier] = { product, pkg: null }
    }
  }
  return byId
}

// Sur Google Play, un nouvel abonnement remplace celui deja actif (changement
// de forfait) au lieu d'en facturer un second en parallele.
async function googleChangeInfo(productIdentifier, subscriptionIds) {
  if (!IS_ANDROID || !subscriptionIds) return null
  const info = await Purchases.getCustomerInfo()
  const target = productIdentifier.split(':')[0]
  const current = (info?.activeSubscriptions ?? [])
    .map((id) => id.split(':')[0])
    .find((id) => id !== target && subscriptionIds.some((s) => s.split(':')[0] === id))
  return current ? { oldProductIdentifier: current, replacementMode: STORE_REPLACEMENT_MODE.WITHOUT_PRORATION } : null
}

export async function purchaseStoreItem(item, subscriptionIds) {
  const change = await googleChangeInfo(item.product.identifier, subscriptionIds)
  return item.pkg
    ? Purchases.purchasePackage(item.pkg, null, change)
    : Purchases.purchaseStoreProduct(item.product, change)
}

export const restoreRevenueCat = () => Purchases.restorePurchases()

export async function openManageSubscriptions() {
  await Purchases.showManageSubscriptions()
}

export const isCancelled = (error) =>
  Boolean(error?.userCancelled) || error?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR

export function purchaseErrorMessage(error) {
  switch (error?.code) {
    case PURCHASES_ERROR_CODE.NETWORK_ERROR:
      return `Connexion à ${STORE.name} impossible. Vérifie ta connexion et réessaie.`
    case PURCHASES_ERROR_CODE.PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR:
      return `Ce produit n'est pas disponible sur ${STORE.name} pour le moment.`
    case PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR:
      return `Le paiement est en attente d'approbation. Il sera validé automatiquement dès que ${STORE.company} le confirme.`
    case PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR:
      return "Les achats intégrés ne sont pas autorisés sur cet appareil."
    case PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR:
      return `Ce produit est déjà actif sur ton ${STORE.account}. Utilise « Restaurer les achats ».`
    default:
      return `Le paiement ${STORE.name} n'a pas abouti. Aucun montant n'a été débité si l'achat n'a pas été confirmé.`
  }
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Demande au serveur de relire les achats confirmes chez RevenueCat.
// `until` permet de patienter quelques secondes le temps que RevenueCat
// enregistre une transaction qui vient d'etre validee par Apple.
export async function syncPurchases(source = 'purchase', until) {
  let last = null
  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (attempt > 0) await wait(Math.min(1500 * attempt, 5000))
    const { response, body } = await apiJson('/api/mobile/iap/revenuecat/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source }),
    })
    if (!response.ok || !Array.isArray(body?.items)) {
      throw new Error(body?.error || `Erreur HTTP ${response.status}`)
    }
    last = body
    if (!until || until(body)) return body
  }
  return last
}
