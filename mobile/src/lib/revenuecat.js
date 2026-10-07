import { Platform } from 'react-native'
import Constants from 'expo-constants'
import Purchases, { PRODUCT_CATEGORY, PURCHASES_ERROR_CODE } from 'react-native-purchases'
import { apiJson } from './api'

export const OFFERING_ID = 'sale'

const API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? Constants.expoConfig?.extra?.revenueCatIosApiKey

let configuredFor = null

// RevenueCat est identifie par l'id Supabase : le serveur relit les achats de
// ce meme identifiant, donc un achat ne peut etre credite qu'a ce compte.
export async function ensureRevenueCat(userId) {
  if (Platform.OS !== 'ios') throw new Error('unsupported')
  if (!API_KEY) throw new Error('Clé RevenueCat iOS manquante (EXPO_PUBLIC_REVENUECAT_IOS_API_KEY)')
  if (configuredFor === userId) return
  if (configuredFor === null) {
    Purchases.configure({ apiKey: API_KEY, appUserID: userId })
  } else {
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
export async function loadStoreProducts(productIds, category) {
  const byId = {}
  try {
    const offerings = await Purchases.getOfferings()
    const offering = offerings?.all?.[OFFERING_ID] ?? offerings?.current
    for (const pkg of offering?.availablePackages ?? []) {
      const id = pkg?.product?.identifier
      if (productIds.includes(id)) byId[id] = { product: pkg.product, pkg }
    }
  } catch {
    // Offering indisponible : lecture directe des produits ci-dessous.
  }
  const missing = productIds.filter((id) => !byId[id])
  if (missing.length > 0) {
    const products = await Purchases.getProducts(
      missing,
      category === 'subs' ? PRODUCT_CATEGORY.SUBSCRIPTION : PRODUCT_CATEGORY.NON_SUBSCRIPTION,
    )
    for (const product of products ?? []) byId[product.identifier] = { product, pkg: null }
  }
  return byId
}

export async function purchaseStoreItem(item) {
  return item.pkg ? Purchases.purchasePackage(item.pkg) : Purchases.purchaseStoreProduct(item.product)
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
      return "Connexion à l'App Store impossible. Vérifie ta connexion et réessaie."
    case PURCHASES_ERROR_CODE.PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR:
      return "Ce produit n'est pas disponible sur l'App Store pour le moment."
    case PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR:
      return "Le paiement est en attente d'approbation. Il sera validé automatiquement dès qu'Apple le confirme."
    case PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR:
      return "Les achats intégrés ne sont pas autorisés sur cet appareil."
    default:
      return "Le paiement Apple n'a pas abouti. Aucun montant n'a été débité si l'achat n'a pas été confirmé."
  }
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Demande au serveur de relire les achats confirmes chez RevenueCat.
// `until` permet de patienter quelques secondes le temps que RevenueCat
// enregistre une transaction qui vient d'etre validee par Apple.
export async function syncPurchases(source = 'purchase', until) {
  let last = null
  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (attempt > 0) await wait(1500 * attempt)
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
