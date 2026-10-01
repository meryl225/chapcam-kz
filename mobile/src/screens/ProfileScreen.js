import React from 'react'
import { ActivityIndicator, Alert, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import Constants from 'expo-constants'
import { supabase } from '../lib/supabase'
import { BRAND, C, PAD, shadow } from '../ui/catalog'

const WEB_URL = (process.env.EXPO_PUBLIC_API_URL ?? Constants.expoConfig?.extra?.apiUrl ?? 'https://chapcam.com').replace(/\/$/, '')
const DANGER = '#E5484D'

const LINKS = {
  plans: `${WEB_URL}/dashboard/plans`,
  account: `${WEB_URL}/dashboard/settings`,
  terms: `${WEB_URL}/conditions`,
  privacy: `${WEB_URL}/confidentialite`,
  support: 'mailto:contact@chapcam.com',
}

const open = async (url) => {
  try {
    await Linking.openURL(url)
  } catch {
    Alert.alert('Lien indisponible', "Impossible d'ouvrir ce lien sur cet appareil.")
  }
}

const formatPlan = (plan) => (plan ? plan.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : null)

const formatDate = (value) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function ProfileScreen({ user, subscription, loading, refreshing, onRefresh }) {
  const email = user?.email ?? ''
  const metaName = user?.user_metadata?.full_name || user?.user_metadata?.name || null
  const initial = (metaName || email || '?').trim().charAt(0).toUpperCase()

  const planName = formatPlan(subscription?.plan)
  const isActive = Boolean(subscription && (subscription.is_active === true || subscription.status === 'active'))
  const credits = subscription ? subscription.points_remaining ?? subscription.points ?? null : null
  const endDate = formatDate(subscription?.end_date)
  const expired = subscription?.end_date ? new Date(subscription.end_date).getTime() < Date.now() : false

  const confirmSignOut = () =>
    Alert.alert('Se déconnecter ?', 'Tu devras te reconnecter pour accéder à ton studio.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ])

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.blue} />}
    >
      <Text style={styles.title} accessibilityRole="header">Mon profil</Text>

      <View style={styles.identity}>
        <LinearGradient colors={BRAND} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </LinearGradient>
        <View style={styles.identityBody}>
          {metaName ? <Text style={styles.name} numberOfLines={1}>{metaName}</Text> : null}
          <Text style={metaName ? styles.emailSub : styles.name} numberOfLines={1}>{email}</Text>
          {loading ? (
            <ActivityIndicator size="small" color={C.blue} style={styles.loader} />
          ) : (
            <View style={styles.chips}>
              <View style={styles.chip}>
                <Ionicons name="diamond-outline" size={12} color={C.blue} />
                <Text style={styles.chipText}>{planName || 'Aucun forfait'}</Text>
              </View>
              {credits !== null ? (
                <View style={styles.chip}>
                  <Ionicons name="flash" size={12} color={C.violet} />
                  <Text style={styles.chipText}>{credits} crédits</Text>
                </View>
              ) : null}
              {isActive && !expired ? (
                <View style={styles.badge}>
                  <View style={styles.badgeDot} />
                  <Text style={styles.badgeText}>Actif</Text>
                </View>
              ) : null}
            </View>
          )}
        </View>
      </View>

      <Text style={styles.groupLabel}>Abonnement</Text>
      <View style={styles.card}>
        <View style={styles.subTop}>
          <LinearGradient colors={BRAND} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.subIcon}>
            <Ionicons name="infinite" size={20} color={C.white} />
          </LinearGradient>
          <View style={styles.flex}>
            <Text style={styles.subPlan}>{loading ? 'Chargement…' : planName ? `ChapCam ${planName}` : 'Aucun forfait actif'}</Text>
            {endDate ? (
              <Text style={styles.subMeta}>{expired ? `Expiré le ${endDate}` : `Valable jusqu'au ${endDate}`}</Text>
            ) : !loading && !planName ? (
              <Text style={styles.subMeta}>Choisis un forfait pour débloquer les outils IA.</Text>
            ) : null}
          </View>
        </View>

        {credits !== null ? (
          <View style={styles.statRow}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Crédits IA</Text>
              <Text style={styles.statValue}>{credits}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Statut</Text>
              <Text style={[styles.statValue, styles.statSmall]}>{isActive && !expired ? 'Actif' : 'Inactif'}</Text>
            </View>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="link"
          accessibilityHint="Ouvre la page des forfaits ChapCam"
          onPress={() => open(LINKS.plans)}
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
        >
          <Text style={styles.ctaText}>Gérer mon abonnement</Text>
          <Ionicons name="open-outline" size={16} color={C.white} />
        </Pressable>
      </View>

      <Text style={styles.groupLabel}>Paramètres</Text>
      <View style={styles.group}>
        <Row icon="person-circle-outline" label="Compte" onPress={() => open(LINKS.account)} external />
        <Row icon="language-outline" label="Langue" value="Français" />
        <Row icon="notifications-outline" label="Notifications" />
        <Row icon="shield-checkmark-outline" label="Sécurité" last />
      </View>

      <Text style={styles.groupLabel}>Support</Text>
      <View style={styles.group}>
        <Row icon="help-buoy-outline" label="Aide & support" value="contact@chapcam.com" onPress={() => open(LINKS.support)} />
        <Row icon="document-text-outline" label="Conditions d'utilisation" onPress={() => open(LINKS.terms)} external />
        <Row icon="lock-closed-outline" label="Politique de confidentialité" onPress={() => open(LINKS.privacy)} external last />
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={confirmSignOut}
        style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}
      >
        <Ionicons name="log-out-outline" size={18} color={DANGER} />
        <Text style={styles.signOutText}>Se déconnecter</Text>
      </Pressable>

      <Text style={styles.version}>ChapCam · v{Constants.expoConfig?.version ?? '1.0.0'}</Text>
    </ScrollView>
  )
}

function Row({ icon, label, value, onPress, external, last }) {
  const interactive = typeof onPress === 'function'
  const body = (
    <>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={interactive ? C.blue : C.muted} />
      </View>
      <Text style={[styles.rowLabel, !interactive && styles.rowLabelMuted]} numberOfLines={1}>{label}</Text>
      {value ? <Text style={styles.rowValue} numberOfLines={1}>{value}</Text> : null}
      {interactive ? <Ionicons name={external ? 'open-outline' : 'chevron-forward'} size={16} color="#B3BCD3" /> : null}
    </>
  )
  const rowStyle = [styles.row, !last && styles.rowBorder]
  if (!interactive) {
    return <View style={rowStyle} accessible accessibilityLabel={value ? `${label}, ${value}` : label}>{body}</View>
  }
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [...rowStyle, pressed && styles.rowPressed]}>
      {body}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: PAD, paddingTop: 8, paddingBottom: 120 },
  pressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
  title: { color: C.ink, fontSize: 30, fontWeight: '900', letterSpacing: -0.8, marginTop: 6, marginBottom: 16 },

  identity: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.white, borderRadius: 24, padding: 16, borderWidth: 1, borderColor: C.line, ...shadow, shadowOpacity: 0.07 },
  avatar: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: C.white, fontSize: 24, fontWeight: '900' },
  identityBody: { flex: 1, minWidth: 0 },
  name: { color: C.ink, fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  emailSub: { color: C.muted, fontSize: 13, fontWeight: '600', marginTop: 1 },
  loader: { alignSelf: 'flex-start', marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 24, paddingHorizontal: 9, borderRadius: 12, backgroundColor: '#EEF3FF' },
  chipText: { color: C.ink, fontSize: 12, fontWeight: '700' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 24, paddingHorizontal: 9, borderRadius: 12, backgroundColor: '#E6F8EF' },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#1F9D5C' },
  badgeText: { color: '#157A47', fontSize: 12, fontWeight: '800' },

  groupLabel: { color: C.muted, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 24, marginBottom: 8, marginLeft: 4 },
  card: { backgroundColor: C.white, borderRadius: 22, padding: 16, borderWidth: 1, borderColor: C.line, gap: 14, ...shadow, shadowOpacity: 0.06 },
  subTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  subIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  subPlan: { color: C.ink, fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  subMeta: { color: C.muted, fontSize: 13, fontWeight: '600', marginTop: 2 },
  statRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderRadius: 16, paddingVertical: 12 },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: C.line },
  statLabel: { color: C.muted, fontSize: 12, fontWeight: '700' },
  statValue: { color: C.ink, fontSize: 20, fontWeight: '900', fontVariant: ['tabular-nums'] },
  statSmall: { fontSize: 16 },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 16, backgroundColor: C.ink },
  ctaText: { color: C.white, fontSize: 15, fontWeight: '800' },

  group: { backgroundColor: C.white, borderRadius: 22, borderWidth: 1, borderColor: C.line, overflow: 'hidden', ...shadow, shadowOpacity: 0.05 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 54, paddingHorizontal: 14 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#DCE3F1' },
  rowPressed: { backgroundColor: '#F2F6FF' },
  rowIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#EEF3FF', alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, color: C.ink, fontSize: 15, fontWeight: '700' },
  rowLabelMuted: { color: '#5D6785' },
  rowValue: { color: C.muted, fontSize: 13, fontWeight: '600', maxWidth: 150 },

  signOut: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, marginTop: 24, borderRadius: 16, backgroundColor: '#FFF1F1', borderWidth: 1, borderColor: '#FFDADB' },
  signOutText: { color: DANGER, fontSize: 15, fontWeight: '800' },
  version: { color: '#A3ACC4', fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: 14 },
})
