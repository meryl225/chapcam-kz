import React, { useCallback, useEffect, useState } from 'react'
import { ActionSheetIOS, ActivityIndicator, Alert, Image, Linking, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import Constants from 'expo-constants'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'
import { apiForm, apiJson, friendlyError, readApiError } from '../lib/api'
import { unregisterPushToken } from '../lib/pushNotifications'
import { getUserAvatarSource, getUserPhotoUrl } from '../lib/userAvatar'
import { AccountSummaryError, accountSummaryMessage, fetchAccountSummary } from '../lib/accountSummary'
import { BRAND, C, PAD } from '../ui/catalog'
import { ChapCamLoader } from '../ui/ChapCamLoader'
import { ReportAbuseSheet } from '../ui/Safety'
import { SupportSheet } from '../ui/SupportSheet'

const WEB_URL = (process.env.EXPO_PUBLIC_API_URL ?? Constants.expoConfig?.extra?.apiUrl ?? 'https://chapcam.com').replace(/\/$/, '')
const DANGER = '#E5484D'
// Exact copy of chapcam.com public/images/jetons-logo.png, bundled so it never depends on the network.
const JETONS_LOGO = require('../../assets/jetons-logo.png')
const CHAPCAM_MARK = require('../../assets/chapcam-mark.png')

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

const fmtClock = (points, pointsPerSecond = POINTS_PER_SECOND) => {
  const totalSeconds = Math.floor(points / pointsPerSecond)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
const fmtMinutes = (points, pointsPerSecond = POINTS_PER_SECOND) => `${fmtClock(points, pointsPerSecond)} min`

const formatDate = (value) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

const formatMemberSince = (value) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

const open = async (url) => {
  try {
    await Linking.openURL(url)
  } catch {
    Alert.alert('Lien indisponible', "Impossible d'ouvrir ce lien sur cet appareil.")
  }
}

const openNotificationSettings = async () => {
  try {
    await Linking.openSettings()
  } catch {
    Alert.alert('Réglages indisponibles', 'Ouvre Réglages > ChapCam > Notifications sur ton iPhone.')
  }
}

function useAccountSummary() {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setSummary(await fetchAccountSummary())
    } catch (e) {
      setSummary(null)
      setError(e instanceof AccountSummaryError ? e : new AccountSummaryError('server', e?.message))
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { load() }, [load])
  return { summary, loading, error, reload: load }
}

export function ProfileScreen({ user, subscription, loading, refreshing, onRefresh, onOpenAccountDetail, onOpenPlans, onOpenTokens }) {
  const account = useAccountSummary()
  const insets = useSafeAreaInsets()
  const [avatarFailed, setAvatarFailed] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [reporting, setReporting] = useState(false)
  const [supportOpen, setSupportOpen] = useState(false)
  // undefined = follow the session user's metadata; string/null = result of an edit made on this screen.
  const [editedAvatarUrl, setEditedAvatarUrl] = useState(undefined)
  const [avatarBusy, setAvatarBusy] = useState(false)

  // Live Swap + plan come from the same Supabase `subscriptions` row the website dashboard reads
  // (loaded by AuthenticatedHome under the user's session / RLS). Jetons live in the Neon
  // `jetons_wallets` table and can only be read server-side through /api/mobile/account-summary.
  const accountSubscription = account.summary?.subscription ?? subscription ?? null
  const subscriptionLoading = account.loading || Boolean(loading && !account.summary)
  const jetonsLoading = account.loading
  const jetonsError = account.error

  const email = user?.email ?? ''
  const metaName = user?.user_metadata?.full_name || user?.user_metadata?.name || null
  const initial = ((metaName || email).trim().charAt(0) || 'C').toUpperCase()
  const avatarUrl = editedAvatarUrl !== undefined ? editedAvatarUrl : getUserPhotoUrl(user)
  const hasCustomAvatar = Boolean(avatarUrl && !avatarFailed)
  const avatarSource = hasCustomAvatar ? { uri: avatarUrl } : getUserAvatarSource(user)

  const applyAvatar = async (url) => {
    setAvatarFailed(false)
    setEditedAvatarUrl(url)
    // Pull the new user_metadata into the session so every screen sees the same photo.
    await supabase.auth.refreshSession().catch(() => {})
  }

  const uploadAvatar = async (asset) => {
    setAvatarBusy(true)
    try {
      const type = asset.mimeType || 'image/jpeg'
      const extension = type.split('/')[1] || 'jpg'
      const form = new FormData()
      form.append('file', { uri: asset.uri, name: asset.fileName || `avatar.${extension}`, type })
      const response = await apiForm('/api/mobile/avatar', form)
      if (!response.ok) throw new Error(await readApiError(response, 'Impossible d’enregistrer la photo.'))
      const body = await response.json()
      await applyAvatar(body.avatar_url)
    } catch (error) {
      Alert.alert('Photo non enregistrée', friendlyError(error, 'Impossible d’enregistrer la photo. Réessaie dans un instant.'))
    } finally {
      setAvatarBusy(false)
    }
  }

  const pickAvatar = async (source) => {
    const permission = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert(
        'Accès refusé',
        source === 'camera'
          ? 'Autorise l’accès à la caméra dans Réglages > ChapCam pour prendre ta photo de profil.'
          : 'Autorise l’accès à tes photos dans Réglages > ChapCam pour choisir ta photo de profil.',
        [{ text: 'Annuler', style: 'cancel' }, { text: 'Ouvrir les Réglages', onPress: () => Linking.openSettings() }],
      )
      return
    }
    const options = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 }
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ ...options, cameraType: ImagePicker.CameraType.front })
      : await ImagePicker.launchImageLibraryAsync(options)
    if (!result.canceled && result.assets?.[0]) await uploadAvatar(result.assets[0])
  }

  const removeAvatar = async () => {
    setAvatarBusy(true)
    try {
      const { response, body } = await apiJson('/api/mobile/avatar', { method: 'DELETE' })
      if (!response.ok) throw new Error(body?.error || 'Impossible de retirer la photo.')
      await applyAvatar(null)
    } catch (error) {
      Alert.alert('Photo non retirée', friendlyError(error, 'Impossible de retirer la photo. Réessaie dans un instant.'))
    } finally {
      setAvatarBusy(false)
    }
  }

  const openAvatarMenu = () => {
    if (avatarBusy) return
    const actions = [
      { label: 'Choisir dans mes photos', run: () => pickAvatar('library') },
      { label: 'Prendre une photo', run: () => pickAvatar('camera') },
      ...(hasCustomAvatar ? [{ label: 'Retirer ma photo', destructive: true, run: removeAvatar }] : []),
    ]
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: 'Photo de profil',
          options: [...actions.map((a) => a.label), 'Annuler'],
          cancelButtonIndex: actions.length,
          destructiveButtonIndex: actions.findIndex((a) => a.destructive),
        },
        (index) => actions[index]?.run(),
      )
      return
    }
    Alert.alert('Photo de profil', undefined, [
      ...actions.map((a) => ({ text: a.label, style: a.destructive ? 'destructive' : 'default', onPress: a.run })),
      { text: 'Annuler', style: 'cancel' },
    ])
  }
  const memberSince = formatMemberSince(user?.created_at)

  const planKey = accountSubscription?.plan || null
  const expiration = accountSubscription?.expires_at || accountSubscription?.end_date || null
  const endTime = expiration ? new Date(expiration).getTime() : null
  const expired = endTime !== null && !Number.isNaN(endTime) && endTime < Date.now()
  const isActive = Boolean(accountSubscription && planKey && planKey !== 'free' && (accountSubscription.is_active === true || accountSubscription.status === 'active') && !expired)
  const planLabel = isActive ? PLAN_LABELS[planKey] || planKey : null
  const endDate = isActive ? formatDate(accountSubscription?.end_date) : null
  const livePoints = typeof account.summary?.live_swap?.points === 'number'
    ? account.summary.live_swap.points
    : typeof accountSubscription?.points === 'number'
      ? (expired ? 0 : accountSubscription.points)
      : null
  const livePointsPerSecond = account.summary?.live_swap?.points_per_second || POINTS_PER_SECOND
  const jetonsBalance = typeof account.summary?.jetons === 'number' ? account.summary.jetons : null

  const appVersion = Constants.nativeAppVersion ?? Constants.expoConfig?.version ?? null
  const buildNumber = Constants.nativeBuildVersion ?? Constants.expoConfig?.ios?.buildNumber ?? null

  const handleRefresh = () => {
    account.reload()
    onRefresh?.()
  }

  const confirmSignOut = () =>
    Alert.alert('Se déconnecter ?', 'Tu devras te reconnecter pour accéder à ton studio.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: async () => { await unregisterPushToken(); supabase.auth.signOut() } },
    ])

  const deleteAccount = async () => {
    setDeleting(true)
    try {
      const { response, body } = await apiJson('/api/mobile/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      })
      if (!response.ok || body?.deleted !== true) {
        throw new Error(body?.error || `Erreur HTTP ${response.status}`)
      }
      await supabase.auth.signOut({ scope: 'local' })
    } catch (error) {
      setDeleting(false)
      Alert.alert('Suppression impossible', friendlyError(error, 'Suppression impossible pour le moment. Réessaie ou contacte contact@chapcam.com.'))
    }
  }

  const confirmDeleteAccount = () =>
    Alert.alert(
      'Supprimer définitivement votre compte ?',
      'Cette action supprimera votre compte ChapCam et les données personnelles associées. Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer définitivement', style: 'destructive', onPress: deleteAccount },
      ],
    )

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.content, { paddingBottom: 120 + insets.bottom }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.blue} />}
    >
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={styles.title} accessibilityRole="header">Mon profil</Text>
          <Text style={styles.subtitle}>Gérez votre compte et vos avantages</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Paramètres du compte"
          onPress={() => open(LINKS.settings)}
          hitSlop={8}
          style={({ pressed }) => [styles.settingsBtn, pressed && styles.pressed]}
        >
          <Ionicons name="settings-outline" size={22} color={C.ink} />
        </Pressable>
      </View>

      <LinearGradient colors={[NAVY, NAVY_2, '#2A2A8C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.card, styles.hero]}>
        <View style={styles.heroClip} pointerEvents="none">
          <Image source={CHAPCAM_MARK} style={styles.heroMark} resizeMode="contain" accessibilityIgnoresInvertColors />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Modifier la photo de profil"
          accessibilityHint="Choisir une photo, en prendre une ou retirer la photo actuelle"
          accessibilityState={{ busy: avatarBusy }}
          onPress={openAvatarMenu}
          hitSlop={6}
          style={({ pressed }) => [styles.avatarRing, pressed && styles.pressed]}
        >
          <LinearGradient colors={BRAND} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
            <Image
              key={hasCustomAvatar ? avatarUrl : 'default'}
              source={avatarSource}
              style={styles.avatarPhoto}
              resizeMode={hasCustomAvatar ? 'cover' : 'contain'}
              onError={() => setAvatarFailed(true)}
              accessibilityIgnoresInvertColors
            />
            {avatarBusy ? (
              <View style={styles.avatarBusy}>
                <ActivityIndicator color={C.white} />
              </View>
            ) : null}
          </LinearGradient>
          <View style={styles.avatarEdit} pointerEvents="none">
            <Ionicons name={hasCustomAvatar ? 'pencil' : 'camera'} size={12} color={C.white} />
          </View>
        </Pressable>
        <View style={styles.heroInfo}>
          <View style={styles.identityEyebrow}>
            <Text style={styles.identityEyebrowText}>COMPTE CHAPCAM</Text>
            <View style={styles.identityLine} />
          </View>
          {metaName ? <Text style={styles.heroName} numberOfLines={1}>{metaName}</Text> : null}
          <Text style={metaName ? styles.heroEmailSub : styles.heroName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{email}</Text>
          <Text style={styles.avatarHint} numberOfLines={1}>{hasCustomAvatar ? 'Ma photo de profil' : 'Touchez l’avatar pour ajouter votre photo'}</Text>
          {subscriptionLoading ? (
            <ChapCamLoader size="small" tone="light" style={styles.heroLoader} />
          ) : (
            <View style={styles.heroChips}>
              <View style={[styles.status, isActive ? styles.statusOn : styles.statusOff]}>
                <View style={[styles.statusDot, { backgroundColor: isActive ? '#34D399' : '#AEB8DA' }]} />
                <Text style={styles.statusText}>{isActive ? 'Actif' : 'Inactif'}</Text>
              </View>
            </View>
          )}
          {memberSince ? <Text style={styles.memberSince}>Membre depuis {memberSince}</Text> : null}
        </View>
      </LinearGradient>

      {jetonsError ? (
        <View style={styles.summaryError}>
          <Text style={styles.summaryErrorText}>{accountSummaryMessage(jetonsError)}</Text>
          {jetonsError.kind === 'session' ? (
            <Pressable onPress={() => supabase.auth.signOut()} style={styles.retry} accessibilityRole="button">
              <Ionicons name="log-in-outline" size={14} color={C.blue} />
              <Text style={styles.retryText}>Se reconnecter</Text>
            </Pressable>
          ) : (
            <Pressable onPress={account.reload} style={styles.retry} accessibilityRole="button">
              <Ionicons name="refresh" size={14} color={C.blue} />
              <Text style={styles.retryText}>Réessayer</Text>
            </Pressable>
          )}
        </View>
      ) : null}

      <View style={styles.balances}>
        <LinearGradient colors={[NAVY, NAVY_2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.card, styles.balance]}>
          <View style={styles.balanceHead}>
            <LinearGradient colors={BRAND} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.balanceIcon}>
              <Image source={JETONS_LOGO} style={styles.jetonsLogoImage} accessibilityIgnoresInvertColors />
            </LinearGradient>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="À propos des Jetons"
              hitSlop={8}
              onPress={() => Alert.alert('Jetons', 'Les Jetons sont utilisés par tous les outils ChapCam, sauf Live Swap.')}
            >
              <Ionicons name="information-circle-outline" size={20} color={MUTED_ON_DARK} />
            </Pressable>
          </View>
          <Text style={styles.balanceTitle}>Jetons</Text>
          {jetonsLoading ? (
            <ChapCamLoader size="small" tone="light" style={styles.balanceLoader} />
          ) : jetonsError || jetonsBalance === null ? (
            <Text style={styles.balanceUnavailable}>Indisponible</Text>
          ) : (
            <Text style={styles.balanceValue} numberOfLines={1} adjustsFontSizeToFit>{jetonsBalance.toLocaleString('fr-FR')}</Text>
          )}
          <Text style={styles.balanceHint}>Disponible pour tous les outils, hors Live Swap.</Text>
          <View style={styles.flexFill} />
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Acheter des jetons. Solde actuel : ${jetonsBalance ?? 'indisponible'}`}
            onPress={onOpenTokens}
            style={({ pressed }) => [pressed && styles.pressed]}
          >
            <LinearGradient colors={[C.blue, '#4B5BFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.balanceCta}>
              <Text style={styles.balanceCtaText} numberOfLines={1}>Acheter des Jetons</Text>
              <View style={styles.balanceCtaPlus}>
                <Ionicons name="add" size={16} color={C.blue} />
              </View>
            </LinearGradient>
          </Pressable>
        </LinearGradient>

        <LinearGradient colors={[NAVY, NAVY_2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.card, styles.balance]}>
          <View style={styles.balanceHead}>
            <LinearGradient colors={BRAND} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.balanceIcon}>
              <Ionicons name="videocam" size={20} color={C.white} />
            </LinearGradient>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="À propos de Live Swap"
              hitSlop={8}
              onPress={() => Alert.alert('Live Swap', 'Les minutes Live Swap sont incluses dans ton forfait Live Swap et sont distinctes des Jetons.')}
            >
              <Ionicons name="information-circle-outline" size={20} color={MUTED_ON_DARK} />
            </Pressable>
          </View>
          <Text style={styles.balanceTitle}>Live Swap</Text>
          {subscriptionLoading ? (
            <ChapCamLoader size="small" tone="light" style={styles.balanceLoader} />
          ) : livePoints !== null ? (
            <View>
              <Text style={styles.balanceValue} numberOfLines={1} adjustsFontSizeToFit accessibilityLabel={fmtMinutes(livePoints, livePointsPerSecond)}>
                {fmtClock(livePoints, livePointsPerSecond)}
              </Text>
              <Text style={styles.balanceUnit}>minutes restantes</Text>
            </View>
          ) : (
            <Text style={styles.balanceEmpty}>Aucun forfait</Text>
          )}
          <Text style={styles.balanceHint}>
            {livePoints !== null ? 'Temps restant dans votre forfait.' : 'Aucun forfait Live Swap'}
          </Text>
          <View style={styles.flexFill} />
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Voir les options Live Swap"
            onPress={onOpenPlans}
            style={({ pressed }) => [styles.balanceCtaLight, pressed && styles.pressed]}
          >
              <Text style={styles.balanceCtaLightText} numberOfLines={1}>Gérer Live Swap</Text>
            <Ionicons name="arrow-forward" size={16} color={C.violet} />
          </Pressable>
        </LinearGradient>
      </View>

      <LinearGradient colors={[NAVY, NAVY_2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.card, styles.sub]}>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`Mon abonnement : ${planLabel || 'Aucun forfait'}`}
          onPress={onOpenPlans}
          style={styles.subTop}
        >
          <LinearGradient colors={BRAND} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.subIcon}>
            <Ionicons name="diamond" size={30} color={C.white} />
          </LinearGradient>
          <View style={styles.flex}>
            <Text style={styles.subEyebrow}>Mon abonnement</Text>
            {subscriptionLoading ? (
              <ChapCamLoader size="small" tone="light" style={styles.balanceLoader} />
            ) : (
              <>
                <Text style={styles.subPlan} numberOfLines={1}>{planLabel || 'Aucun forfait'}</Text>
                <Text style={styles.subDesc}>
                  {isActive
                    ? endDate
                      ? `Valable jusqu'au ${endDate}`
                      : 'Votre forfait est actif.'
                    : 'Profitez de tous les avantages ChapCam avec un forfait adapté à vos besoins.'}
                </Text>
              </>
            )}
          </View>
          <Ionicons name="chevron-forward" size={20} color={C.white} />
        </Pressable>

        {!subscriptionLoading ? (
          <Pressable
            accessibilityRole="link"
            accessibilityHint="Ouvre les forfaits ChapCam avec paiement Apple"
onPress={onOpenPlans}
  style={({ pressed }) => [pressed && styles.pressed]}
  >
  <LinearGradient colors={[C.blue, C.violet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.subCta}>
  <Text style={styles.subCtaText}>{isActive ? 'Gérer mon abonnement' : 'Découvrir les forfaits'}</Text>
              <Ionicons name="arrow-forward" size={18} color={C.white} />
            </LinearGradient>
          </Pressable>
        ) : null}
      </LinearGradient>

      <Text style={styles.sectionTitle} accessibilityRole="header">Paramètres du compte</Text>
      <View style={styles.rows}>
        <Row icon="person-outline" tint={C.blue} label="Informations personnelles" onPress={() => open(LINKS.settings)} />
        <Row icon="shield-half-outline" tint={C.violet} label="Sécurité et confidentialité" onPress={() => open(LINKS.settings)} />
        <Row icon="pulse-outline" tint={C.violet} label="Activité récente" onPress={() => onOpenAccountDetail?.('activity')} />
        <Row icon="wallet-outline" tint={C.blue} label="Achats et factures" onPress={() => onOpenAccountDetail?.('purchases')} />
        <Row icon="notifications-outline" tint={WARM} label="Notifications" onPress={openNotificationSettings} />
      </View>

      <Text style={styles.sectionTitle} accessibilityRole="header">Support</Text>
      <View style={styles.rows}>
        {Platform.OS === 'ios' ? (
          <Row icon="headset-outline" tint={C.blue} label="Service client" onPress={() => setSupportOpen(true)} />
        ) : (
          <Row icon="help-buoy-outline" tint={C.blue} label="Aide & support" value="contact@chapcam.com" onPress={() => open(LINKS.support)} />
        )}
        {Platform.OS === 'ios' ? (
          <Row icon="flag-outline" tint={C.violet} label="Signaler un contenu" onPress={() => setReporting(true)} />
        ) : null}
        <Row icon="document-text-outline" tint={C.violet} label="Conditions d'utilisation" onPress={() => open(LINKS.terms)} />
        <Row icon="lock-closed-outline" tint={C.blue} label="Politique de confidentialité" onPress={() => open(LINKS.privacy)} />
        <Row icon="language-outline" tint={C.violet} label="Langue" value="Français" />
      </View>
      {Platform.OS === 'ios' ? (
        <>
          <ReportAbuseSheet visible={reporting} onClose={() => setReporting(false)} contentUrl="" context="Profil" />
          <SupportSheet visible={supportOpen} onClose={() => setSupportOpen(false)} />
        </>
      ) : null}

      <Pressable
        accessibilityRole="button"
        onPress={confirmSignOut}
        style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}
      >
        <Ionicons name="log-out-outline" size={18} color={DANGER} />
        <Text style={styles.signOutText}>Se déconnecter</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: deleting, busy: deleting }}
        disabled={deleting}
        onPress={confirmDeleteAccount}
        style={({ pressed }) => [styles.deleteAccount, (pressed || deleting) && styles.pressed]}
      >
        {deleting ? (
          <ActivityIndicator size="small" color="#C98A8E" />
        ) : (
          <Ionicons name="trash-outline" size={15} color="#C98A8E" />
        )}
        <Text style={styles.deleteAccountText}>{deleting ? 'Suppression en cours…' : 'Supprimer mon compte'}</Text>
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


const TINT_BG = { [C.blue]: '#EAF1FF', [C.violet]: '#F1ECFF' }

function Row({ icon, tint, label, value, onPress }) {
  const interactive = typeof onPress === 'function'
  const body = (
    <>
      <View style={[styles.rowIcon, { backgroundColor: TINT_BG[tint] || '#FFF4E5' }]}>
        <Ionicons name={icon} size={19} color={tint} />
      </View>
      <Text style={styles.rowLabel} numberOfLines={1}>{label}</Text>
      {value ? <Text style={styles.rowValue} numberOfLines={1}>{value}</Text> : null}
      {interactive ? <Ionicons name="chevron-forward" size={18} color="#A8B1C8" /> : null}
    </>
  )
  if (!interactive) {
    return <View style={styles.row} accessible accessibilityLabel={value ? `${label}, ${value}` : label}>{body}</View>
  }
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      {body}
    </Pressable>
  )
}

const BG = '#F5F7FF'
const NAVY = '#0B1230'
const NAVY_2 = '#18205A'
const MUTED_ON_DARK = '#AEB8DA'
const WARM = '#F59E0B'

const cardShadow = {
  shadowColor: '#1B2A6B',
  shadowOpacity: 0.16,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 10 },
  elevation: 5,
}
const softShadow = {
  shadowColor: '#2A3A7A',
  shadowOpacity: 0.06,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 1,
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexFill: { flexGrow: 1 },
  content: { flexGrow: 1, backgroundColor: BG, paddingHorizontal: PAD, paddingTop: 8, gap: 14 },
  pressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },

  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 6, marginBottom: 4 },
  title: { color: C.ink, fontSize: 34, fontWeight: '900', letterSpacing: -1 },
  subtitle: { color: C.muted, fontSize: 15, fontWeight: '500', marginTop: 2, lineHeight: 21 },
  settingsBtn: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E9EDF9', marginTop: 2 },

  card: { borderRadius: 24, borderWidth: 1, borderColor: 'rgba(123, 77, 255, 0.35)', ...cardShadow },

  hero: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 18, minHeight: 148 },
  heroClip: { ...StyleSheet.absoluteFillObject, borderRadius: 23, overflow: 'hidden' },
  heroMark: { position: 'absolute', right: -40, top: 6, width: 230, height: 116, opacity: 0.32 },
  avatarRing: { padding: 3, borderRadius: 50, backgroundColor: 'rgba(255, 255, 255, 0.9)' },
  avatar: { width: 82, height: 82, borderRadius: 41, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarText: { color: C.white, fontSize: 34, fontWeight: '900' },
  avatarPhoto: { ...StyleSheet.absoluteFillObject, borderRadius: 41 },
  avatarBusy: { ...StyleSheet.absoluteFillObject, borderRadius: 41, backgroundColor: 'rgba(11, 16, 48, 0.55)', alignItems: 'center', justifyContent: 'center' },
  avatarEdit: { position: 'absolute', right: -2, bottom: -2, width: 28, height: 28, borderRadius: 14, backgroundColor: NAVY, borderWidth: 2, borderColor: C.white, alignItems: 'center', justifyContent: 'center' },
  heroInfo: { flex: 1, gap: 6, minWidth: 0 },
  identityEyebrow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 1 },
  identityEyebrowText: { color: '#AEB8DA', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  identityLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.18)' },
  heroName: { color: C.white, fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  heroEmailSub: { color: '#DCE2F5', fontSize: 14, fontWeight: '600' },
  avatarHint: { color: 'rgba(220,226,245,0.72)', fontSize: 11, fontWeight: '600' },
  heroLoader: { alignSelf: 'flex-start', height: 28 },
  heroChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 30, paddingHorizontal: 12, borderRadius: 15 },
  statusOn: { backgroundColor: 'rgba(52, 211, 153, 0.2)' },
  statusOff: { backgroundColor: 'rgba(255, 255, 255, 0.14)' },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { color: C.white, fontSize: 14, fontWeight: '800' },
  memberSince: { color: '#DCE2F5', fontSize: 13, fontWeight: '500' },

  summaryError: { gap: 4, marginHorizontal: 4 },
  summaryErrorText: { color: '#5D6785', fontSize: 14, lineHeight: 20 },
  retry: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6 },
  retryText: { color: C.blue, fontSize: 14, fontWeight: '800' },

  balances: { flexDirection: 'row', gap: 12 },
  balance: { flex: 1, padding: 14, gap: 6, minHeight: 230 },
  balanceHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 },
  balanceIcon: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  jetonsLogoImage: { width: '100%', height: '100%', transform: [{ scale: 1.25 }] },
  balanceTitle: { color: C.white, fontSize: 15, fontWeight: '700' },
  balanceValue: { color: C.white, fontSize: 30, fontWeight: '900', letterSpacing: -0.8, fontVariant: ['tabular-nums'] },
  balanceUnit: { color: '#DCE2F5', fontSize: 13, fontWeight: '600', marginTop: -2 },
  balanceUnavailable: { color: '#FF8A8E', fontSize: 18, fontWeight: '800' },
  balanceEmpty: { color: MUTED_ON_DARK, fontSize: 18, fontWeight: '800' },
  balanceLoader: { alignSelf: 'flex-start', height: 34 },
  balanceHint: { color: MUTED_ON_DARK, fontSize: 12, fontWeight: '500', lineHeight: 17 },
  balanceCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, height: 44, borderRadius: 22, paddingLeft: 14, paddingRight: 6, marginTop: 8 },
  balanceCtaText: { flexShrink: 1, color: C.white, fontSize: 13, fontWeight: '800' },
  balanceCtaPlus: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  balanceCtaLight: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, height: 44, borderRadius: 22, paddingHorizontal: 14, marginTop: 8, backgroundColor: '#E7E2FF' },
  balanceCtaLightText: { flexShrink: 1, color: NAVY, fontSize: 13, fontWeight: '800' },

  sub: { padding: 16, gap: 16 },
  subTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  subIcon: { width: 74, height: 74, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  subEyebrow: { color: MUTED_ON_DARK, fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  subPlan: { color: C.white, fontSize: 22, fontWeight: '900', letterSpacing: -0.4, marginTop: 2 },
  subDesc: { color: '#DCE2F5', fontSize: 13, fontWeight: '500', lineHeight: 19, marginTop: 4 },
  subCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 54, borderRadius: 27 },
  subCtaText: { color: C.white, fontSize: 16, fontWeight: '800' },

  sectionTitle: { color: C.ink, fontSize: 20, fontWeight: '900', letterSpacing: -0.4, marginTop: 10 },
  rows: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 60, paddingHorizontal: 16, borderRadius: 20, backgroundColor: C.white, borderWidth: 1, borderColor: C.line, ...softShadow },
  rowPressed: { backgroundColor: '#F2F6FF' },
  rowIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, color: C.ink, fontSize: 16, fontWeight: '600' },
  rowValue: { color: C.muted, fontSize: 13, fontWeight: '600', maxWidth: 150 },

  signOut: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 54, marginTop: 10, borderRadius: 20, backgroundColor: '#FFF1F1', borderWidth: 1, borderColor: '#FFDADB' },
  signOutText: { color: DANGER, fontSize: 15, fontWeight: '800' },
  deleteAccount: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 36, marginTop: 2, borderRadius: 14 },
  deleteAccountText: { color: '#C98A8E', fontSize: 13, fontWeight: '600' },

  appInfo: { alignItems: 'center', gap: 2, marginTop: 4 },
  appName: { color: '#5D6785', fontSize: 13, fontWeight: '800' },
  version: { color: '#A3ACC4', fontSize: 12, fontWeight: '600' },
})
