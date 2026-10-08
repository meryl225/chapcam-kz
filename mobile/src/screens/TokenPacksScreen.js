import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Purchases from 'react-native-purchases'
import { IOS_PRODUCT_IDS, TOKEN_PRODUCT_IDS, fetchIosCatalog } from '../lib/iap'
import {
  ensureRevenueCat,
  isCancelled,
  loadStoreProducts,
  purchaseErrorMessage,
  purchaseStoreItem,
  restoreRevenueCat,
  syncPurchases,
} from '../lib/revenuecat'
import { useJetonsBalance } from '../lib/useJetonsBalance'
import { BRAND, C, PAD } from '../ui/catalog'

const BG = '#F5F7FF'
const NAVY = '#0B1230'
const MUTED_ON_DARK = '#AEB8DA'

const formatJetons = (value) => Number(value).toLocaleString('fr-FR')

export function TokenPacksScreen({ user, onBack, onPurchased }) {
  const insets = useSafeAreaInsets()
  const { jetons, loading: balanceLoading, reload: reloadBalance } = useJetonsBalance()
  const [state, setState] = useState({ status: 'loading', packs: [], products: {} })
  const [busySku, setBusySku] = useState(null)
  const [restoring, setRestoring] = useState(false)
  const onPurchasedRef = useRef(onPurchased)
  onPurchasedRef.current = onPurchased

  const load = useCallback(async () => {
    if (Platform.OS !== 'ios') {
      setState({ status: 'unsupported', packs: [], products: {} })
      return
    }
    setState((s) => ({ ...s, status: 'loading' }))
    try {
      await ensureRevenueCat(user.id)
      const [products, catalog] = await Promise.all([
        loadStoreProducts(TOKEN_PRODUCT_IDS, 'consumable'),
        fetchIosCatalog(),
      ])
      const anyAvailable = catalog.tokenPacks.some((pack) => products[pack.productId])
      setState({ status: anyAvailable ? 'ready' : 'unavailable', packs: catalog.tokenPacks, products })
    } catch (error) {
      console.warn('[iap] Chargement des packs impossible:', error?.message)
      setState({ status: 'error', packs: [], products: {}, errorMessage: `${error?.code ?? ''} ${error?.message ?? String(error)}`.trim() })
    }
  }, [user.id])

  useEffect(() => { load() }, [load])

  const refreshAfterCredit = () => {
    reloadBalance()
    onPurchasedRef.current?.()
  }

  // Les jetons ne sont credites qu'apres relecture serveur de l'achat Apple,
  // une seule fois par transaction.
  const buy = async (pack) => {
    const item = state.products[pack.productId]
    if (!item || busySku || restoring) return
    setBusySku(pack.productId)
    let transactionId = null
    try {
      const purchase = await purchaseStoreItem(item)
      transactionId = purchase?.transaction?.transactionIdentifier || null
    } catch (error) {
      setBusySku(null)
      if (isCancelled(error)) return
      // DIAGNOSTIC TEMPORAIRE : afficher l'erreur RevenueCat/StoreKit brute.
      let appUserID = null
      try {
        appUserID = await Purchases.getAppUserID()
      } catch (idError) {
        appUserID = `indisponible (${idError?.message})`
      }
      const diag = {
        productIdentifier: pack.productId,
        code: error?.code,
        message: error?.message,
        readableErrorCode: error?.readableErrorCode ?? error?.userInfo?.readableErrorCode,
        underlyingErrorMessage: error?.underlyingErrorMessage ?? error?.userInfo?.underlyingErrorMessage,
        userInfo: error?.userInfo,
        appUserID,
      }
      console.log('[iap-diag] erreur achat jetons', JSON.stringify(diag, null, 2))
      Alert.alert(
        'Paiement non effectué (diagnostic)',
        [
          `PRODUCT ID : ${diag.productIdentifier}`,
          `ERROR CODE : ${diag.code} (${diag.readableErrorCode ?? '-'})`,
          `ERROR MESSAGE : ${diag.message ?? '-'}`,
          `UNDERLYING ERROR : ${diag.underlyingErrorMessage ?? '-'}`,
          `APP USER ID : ${diag.appUserID}`,
          `USER INFO : ${JSON.stringify(diag.userInfo ?? null)}`,
        ].join('\n\n'),
      )
      return
    }
    const isThisPurchase = (i) => i.productId === pack.productId && (!transactionId || i.transactionId === `apple:${transactionId}`)
    try {
      const result = await syncPurchases('purchase', (body) => body.items.some(isThisPurchase))
      if (result.items.some(isThisPurchase)) {
        refreshAfterCredit()
        Alert.alert('Jetons ajoutés', `${formatJetons(pack.jetons)} jetons ont été ajoutés à ton solde.`)
      } else {
        Alert.alert('Vérification en cours', "Ton paiement Apple est enregistré. Tes jetons seront ajoutés dans quelques instants, ou via « Restaurer les achats ».")
      }
    } catch (error) {
      console.warn('[iap] Verification serveur impossible:', error?.message)
      Alert.alert(
        'Vérification en attente',
        "Ton paiement Apple est enregistré, mais nous n'avons pas pu le vérifier. Tes jetons seront ajoutés automatiquement, ou via « Restaurer les achats ».",
      )
    } finally {
      setBusySku(null)
    }
  }

  const restore = async () => {
    if (restoring || busySku) return
    setRestoring(true)
    try {
      await ensureRevenueCat(user.id)
      await restoreRevenueCat()
      const result = await syncPurchases('restore')
      const credited = result.items.filter((i) => i.status === 'credited').reduce((sum, i) => sum + (i.jetons || 0), 0)
      refreshAfterCredit()
      Alert.alert(
        'Achats vérifiés',
        credited > 0
          ? `${formatJetons(credited)} jetons en attente ont été ajoutés à ton solde.`
          : 'Tous tes achats de jetons sont déjà crédités sur ton compte.',
      )
    } catch (error) {
      if (isCancelled(error)) return
      Alert.alert('Restauration impossible', 'Impossible de vérifier tes achats pour le moment. Réessaie dans quelques instants.')
    } finally {
      setRestoring(false)
    }
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={onBack} hitSlop={12} style={styles.back}>
          <Ionicons name="chevron-back" size={22} color={C.ink} />
        </Pressable>
        <Text style={styles.headerTitle} accessibilityRole="header">Ajouter des Jetons</Text>
        <View style={styles.back} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 40 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        <View style={styles.balance}>
          <Text style={styles.balanceLabel}>Ton solde</Text>
          {balanceLoading ? (
            <ActivityIndicator color={C.white} />
          ) : (
            <Text style={styles.balanceValue}>{jetons == null ? '—' : `${formatJetons(jetons)} jetons`}</Text>
          )}
          <Text style={styles.balanceHint}>Les jetons servent aux outils de création ChapCam. Ils n'expirent pas.</Text>
        </View>

        {state.status === 'loading' ? (
          <View style={styles.centered}>
            <ActivityIndicator color={C.blue} />
            <Text style={styles.muted}>Chargement des packs App Store…</Text>
          </View>
        ) : state.status === 'ready' ? (
          <View style={styles.grid}>
            {state.packs.map((pack) => {
              const product = state.products[pack.productId]?.product
              const busy = busySku === pack.productId
              const disabled = !product || Boolean(busySku) || restoring
              return (
                <Pressable
                  key={pack.productId}
                  accessibilityRole="button"
                  accessibilityLabel={product ? `Acheter ${pack.jetons} jetons, ${product.priceString}` : `${pack.jetons} jetons indisponible`}
                  accessibilityState={{ disabled, busy }}
                  disabled={disabled}
                  onPress={() => buy(pack)}
                  style={({ pressed }) => [styles.pack, pressed && styles.pressed, disabled && !busy && styles.dimmed]}
                >
                  <View style={styles.packIcon}>
                    <Ionicons name="sparkles" size={18} color={C.blue} />
                  </View>
                  <Text style={styles.packAmount}>{formatJetons(pack.jetons)}</Text>
                  <Text style={styles.packUnit}>jetons</Text>
                  <LinearGradient colors={BRAND} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.packCta}>
                    {busy ? (
                      <ActivityIndicator color={C.white} />
                    ) : (
                      <Text style={styles.packPrice} numberOfLines={1}>{product ? product.priceString : 'Indisponible'}</Text>
                    )}
                  </LinearGradient>
                </Pressable>
              )
            })}
          </View>
        ) : (
          <View style={styles.errorCard} accessibilityRole="alert">
            <Ionicons name="alert-circle-outline" size={28} color={C.violet} />
            <Text style={styles.errorTitle}>Packs indisponibles</Text>
            <Text style={styles.errorText}>
              {state.status === 'unsupported'
                ? "L'achat de jetons est disponible dans l'app ChapCam sur iPhone."
                : "Impossible de récupérer les packs depuis l'App Store pour le moment. Vérifie ta connexion et réessaie."}
            </Text>
            {state.status !== 'unsupported' ? (
              <Pressable accessibilityRole="button" onPress={load} style={({ pressed }) => [styles.retry, pressed && styles.pressed]}>
                <Text style={styles.retryText}>Réessayer</Text>
              </Pressable>
            ) : null}
          </View>
        )}

        <Text style={styles.legal}>
          Achat unique débité sur ton compte Apple à la confirmation. Les jetons sont ajoutés à ton compte ChapCam dès que l'achat est validé.
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy: restoring }}
          disabled={restoring}
          onPress={restore}
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
        >
          <Ionicons name="refresh" size={18} color={C.blue} />
          <Text style={styles.actionText}>Restaurer les achats</Text>
          {restoring ? <ActivityIndicator size="small" color={C.blue} /> : <Ionicons name="chevron-forward" size={16} color="#A8B1C8" />}
        </Pressable>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: PAD - 6, paddingVertical: 8 },
  back: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: C.ink },
  content: { paddingHorizontal: PAD, paddingTop: 4, gap: 16 },
  balance: { borderRadius: 24, backgroundColor: NAVY, padding: 20, gap: 6 },
  balanceLabel: { fontSize: 13, fontWeight: '700', color: MUTED_ON_DARK, textTransform: 'uppercase', letterSpacing: 0.8 },
  balanceValue: { fontSize: 30, fontWeight: '900', color: C.white },
  balanceHint: { fontSize: 14, lineHeight: 20, color: '#DCE3FA' },
  centered: { alignItems: 'center', gap: 10, paddingVertical: 48 },
  muted: { fontSize: 14, color: C.muted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  pack: {
    width: '48.5%',
    borderRadius: 22,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.line,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  packIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.softBlue, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  packAmount: { fontSize: 28, fontWeight: '900', color: C.ink },
  packUnit: { fontSize: 14, fontWeight: '700', color: C.muted, marginBottom: 10 },
  packCta: { alignSelf: 'stretch', height: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  packPrice: { fontSize: 15, fontWeight: '800', color: C.white },
  dimmed: { opacity: 0.45 },
  pressed: { opacity: 0.85 },
  errorCard: { alignItems: 'center', gap: 8, borderRadius: 24, backgroundColor: C.white, padding: 24, borderWidth: 1, borderColor: C.line },
  errorTitle: { fontSize: 17, fontWeight: '800', color: C.ink },
  errorText: { fontSize: 14, lineHeight: 21, color: C.muted, textAlign: 'center' },
  retry: { marginTop: 6, borderRadius: 999, backgroundColor: C.softBlue, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { fontSize: 15, fontWeight: '800', color: C.blue },
  legal: { fontSize: 12, lineHeight: 18, color: C.muted, textAlign: 'center' },
  action: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 15, borderRadius: 20, backgroundColor: C.white, borderWidth: 1, borderColor: C.line },
  actionPressed: { backgroundColor: '#F2F5FD' },
  actionText: { flex: 1, fontSize: 15, fontWeight: '700', color: C.ink },
})
