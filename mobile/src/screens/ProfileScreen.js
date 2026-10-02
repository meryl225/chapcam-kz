import React, { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Image, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import Constants from 'expo-constants'
import { supabase } from '../lib/supabase'
import { BRAND, C, PAD, shadow } from '../ui/catalog'

const WEB_URL = (process.env.EXPO_PUBLIC_API_URL ?? Constants.expoConfig?.extra?.apiUrl ?? 'https://chapcam.com').replace(/\/$/, '')
const DANGER = '#E5484D'
const JETONS_LOGO = `${WEB_URL}/images/jetons-logo.png`

const LINKS = {
  plans: `${WEB_URL}/dashboard/plans`,
  jetons: `${WEB_URL}/dashboard/jetons`,
  settings: `${WEB_URL}/dashboard/settings`,
  terms: `${WEB_URL}/conditions`,
  privacy: `${WEB_URL}/confidentialite`,
  support: 'mailto:contact@chapcam.com',
}

// Mirrors app/dashboard/page.tsx (PLAN_LABELS, POINTS_PER_SECOND, fmtMinutes) on chapcam.com.
const PLAN_LABELS = {
  free: 'Gratuit',
  '1day': 'Plan 1 jour',
  '30days': 'Plan 30 jours',
  '90days': 'Plan 90 jours',
  '365days': 'Plan 365 jours',
}
const POINTS_PER_SECOND = 2

const fmtMinutes = (points) => {
  const totalSeconds = Math.floor(points / POINTS_PER_SECOND)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, '0')} min`
}

const formatDate = (value) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

const open = async (url) => {
  try {
    await Linking.openURL(url)
  } catch {
    Alert.alert('Lien indisponible', "Impossible d'ouvrir ce lien sur cet appareil.")
  }
}

async function fetchJetons() {
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  if (!token) return null
  const res = await fetch(`${WEB_URL}/api/jetons`, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) return null
  const json = await res.json()
  return typeof json?.balance === 'number' ? json.balance : null
}

function useJetons() {
  const [balance, setBalance] = useState(null)
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    try {
      setBalance(await fetchJetons())
    } catch {
      setBalance(null)
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { load() }, [load])
  return { balance, loading, reload: load }
}

export function ProfileScreen({ user, subscription, loading, refreshing, onRefresh }) {
  const jetons = useJetons()

  const email = user?.email ?? ''
  const metaName = user?.user_metadata?.full_name || user?.user_metadata?.name || null
  const initial = (metaName || email || '?').trim().charAt(0).toUpperCase()

  const planKey = subscription?.plan || null
  const planLabel = planKey ? PLAN_LABELS[planKey] || planKey : null
  const endTime = subscription?.end_date ? new Date(subscription.end_date).getTime() : null
  const expired = endTime !== null && !Number.isNaN(endTime) && endTime < Date.now()
  const isActive = Boolean(subscription && planKey !== 'free' && subscription.is_active === true && !expired)
  const endDate = formatDate(subscription?.end_date)
  const livePoints = typeof subscription?.points === 'number' ? subscription.points : null

  const appVersion = Constants.nativeAppVersion ?? Constants.expoConfig?.version ?? null
  const buildNumber = Constants.nativeBuildVersion ?? Constants.expoConfig?.ios?.buildNumber ?? null

  const handleRefresh = () => {
    jetons.reload()
    onRefresh?.()
  }

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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.blue} />}
    >
      <Text style={styles.title} accessibilityRole="header">Mon profil</Text>

      <View style={styles.hero}>
        <LinearGradient colors={BRAND} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroBand} />
        <View style={styles.heroBody}>
          <View style={styles.avatarRing}>
            <LinearGradient colors={BRAND} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </LinearGradient>
          </View>
          {metaName ? <Text style={styles.name} numberOfLines={1}>{metaName}</Text> : null}
          <Text style={metaName ? styles.emailSub : styles.name} numberOfLines={1}>{email}</Text>
          {loading ? (
            <ActivityIndicator size="small" color={C.blue} style={styles.heroLoader} />
          ) : (
            <View style={styles.heroChips}>
              {planLabel ? (
                <View style={styles.planChip}>
                  <Ionicons name="diamond" size={12} color={C.violet} />
                  <Text style={styles.planChipText}>{planLabel}</Text>
                </View>
              ) : null}
              <View style={[styles.status, isActive ? styles.statusOn : styles.statusOff]}>
                <View style={[styles.statusDot, { backgroundColor: isActive ? '#1F9D5C' : '#9AA3BA' }]} />
                <Text style={[styles.statusText, { color: isActive ? '#157A47' : '#5D6785' }]}>{isActive ? 'Actif' : 'Inactif'}</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      <Text style={styles.groupLabel}>Mes soldes</Text>
      <View style={styles.balances}>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`Jetons, ${jetons.balance ?? 'indisponible'}`}
          accessibilityHint="Ouvre la page Jetons ChapCam"
          onPress={() => open(LINKS.jetons)}
          style={({ pressed }) => [styles.balance, pressed && styles.pressed]}
        >
          <View style={styles.balanceHead}>
            <Image source={{ uri: JETONS_LOGO }} style={styles.jetonsLogo} accessibilityIgnoresInvertColors />
            <Text style={styles.balanceTitle}>Jetons</Text>
          </View>
          {jetons.loading ? (
            <ActivityIndicator size="small" color={C.blue} style={styles.balanceLoader} />
          ) : (
            <Text style={styles.balanceValue}>{jetons.balance !== null ? jetons.balance.toLocaleString('fr-FR') : '—'}</Text>
          )}
          <Text style={styles.balanceHint}>Pour tous les outils ChapCam, sauf Live Swap.</Text>
        </Pressable>

        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`Live Swap, ${livePoints !== null ? fmtMinutes(livePoints) : 'indisponible'}`}
          accessibilityHint="Ouvre les forfaits ChapCam"
          onPress={() => open(LINKS.plans)}
          style={({ pressed }) => [styles.balance, pressed && styles.pressed]}
        >
          <View style={styles.balanceHead}>
            <LinearGradient colors={BRAND} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.liveIcon}>
              <Ionicons name="videocam" size={14} color={C.white} />
            </LinearGradient>
            <Text style={styles.balanceTitle}>Live Swap</Text>
          </View>
          {loading ? (
            <ActivityIndicator size="small" color={C.blue} style={styles.balanceLoader} />
          ) : (
            <Text style={styles.balanceValue}>{livePoints !== null ? fmtMinutes(livePoints) : '—'}</Text>
          )}
          <Text style={styles.balanceHint}>
            {livePoints !== null ? `${livePoints.toLocaleString('fr-FR')} points · ${isActive ? 'forfait actif' : 'forfait inactif'}` : 'Aucun forfait Live Swap'}
          </Text>
        </Pressable>
      </View>

      <Text style={styles.groupLabel}>Abonnement</Text>
      <LinearGradient colors={['#0E1530', '#1B2350']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.sub}>
        <View style={styles.subTop}>
          <LinearGradient colors={BRAND} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.subIcon}>
            <Ionicons name="diamond" size={18} color={C.white} />
          </LinearGradient>
          <View style={styles.flex}>
            <Text style={styles.subEyebrow}>Forfait actuel</Text>
            <Text style={styles.subPlan} numberOfLines={1}>{loading ? 'Chargement…' : planLabel || 'Aucun forfait'}</Text>
          </View>
          {!loading ? (
            <View style={[styles.subBadge, isActive ? styles.subBadgeOn : styles.subBadgeOff]}>
              <Text style={styles.subBadgeText}>{isActive ? 'Actif' : expired ? 'Expiré' : 'Inactif'}</Text>
            </View>
          ) : null}
        </View>
        {endDate ? (
          <View style={styles.subDate}>
            <Ionicons name="calendar-outline" size={14} color="#AEB8DA" />
            <Text style={styles.subDateText}>{expired ? `Expiré le ${endDate}` : `Valable jusqu'au ${endDate}`}</Text>
          </View>
        ) : null}
        <Pressable
          accessibilityRole="link"
          accessibilityHint="Ouvre la page des forfaits ChapCam"
          onPress={() => open(LINKS.plans)}
          style={({ pressed }) => [styles.subCta, pressed && styles.pressed]}
        >
          <Text style={styles.subCtaText}>Gérer mon abonnement</Text>
          <Ionicons name="arrow-forward" size={16} color={C.ink} />
        </Pressable>
      </LinearGradient>

      <Text style={styles.groupLabel}>Paramètres du compte</Text>
      <View style={styles.group}>
        <Row icon="person-circle-outline" tint={C.blue} label="Compte" onPress={() => open(LINKS.settings)} external />
        <Row icon="language-outline" tint={C.violet} label="Langue" value="Français" />
        <Row icon="notifications-outline" tint={C.blue} label="Notifications" onPress={() => open(LINKS.settings)} external />
        <Row icon="shield-checkmark-outline" tint={C.violet} label="Sécurité" onPress={() => open(LINKS.settings)} external last />
      </View>

      <Text style={styles.groupLabel}>Support</Text>
      <View style={styles.group}>
        <Row icon="help-buoy-outline" tint={C.blue} label="Aide & support" value="contact@chapcam.com" onPress={() => open(LINKS.support)} />
        <Row icon="document-text-outline" tint={C.violet} label="Conditions d'utilisation" onPress={() => open(LINKS.terms)} external />
        <Row icon="lock-closed-outline" tint={C.blue} label="Politique de confidentialité" onPress={() => open(LINKS.privacy)} external last />
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={confirmSignOut}
        style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}
      >
        <Ionicons name="log-out-outline" size={18} color={DANGER} />
        <Text style={styles.signOutText}>Se déconnecter</Text>
      </Pressable>

      <View style={styles.appInfo}>
        <Text style={styles.appName}>ChapCam</Text>
        {appVersion ? (
          <Text style={styles.version}>
            Version {appVersion}
            {buildNumber ? ` (${buildNumber})` : ''}
          </Text>
        ) : null}
      </View>
    </ScrollView>
  )
}

function Row({ icon, tint, label, value, onPress, external, last }) {
  const interactive = typeof onPress === 'function'
  const body = (
    <>
      <View style={[styles.rowIcon, { backgroundColor: tint === C.violet ? '#F1ECFF' : '#EEF3FF' }]}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <Text style={styles.rowLabel} numberOfLines={1}>{label}</Text>
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
  pressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },
  title: { color: C.ink, fontSize: 30, fontWeight: '900', letterSpacing: -0.8, marginTop: 6, marginBottom: 16 },

  hero: { backgroundColor: C.white, borderRadius: 26, borderWidth: 1, borderColor: C.line, overflow: 'hidden', ...shadow, shadowOpacity: 0.08 },
  heroBand: { height: 74 },
  heroBody: { alignItems: 'center', paddingHorizontal: 16, paddingBottom: 18, marginTop: -40 },
  avatarRing: { padding: 4, borderRadius: 46, backgroundColor: C.white, marginBottom: 10 },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: C.white, fontSize: 32, fontWeight: '900' },
  name: { color: C.ink, fontSize: 18, fontWeight: '800', letterSpacing: -0.3, maxWidth: '100%' },
  emailSub: { color: C.muted, fontSize: 13, fontWeight: '600', marginTop: 2, maxWidth: '100%' },
  heroLoader: { marginTop: 12 },
  heroChips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 12 },
  planChip: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 28, paddingHorizontal: 11, borderRadius: 14, backgroundColor: '#F1ECFF' },
  planChipText: { color: C.ink, fontSize: 13, fontWeight: '800' },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 28, paddingHorizontal: 11, borderRadius: 14 },
  statusOn: { backgroundColor: '#E6F8EF' },
  statusOff: { backgroundColor: '#EEF1F7' },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: '800' },

  groupLabel: { color: C.muted, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 24, marginBottom: 8, marginLeft: 4 },

  balances: { flexDirection: 'row', gap: 12 },
  balance: { flex: 1, backgroundColor: C.white, borderRadius: 22, padding: 14, borderWidth: 1, borderColor: C.line, gap: 8, ...shadow, shadowOpacity: 0.06 },
  balanceHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  jetonsLogo: { width: 28, height: 28, borderRadius: 9, backgroundColor: '#0A1024' },
  liveIcon: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  balanceTitle: { color: C.ink, fontSize: 14, fontWeight: '800' },
  balanceValue: { color: C.ink, fontSize: 24, fontWeight: '900', letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
  balanceLoader: { alignSelf: 'flex-start', height: 30 },
  balanceHint: { color: C.muted, fontSize: 12, fontWeight: '600', lineHeight: 16 },

  sub: { borderRadius: 24, padding: 16, gap: 14, ...shadow, shadowOpacity: 0.18 },
  subTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  subIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  subEyebrow: { color: '#AEB8DA', fontSize: 12, fontWeight: '700' },
  subPlan: { color: C.white, fontSize: 18, fontWeight: '900', letterSpacing: -0.3, marginTop: 1 },
  subBadge: { height: 26, paddingHorizontal: 10, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  subBadgeOn: { backgroundColor: 'rgba(52, 211, 153, 0.18)' },
  subBadgeOff: { backgroundColor: 'rgba(255, 255, 255, 0.12)' },
  subBadgeText: { color: C.white, fontSize: 12, fontWeight: '800' },
  subDate: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255, 255, 255, 0.07)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  subDateText: { color: '#DCE2F5', fontSize: 13, fontWeight: '600' },
  subCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 16, backgroundColor: C.white },
  subCtaText: { color: C.ink, fontSize: 15, fontWeight: '800' },

  group: { backgroundColor: C.white, borderRadius: 22, borderWidth: 1, borderColor: C.line, overflow: 'hidden', ...shadow, shadowOpacity: 0.05 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 14 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#DCE3F1' },
  rowPressed: { backgroundColor: '#F2F6FF' },
  rowIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, color: C.ink, fontSize: 15, fontWeight: '700' },
  rowValue: { color: C.muted, fontSize: 13, fontWeight: '600', maxWidth: 160 },

  signOut: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, marginTop: 24, borderRadius: 16, backgroundColor: '#FFF1F1', borderWidth: 1, borderColor: '#FFDADB' },
  signOutText: { color: DANGER, fontSize: 15, fontWeight: '800' },

  appInfo: { alignItems: 'center', gap: 2, marginTop: 18 },
  appName: { color: '#5D6785', fontSize: 13, fontWeight: '800' },
  version: { color: '#A3ACC4', fontSize: 12, fontWeight: '600' },
})
