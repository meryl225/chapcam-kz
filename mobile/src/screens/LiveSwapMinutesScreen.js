import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MINUTES_OFFERING_ID, MINUTE_PRODUCT_IDS, fetchIosCatalog } from '../lib/iap'
import {
  IAP_SUPPORTED,
  STORE,
  STORE_TX_PREFIX,
  ensureRevenueCat,
  isCancelled,
  loadStoreProducts,
  purchaseErrorMessage,
  purchaseStoreItem,
  restoreRevenueCat,
  syncPurchases,
} from '../lib/revenuecat'
import { fetchAccountSummary, getCachedAccountSummary } from '../lib/accountSummary'
import { BRAND, C, PAD } from '../ui/catalog'

const BG = '#F5F7FF'
const NAVY = '#0B1230'
const MUTED_ON_DARK = '#AEB8DA'
const POINTS_PER_SECOND = 2

const fmtClock = (points, pointsPerSecond = POINTS_PER_SECOND) => {
  const totalSeconds = Math.floor(points / pointsPerSecond)
  return `${Math.floor(totalSeconds / 60)}:${(totalSeconds % 60).toString().padStart(2, '0')}`
}

function useAccountSummary() {
  const [summary, setSummary] = useState(getCachedAccountSummary)
  const [loading, setLoading] = useState(() => !getCachedAccountSummary())
  const load = useCallback(async () => {
    setLoading(!getCachedAccountSummary())
    try {
      setSummary(await fetchAccountSummary())
    } catch (error) {
      console.warn('[iap] Solde Live Swap indisponible:', error?.message)
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { load() }, [load])
  return { summary, loading, reload: load }
}

export function LiveSwapMinutesScreen({ user, onBack, onPurchased }) {
  const insets = useSafeAreaInsets()
  const account = useAccountSummary()
  const [state, setState] = useState({ status: 'loading', packs: [], products: {} })
  const [busySku, setBusySku] = useState(null)
  const [restoring, setRestoring] = useState(false)
  const onPurchasedRef = useRef(onPurchased)
  onPurchasedRef.current = onPurchased

  const livePoints = typeof account.summary?.live_swap?.points === 'number' ? account.summary.live_swap.points : null
  const livePointsPerSecond = account.summary?.live_swap?.points_per_second || POINTS_PER_SECOND

  const load = useCallback(async () => {
    if (!IAP_SUPPORTED) {
      setState({ status: 'unsupported', packs: [], products: {} })
      return
    }
    setState((s) => ({ ...s, status: 'loading' }))
    try {
      await ensureRevenueCat(user.id)
      const [products, catalog] = await Promise.all([
        loadStoreProducts(MINUTE_PRODUCT_IDS, 'consumable', MINUTES_OFFERING_ID),
        fetchIosCatalog(),
      ])
      const anyAvailable = catalog.minutePacks.some((pack) => products[pack.productId])
      setState({ status: anyAvailable ? 'ready' : 'unavailable', packs: catalog.minutePacks, products })
    } catch (error) {
      console.warn('[iap] Chargement des packs minutes impossible:', error?.message)
      setState({ status: 'error', packs: [], products: {} })
    }
  }, [user.id])

  useEffect(() => { load() }, [load])

  const refreshAfterCredit = () => {
    account.reload?.()
    onPurchasedRef.current?.()
  }

  // Les minutes ne sont creditees qu'apres relecture serveur de l'achat Apple,
  // une seule fois par transaction ; le nombre de minutes est fixe par le serveur.
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
      Alert.alert('Paiement non effectué', purchaseErrorMessage(error))
      return
    }
    const isThisPurchase = (i) => i.productId === pack.productId && (!transactionId || i.transactionId === `${STORE_TX_PREFIX}:${transactionId}`)
    try {
      const result = await syncPurchases('purchase', (body) => body.items.some(isThisPurchase))
      if (result.items.some(isThisPurchase)) {
        refreshAfterCredit()
        Alert.alert('Minutes ajoutées', `${pack.minutes} minutes Live Swap ont été ajoutées à ton solde.`)
      } else {
        Alert.alert('Vérification en cours', `Ton paiement ${STORE.account} est enregistré. Tes minutes seront ajoutées dans quelques instants, ou via « Restaurer les achats ».`)
      }
    } catch (error) {
      console.warn('[iap] Verification serveur impossible:', error?.message)
      Alert.alert(
        'Vérification en attente',
        `Ton paiement ${STORE.account} est enregistré, mais nous n'avons pas pu le vérifier. Tes minutes seront ajoutées automatiquement, ou via « Restaurer les achats ».`,
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
      const credited = result.items
        .filter((i) => i.status === 'credited' && typeof i.minutes === 'number')
        .reduce((sum, i) => sum + i.minutes, 0)
      refreshAfterCredit()
      Alert.alert(
        'Achats vérifiés',
        credited > 0
          ? `${credited} minutes Live Swap en attente ont été ajoutées à ton solde.`
          : 'Tous tes achats de minutes sont déjà crédités sur ton compte.',
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
        <Text style={styles.headerTitle} accessibilityRole="header">Ajouter des minutes</Text>
        <View style={styles.back} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 40 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        <View style={styles.balance}>
          <Text style={styles.balanceLabel}>Ton solde Live Swap</Text>
          {account.loading && !account.summary ? (
            <ActivityIndicator color={C.white} />
          ) : (
            <Text style={styles.balanceValue}>{livePoints == null ? '0:00 min' : `${fmtClock(livePoints, livePointsPerSecond)} min`}</Text>
          )}
          <Text style={styles.balanceHint}>Les minutes achetées s'ajoutent à ton solde actuel. Ce n'est pas un abonnement.</Text>
        </View>

        {state.status === 'loading' ? (
          <View style={styles.centered}>
            <ActivityIndicator color={C.blue} />
            <Text style={styles.muted}>Chargement des recharges {STORE.name}…</Text>
          </View>
        ) : state.status === 'ready' ? (
          <View style={styles.list}>
            {state.packs.map((pack) => {
              const product = state.products[pack.productId]?.product
              const busy = busySku === pack.productId
              const disabled = !product || Boolean(busySku) || restoring
              return (
                <Pressable
                  key={pack.productId}
                  accessibilityRole="button"
                  accessibilityLabel={product ? `Acheter ${pack.minutes} minutes Live Swap, ${product.priceString}` : `${pack.minutes} minutes indisponible`}
                  accessibilityState={{ disabled, busy }}
                  disabled={disabled}
                  onPress={() => buy(pack)}
                  style={({ pressed }) => [styles.pack, pressed && styles.pressed, disabled && !busy && styles.dimmed]}
                >
                  <View style={styles.packIcon}>
                    <Ionicons name="videocam" size={20} color={C.blue} />
                  </View>
                  <View style={styles.packBody}>
                    <Text style={styles.packAmount}>{`+${pack.minutes} minutes`}</Text>
                    <Text style={styles.packUnit}>Live Swap</Text>
                  </View>
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
            <Text style={styles.errorTitle}>Recharges indisponibles</Text>
            <Text style={styles.errorText}>
              {state.status === 'unsupported'
                ? "L'achat de minutes est disponible dans l'app ChapCam sur iPhone."
                : `Impossible de récupérer les recharges depuis ${STORE.the} pour le moment. Vérifie ta connexion et réessaie.`}
            </Text>
            {state.status !== 'unsupported' ? (
              <Pressable accessibilityRole="button" onPress={load} style={({ pressed }) => [styles.retry, pressed && styles.pressed]}>
                <Text style={styles.retryText}>Réessayer</Text>
              </Pressable>
            ) : null}
          </View>
        )}

        <Text style={styles.legal}>
          Achat unique débité sur ton compte {STORE.account} à la confirmation. Les minutes sont ajoutées à ton compte ChapCam dès que l'achat est validé.
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
  list: { gap: 12 },
  pack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 22,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.line,
    padding: 16,
  },
  packIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.softBlue, alignItems: 'center', justifyContent: 'center' },
  packBody: { flex: 1 },
  packAmount: { fontSize: 20, fontWeight: '900', color: C.ink },
  packUnit: { fontSize: 14, fontWeight: '700', color: C.muted },
  packCta: { minWidth: 104, height: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
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
