import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import Constants from 'expo-constants'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { IOS_PRODUCT_IDS, fetchIosCatalog, periodLabel } from '../lib/iap'
import {
  ensureRevenueCat,
  isCancelled,
  loadStoreProducts,
  probeSubscriptionProducts,
  getRevenueCatDiagnostics,
  resetRevenueCatDiagnostics,
  openManageSubscriptions,
  purchaseErrorMessage,
  purchaseStoreItem,
  restoreRevenueCat,
  syncPurchases,
} from '../lib/revenuecat'
import { BRAND, C, PAD } from '../ui/catalog'

const WEB_URL = (process.env.EXPO_PUBLIC_API_URL ?? Constants.expoConfig?.extra?.apiUrl ?? 'https://chapcam.com').replace(/\/$/, '')
const LINKS = {
  terms: `${WEB_URL}/conditions`,
  privacy: `${WEB_URL}/confidentialite`,
  appleSubscriptions: 'https://apps.apple.com/account/subscriptions',
}

const BG = '#F5F7FF'
const NAVY = '#0B1230'
const NAVY_2 = '#18205A'
const MUTED_ON_DARK = '#AEB8DA'

const openUrl = async (url) => {
  try {
    await Linking.openURL(url)
  } catch {
    Alert.alert('Lien indisponible', "Impossible d'ouvrir ce lien sur cet appareil.")
  }
}

const isActivated = (item) => item.status === 'activated' || item.status === 'already'

export function SubscriptionPlansScreen({ user, onBack, onPurchased }) {
  const insets = useSafeAreaInsets()
  const [state, setState] = useState({ status: 'loading', plans: [], products: {} })
  const [busySku, setBusySku] = useState(null)
  const [restoring, setRestoring] = useState(false)
  const onPurchasedRef = useRef(onPurchased)
  onPurchasedRef.current = onPurchased

  const load = useCallback(async () => {
    if (Platform.OS !== 'ios') {
      setState({ status: 'unsupported', plans: [], products: {} })
      return
    }
    setState((s) => ({ ...s, status: 'loading' }))
    resetRevenueCatDiagnostics()
    try {
      await ensureRevenueCat(user.id)
      await probeSubscriptionProducts(IOS_PRODUCT_IDS)
      const [products, catalog] = await Promise.all([
        loadStoreProducts(IOS_PRODUCT_IDS, 'subs'),
        fetchIosCatalog(),
      ])
      const anyAvailable = catalog.plans.some((plan) => products[plan.productId])
      setState({ status: anyAvailable ? 'ready' : 'unavailable', plans: catalog.plans, products })
    } catch (error) {
      console.warn('[iap] Chargement des forfaits impossible:', error?.message)
      setState({ status: 'error', plans: [], products: {}, errorMessage: `${error?.code ?? ''} ${error?.message ?? String(error)}`.trim() })
    }
  }, [user.id])

  useEffect(() => { load() }, [load])

  // L'abonnement n'est actif qu'une fois l'achat Apple relu et valide par le serveur.
  const subscribe = async (productId) => {
    const item = state.products[productId]
    if (!item || busySku || restoring) return
    setBusySku(productId)
    try {
      await purchaseStoreItem(item)
    } catch (error) {
      setBusySku(null)
      if (isCancelled(error)) return
      Alert.alert('Paiement non effectué', purchaseErrorMessage(error))
      return
    }
    try {
      const result = await syncPurchases('purchase', (body) => body.items.some((i) => i.productId === productId && isActivated(i)))
      const mine = result.items.filter((i) => i.productId === productId)
      if (mine.some(isActivated)) {
        onPurchasedRef.current?.()
        Alert.alert('Abonnement activé', 'Merci ! Ton forfait ChapCam est actif et ton profil est à jour.')
      } else if (mine.some((i) => i.status === 'revoked')) {
        Alert.alert('Abonnement annulé', 'Cet achat a été remboursé ou annulé par Apple.')
      } else {
        Alert.alert('Vérification en cours', "Ton paiement Apple est enregistré. Ton forfait sera activé dans quelques instants, ou via « Restaurer les achats ».")
      }
    } catch (error) {
      console.warn('[iap] Verification serveur impossible:', error?.message)
      Alert.alert(
        'Vérification en attente',
        "Ton paiement Apple est enregistré, mais nous n'avons pas pu le vérifier. Il sera validé automatiquement, ou via « Restaurer les achats ».",
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
      onPurchasedRef.current?.()
      if (result.subscriptionActive) {
        Alert.alert('Achats restaurés', 'Ton abonnement ChapCam est de nouveau actif.')
      } else if (result.items.length === 0) {
        Alert.alert('Aucun achat à restaurer', "Aucun achat ChapCam n'est associé à ce compte Apple.")
      } else {
        Alert.alert('Aucun abonnement actif', 'Tes abonnements ChapCam ont expiré ou ont été annulés. Tes jetons achetés sont bien conservés.')
      }
    } catch (error) {
      if (isCancelled(error)) return
      Alert.alert('Restauration impossible', 'Impossible de restaurer les achats pour le moment. Réessaie dans quelques instants.')
    } finally {
      setRestoring(false)
    }
  }

  const manage = async () => {
    try {
      await openManageSubscriptions()
    } catch {
      openUrl(LINKS.appleSubscriptions)
    }
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={onBack} hitSlop={12} style={styles.back}>
          <Ionicons name="chevron-back" size={22} color={C.ink} />
        </Pressable>
        <Text style={styles.headerTitle} accessibilityRole="header">Forfaits ChapCam</Text>
        <View style={styles.back} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 40 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        <Text style={styles.lead}>
          Choisis le forfait adapté à ta création. Paiement sécurisé par Apple, résiliable à tout moment.
        </Text>

        {state.status === 'loading' ? (
          <View style={styles.centered}>
            <ActivityIndicator color={C.blue} />
            <Text style={styles.muted}>Chargement des forfaits App Store…</Text>
          </View>
        ) : state.status === 'ready' ? (
          state.plans.map((plan) => (
            <PlanCard
              key={plan.productId}
              plan={plan}
              product={state.products[plan.productId]?.product}
              busy={busySku === plan.productId}
              disabled={Boolean(busySku) || restoring}
              onSubscribe={() => subscribe(plan.productId)}
            />
          )).concat(
            <View key="diagnostic" style={styles.errorCard}>
              <Text selectable style={styles.diagText}>
                {`[diagnostic] statut: ${state.status}\nforfaits catalogue serveur: ${state.plans.map((p) => p.productId).join(', ') || '(aucun)'}\n${getRevenueCatDiagnostics()}`}
              </Text>
              <Pressable accessibilityRole="button" onPress={load} style={({ pressed }) => [styles.retry, pressed && styles.pressed]}>
                <Text style={styles.retryText}>Relancer le diagnostic</Text>
              </Pressable>
            </View>
          )
        ) : (
          <View style={styles.errorCard} accessibilityRole="alert">
            <Ionicons name="alert-circle-outline" size={28} color={C.violet} />
            <Text style={styles.errorTitle}>Forfaits indisponibles</Text>
            <Text style={styles.errorText}>
              {state.status === 'unsupported'
                ? "Les abonnements sont disponibles dans l'app ChapCam sur iPhone."
                : "Impossible de récupérer les forfaits depuis l'App Store pour le moment. Vérifie ta connexion et réessaie."}
            </Text>
            {state.status !== 'unsupported' ? (
              <Text selectable style={styles.diagText}>
                {`[diagnostic] statut: ${state.status}${state.errorMessage ? `\nerreur: ${state.errorMessage}` : ''}\n${getRevenueCatDiagnostics()}`}
              </Text>
            ) : null}
            {state.status !== 'unsupported' ? (
              <Pressable accessibilityRole="button" onPress={load} style={({ pressed }) => [styles.retry, pressed && styles.pressed]}>
                <Text style={styles.retryText}>Réessayer</Text>
              </Pressable>
            ) : null}
          </View>
        )}

        <Text style={styles.legal}>
          Le paiement est débité sur ton compte Apple à la confirmation de l'achat. L'abonnement se renouvelle automatiquement
          sauf s'il est résilié au moins 24 heures avant la fin de la période en cours, depuis les réglages de ton compte App Store.
        </Text>

        <View style={styles.actions}>
          <SecondaryAction icon="refresh" label="Restaurer les achats" busy={restoring} onPress={restore} />
          <SecondaryAction icon="card-outline" label="Gérer mon abonnement" onPress={manage} />
          <SecondaryAction icon="document-text-outline" label="Conditions d'utilisation" onPress={() => openUrl(LINKS.terms)} />
          <SecondaryAction icon="lock-closed-outline" label="Politique de confidentialité" onPress={() => openUrl(LINKS.privacy)} last />
        </View>
      </ScrollView>
    </View>
  )
}

function PlanCard({ plan, product, busy, disabled, onSubscribe }) {
  const featured = plan.bestOffer || plan.highlight
  const period = product ? periodLabel(product) : null
  return (
    <LinearGradient colors={featured ? [NAVY, NAVY_2] : [NAVY, NAVY]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.card, plan.bestOffer && styles.cardBest]}>
      <View style={styles.cardTop}>
        <Text style={styles.planName}>{plan.name}</Text>
        {plan.bestOffer ? (
          <LinearGradient colors={BRAND} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.badge}>
            <Text style={styles.badgeText}>Meilleure offre</Text>
          </LinearGradient>
        ) : null}
      </View>

      {product ? (
        <View style={styles.priceRow}>
          <Text style={styles.price}>{product.priceString}</Text>
          {period ? <Text style={styles.period}>{period}</Text> : null}
        </View>
      ) : (
        <Text style={styles.unavailable}>Indisponible sur l'App Store pour le moment</Text>
      )}

      <View style={styles.stats}>
        <Stat icon="videocam" label={`${plan.minutes} Live Swap`} />
        {plan.jetons > 0 ? <Stat icon="sparkles" label={`${plan.jetons} jetons`} /> : null}
      </View>

      <View style={styles.features}>
        {plan.features.map((feature) => (
          <View key={feature} style={styles.feature}>
            <Ionicons name="checkmark-circle" size={16} color="#7FA6FF" />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={product ? `S'abonner à ${plan.name}, ${product.priceString}` : `${plan.name} indisponible`}
        accessibilityState={{ disabled: !product || disabled, busy }}
        disabled={!product || disabled}
        onPress={onSubscribe}
        style={({ pressed }) => [pressed && styles.pressed, (!product || (disabled && !busy)) && styles.dimmed]}
      >
        <LinearGradient colors={BRAND} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cta}>
          {busy ? <ActivityIndicator color={C.white} /> : <Text style={styles.ctaText}>S'abonner</Text>}
        </LinearGradient>
      </Pressable>
    </LinearGradient>
  )
}

function Stat({ icon, label }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={14} color={C.white} />
      <Text style={styles.statText}>{label}</Text>
    </View>
  )
}

function SecondaryAction({ icon, label, onPress, busy, last }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: Boolean(busy) }}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [styles.action, !last && styles.actionDivider, pressed && styles.actionPressed]}
    >
      <Ionicons name={icon} size={18} color={C.blue} />
      <Text style={styles.actionText}>{label}</Text>
      {busy ? <ActivityIndicator size="small" color={C.blue} /> : <Ionicons name="chevron-forward" size={16} color="#A8B1C8" />}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: PAD - 6, paddingVertical: 8 },
  back: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: C.ink },
  content: { paddingHorizontal: PAD, paddingTop: 4, gap: 14 },
  lead: { fontSize: 15, lineHeight: 22, color: C.muted },
  centered: { alignItems: 'center', gap: 10, paddingVertical: 48 },
  muted: { fontSize: 14, color: C.muted },
  card: {
    borderRadius: 24,
    padding: 20,
    gap: 14,
    shadowColor: '#1B2A6B',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  cardBest: { borderWidth: 1.5, borderColor: C.violet },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  planName: { flexShrink: 1, fontSize: 20, fontWeight: '900', color: C.white },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontSize: 11, fontWeight: '800', color: C.white, textTransform: 'uppercase', letterSpacing: 0.6 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 6 },
  price: { fontSize: 30, fontWeight: '900', color: C.white },
  period: { fontSize: 14, color: MUTED_ON_DARK },
  unavailable: { fontSize: 14, fontWeight: '700', color: MUTED_ON_DARK },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 6 },
  statText: { fontSize: 13, fontWeight: '700', color: C.white },
  features: { gap: 8 },
  feature: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  featureText: { flex: 1, fontSize: 14, lineHeight: 20, color: '#DCE3FA' },
  cta: { height: 52, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontSize: 16, fontWeight: '800', color: C.white },
  dimmed: { opacity: 0.45 },
  pressed: { opacity: 0.85 },
  errorCard: { alignItems: 'center', gap: 8, borderRadius: 24, backgroundColor: C.white, padding: 24, borderWidth: 1, borderColor: C.line },
  errorTitle: { fontSize: 17, fontWeight: '800', color: C.ink },
  errorText: { fontSize: 14, lineHeight: 21, color: C.muted, textAlign: 'center' },
  diagText: { fontSize: 11, lineHeight: 16, color: C.muted, textAlign: 'left', alignSelf: 'stretch', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  retry: { marginTop: 6, borderRadius: 999, backgroundColor: C.softBlue, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { fontSize: 15, fontWeight: '800', color: C.blue },
  legal: { fontSize: 12, lineHeight: 18, color: C.muted, textAlign: 'center' },
  actions: { borderRadius: 20, backgroundColor: C.white, borderWidth: 1, borderColor: C.line, overflow: 'hidden' },
  action: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 15 },
  actionDivider: { borderBottomWidth: 1, borderBottomColor: C.line },
  actionPressed: { backgroundColor: '#F2F5FD' },
  actionText: { flex: 1, fontSize: 15, fontWeight: '700', color: C.ink },
})
