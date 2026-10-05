import { Platform } from 'react-native'
import Constants from 'expo-constants'
import Purchases, { PRODUCT_CATEGORY, PURCHASES_ERROR_CODE } from 'react-native-purchases'
import { apiJson } from './api'

export const OFFERING_ID = 'sale'

const API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? Constants.expoConfig?.extra?.revenueCatIosApiKey

let configuredFor = null

// TEMPORAIRE (diagnostic TestFlight) : console.error car console.log/warn ne
// sont pas transmis aux logs natifs iOS en build release.
const diagLog = []
const diag = (label, value) => {
  const text = typeof value === 'string' ? value : JSON.stringify(value)
  diagLog.push(`${label}: ${text}`)
  if (diagLog.length > 60) diagLog.shift()
  console.error(`[RC-DIAG] ${label}:`, text)
}

// TEMPORAIRE : diagnostic affiché à l'écran sous l'erreur (lisible sans Mac).
export const getRevenueCatDiagnostics = () => diagLog.slice(-60).join('\n')
export const resetRevenueCatDiagnostics = () => {
  diagLog.length = 0
}

const describeError = (error) => ({
  message: error?.message,
  code: error?.code,
  readableErrorCode: error?.readableErrorCode,
  underlyingErrorMessage: error?.underlyingErrorMessage,
})

// RevenueCat est identifie par l'id Supabase : le serveur relit les achats de
// ce meme identifiant, donc un achat ne peut etre credite qu'a ce compte.
export async function ensureRevenueCat(userId) {
  if (Platform.OS !== 'ios') throw new Error('unsupported')
  diag('API key prefix', API_KEY ? `${API_KEY.slice(0, 5)}... (len ${API_KEY.length})` : 'ABSENTE')
  diag('Bundle ID', Constants.expoConfig?.ios?.bundleIdentifier ?? 'inconnu')
  if (!API_KEY) {
    diag('RevenueCat configured', false)
    throw new Error('Clé RevenueCat iOS manquante (EXPO_PUBLIC_REVENUECAT_IOS_API_KEY)')
  }
  if (configuredFor === userId) return
  if (configuredFor === null) {
    Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG)
    Purchases.configure({ apiKey: API_KEY, appUserID: userId })
    diag('RevenueCat configured', await Purchases.isConfigured().catch(() => 'inconnu'))
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
    diag('offerings disponibles', Object.keys(offerings?.all ?? {}))
    diag('offering courante (dashboard)', offerings?.current?.identifier ?? 'aucune')
    diag('offering utilisee', offering?.identifier ?? 'aucune')
    diag('nombre de packages', offering?.availablePackages?.length ?? 0)
    diag('Product IDs recus', (offering?.availablePackages ?? []).map((p) => p?.product?.identifier))
    for (const pkg of offering?.availablePackages ?? []) {
      const id = pkg?.product?.identifier
      if (productIds.includes(id)) byId[id] = { product: pkg.product, pkg }
    }
  } catch (error) {
    diag('getOfferings() erreur', describeError(error))
  }
  const missing = productIds.filter((id) => !byId[id])
  if (missing.length > 0) {
    diag('Product IDs absents de l offering', missing)
    try {
      const products = await Purchases.getProducts(
        missing,
        category === 'subs' ? PRODUCT_CATEGORY.SUBSCRIPTION : PRODUCT_CATEGORY.NON_SUBSCRIPTION,
      )
      diag('getProducts() recus', (products ?? []).map((p) => p.identifier))
      for (const product of products ?? []) byId[product.identifier] = { product, pkg: null }
    } catch (error) {
      diag('getProducts() erreur', describeError(error))
      throw error
    }
  }
  if (category !== 'subs') await probeEachProduct(productIds, byId)
  return byId
}

// TEMPORAIRE (diagnostic) : interroge StoreKit produit par produit pour isoler
// ceux qu'Apple ne renvoie pas, sans modifier la sélection utilisée à l'achat.
async function probeEachProduct(productIds, byId) {
  for (const id of productIds) {
    const source = byId[id] ? (byId[id].pkg ? 'offering' : 'getProducts') : 'ABSENT'
    try {
      const single = await Purchases.getProducts([id], PRODUCT_CATEGORY.NON_SUBSCRIPTION)
      const found = (single ?? []).map((p) => `${p.identifier} ${p.priceString} (${p.productCategory ?? p.productType ?? '?'})`)
      diag(`[${id}] source=${source} getProducts([id])`, found.length ? found : 'VIDE (Apple ne renvoie pas ce produit)')
    } catch (error) {
      diag(`[${id}] source=${source} getProducts([id]) erreur`, describeError(error))
    }
  }
}

// TEMPORAIRE (diagnostic) : getProducts() direct, un abonnement à la fois.
// Lecture seule : n'alimente ni l'offering ni la sélection utilisée à l'achat.
export async function probeSubscriptionProducts(productIds) {
  for (const id of productIds) {
    try {
      const products = await Purchases.getProducts([id], PRODUCT_CATEGORY.SUBSCRIPTION)
      const product = (products ?? []).find((p) => p?.identifier === id) ?? products?.[0]
      if (!product) {
        diag(`[SUB ${id}]`, 'ABSENT (getProducts a renvoye une liste vide)')
        continue
      }
      diag(
        `[SUB ${id}]`,
        `FOUND prix=${product.priceString ?? '?'} productIdentifier=${product.identifier} type=${product.productType ?? product.productCategory ?? '?'}`,
      )
    } catch (error) {
      diag(`[SUB ${id}] ABSENT erreur`, describeError(error))
    }
  }
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
