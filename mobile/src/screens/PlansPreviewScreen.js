// TEMPORARY: static screen used only for App Store Connect review screenshots.
// It never calls RevenueCat/StoreKit and never starts a purchase. Remove after review.
import React from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BRAND, C, PAD } from '../ui/catalog'

const BG = '#F5F7FF'
const NAVY = '#0B1230'
const NAVY_2 = '#18205A'
const MUTED_ON_DARK = '#AEB8DA'

const PLANS = [
  { key: 'testeur', name: 'Testeur', duration: '1 semaine', icon: 'flask' },
  { key: 'starter', name: 'Starter', duration: '1 mois', icon: 'rocket' },
  { key: 'premium', name: 'Premium', duration: '3 mois', icon: 'star', featured: true },
  { key: 'vip-pro', name: 'VIP Pro', duration: '1 an', icon: 'diamond' },
  { key: 'vip-debout', name: 'VIP Debout', duration: '1 an', icon: 'trophy' },
]

const onSubscribePreview = () => {
  Alert.alert('Aperçu', "Cet écran est un aperçu. Aucun achat n'est effectué.")
}

export function PlansPreviewScreen({ onBack }) {
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={onBack} hitSlop={10} style={styles.back}>
          <Ionicons name="chevron-back" size={26} color={C.ink} />
        </Pressable>
        <Text style={styles.headerTitle} accessibilityRole="header">Forfaits ChapCam</Text>
        <View style={styles.back} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        <Text style={styles.lead}>Choisis le forfait adapté à ta création. Résiliable à tout moment.</Text>

        {PLANS.map((plan) => (
          <LinearGradient
            key={plan.key}
            colors={[NAVY, NAVY_2]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.card, plan.featured && styles.cardFeatured]}
          >
            <View style={styles.cardTop}>
              <LinearGradient colors={BRAND} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.icon}>
                <Ionicons name={plan.icon} size={22} color={C.white} />
              </LinearGradient>
              <View style={styles.flex}>
                <Text style={styles.planName}>{plan.name}</Text>
                <View style={styles.durationRow}>
                  <Ionicons name="time-outline" size={14} color={MUTED_ON_DARK} />
                  <Text style={styles.duration}>{plan.duration}</Text>
                </View>
              </View>
              {plan.featured ? (
                <LinearGradient colors={BRAND} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.badge}>
                  <Text style={styles.badgeText}>Populaire</Text>
                </LinearGradient>
              ) : null}
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`S'abonner au forfait ${plan.name}, ${plan.duration}`}
              onPress={onSubscribePreview}
              style={({ pressed }) => [pressed && styles.pressed]}
            >
              <LinearGradient colors={[C.blue, C.violet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cta}>
                <Text style={styles.ctaText}>{"S'abonner"}</Text>
              </LinearGradient>
            </Pressable>
          </LinearGradient>
        ))}

        <Text style={styles.legal}>
          {"L'abonnement se renouvelle automatiquement sauf s'il est résilié au moins 24 heures avant la fin de la période en cours, depuis les réglages de ton compte App Store."}
        </Text>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: PAD - 6, paddingVertical: 8 },
  back: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: C.ink },
  content: { paddingHorizontal: PAD, paddingTop: 4, gap: 14 },
  lead: { fontSize: 15, lineHeight: 22, color: C.muted },
  card: {
    borderRadius: 24,
    padding: 20,
    gap: 16,
    shadowColor: '#1B2A6B',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  cardFeatured: { borderWidth: 1.5, borderColor: C.violet },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  icon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, gap: 4 },
  planName: { fontSize: 20, fontWeight: '900', color: C.white },
  durationRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  duration: { fontSize: 14, fontWeight: '600', color: MUTED_ON_DARK },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontSize: 11, fontWeight: '800', color: C.white, textTransform: 'uppercase', letterSpacing: 0.6 },
  cta: { height: 52, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontSize: 16, fontWeight: '800', color: C.white },
  pressed: { opacity: 0.85 },
  legal: { fontSize: 12, lineHeight: 18, color: C.muted, textAlign: 'center', paddingTop: 4 },
})
