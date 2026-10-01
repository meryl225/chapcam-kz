import React, { useState } from 'react'
import { ActivityIndicator, Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as ImagePicker from 'expo-image-picker'
import * as WebBrowser from 'expo-web-browser'
import Constants from 'expo-constants'
import { BRAND, C, PAD, shadow } from '../ui/catalog'

const WEB_URL = (process.env.EXPO_PUBLIC_API_URL ?? Constants.expoConfig?.extra?.apiUrl ?? 'https://chapcam.com').replace(/\/$/, '')
const SESSION_URL = `${WEB_URL}/dashboard/live-swap`
const PLANS_URL = `${WEB_URL}/dashboard/plans`

const formatPlan = (plan) => (plan ? plan.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : null)

export function LiveSwapScreen({ onBack, topInset, bottomInset, subscription }) {
  const [permission, requestPermission] = useCameraPermissions()
  const [facing, setFacing] = useState('front')
  const [mirror, setMirror] = useState(true)
  const [face, setFace] = useState(null)
  const [session, setSession] = useState('idle')

  const granted = permission?.granted === true
  const canAskAgain = permission?.canAskAgain !== false
  const busy = session === 'connecting'

  const planName = formatPlan(subscription?.plan)
  const planActive = Boolean(subscription && (subscription.is_active === true || subscription.status === 'active'))

  const pickFace = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      })
      if (!res.canceled && res.assets?.[0]?.uri) setFace(res.assets[0].uri)
    } catch {
      Alert.alert('Visage', "Impossible d'ouvrir tes photos. Vérifie l'accès dans Réglages.")
    }
  }

  const askCamera = () => (canAskAgain ? requestPermission() : Linking.openSettings())

  const start = async () => {
    if (!granted) return askCamera()
    setSession('connecting')
    try {
      await WebBrowser.openBrowserAsync(SESSION_URL, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        controlsColor: C.blue,
        dismissButtonStyle: 'close',
      })
      setSession('ended')
    } catch {
      setSession('failed')
    }
  }

  const showHelp = () =>
    Alert.alert(
      'Live Swap',
      'Choisis un visage, cadre-toi bien dans la lumière puis lance la session. Le temps utilisé est décompté de tes points ChapCam.',
    )

  return (
    <View style={[styles.root, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Retour" hitSlop={10} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={C.ink} />
        </Pressable>
        <View style={styles.flex}>
          <Text style={styles.title} accessibilityRole="header">Live Swap</Text>
          <Text style={styles.subtitle}>Change de visage en temps réel</Text>
        </View>
        <Pressable onPress={showHelp} accessibilityRole="button" accessibilityLabel="Aide" hitSlop={10} style={styles.headerBtn}>
          <Ionicons name="information-circle-outline" size={24} color={C.ink} />
        </Pressable>
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.preview}>
          {granted ? (
            <CameraView style={StyleSheet.absoluteFill} facing={facing} mirror={facing === 'front' && mirror} active={!busy} />
          ) : (
            <PermissionState loading={!permission} canAskAgain={canAskAgain} onPress={askCamera} />
          )}

          {granted ? (
            <View style={styles.sideControls}>
              <Pressable
                onPress={() => setFacing((f) => (f === 'front' ? 'back' : 'front'))}
                accessibilityRole="button"
                accessibilityLabel={facing === 'front' ? 'Passer à la caméra arrière' : 'Passer à la caméra avant'}
                style={styles.control}
              >
                <Ionicons name="camera-reverse-outline" size={20} color={C.white} />
              </Pressable>
            </View>
          ) : null}

          {granted && face ? (
            <View style={styles.pip} accessibilityLabel="Visage source sélectionné">
              <Image source={{ uri: face }} style={StyleSheet.absoluteFill} />
            </View>
          ) : null}

          {busy ? (
            <View style={styles.overlay}>
              <ActivityIndicator color={C.white} />
              <Text style={styles.overlayText}>Connexion à la session…</Text>
            </View>
          ) : null}
        </View>

        <SessionNotice session={session} onDismiss={() => setSession('idle')} />

        <Text style={styles.sectionTitle}>Choisir un visage</Text>
        {face ? (
          <View style={styles.faceRow}>
            <View style={[styles.face, styles.faceActive]}>
              <Image source={{ uri: face }} style={styles.faceImage} accessibilityLabel="Visage source" />
            </View>
            <View style={styles.flex}>
              <Text style={styles.faceTitle}>Visage prêt</Text>
              <Text style={styles.faceCopy}>Photo nette, de face, bien éclairée.</Text>
            </View>
            <Pressable onPress={pickFace} accessibilityRole="button" hitSlop={8} style={styles.textBtn}>
              <Text style={styles.textBtnLabel}>Changer</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={pickFace} accessibilityRole="button" accessibilityLabel="Ajouter un visage" style={({ pressed }) => [styles.faceEmpty, pressed && styles.pressed]}>
            <View style={styles.addIcon}><Ionicons name="add" size={22} color={C.blue} /></View>
            <View style={styles.flex}>
              <Text style={styles.faceTitle}>Ajouter</Text>
              <Text style={styles.faceCopy}>Ajoute un visage pour commencer.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.muted} />
          </Pressable>
        )}

        {granted && facing === 'front' ? (
          <>
            <Text style={styles.sectionTitle}>Réglages</Text>
            <View style={styles.card}>
              <View style={styles.settingRow}>
                <View style={styles.settingIcon}><Ionicons name="swap-horizontal" size={18} color={C.blue} /></View>
                <View style={styles.flex}>
                  <Text style={styles.settingLabel}>Effet miroir</Text>
                  <Text style={styles.settingHint}>Aperçu comme dans un miroir</Text>
                </View>
                <Switch value={mirror} onValueChange={setMirror} trackColor={{ true: C.blue, false: C.line }} accessibilityLabel="Effet miroir" />
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(bottomInset, 16) }]}>
        {subscription !== undefined ? (
          <View style={styles.account}>
            <Ionicons name={planActive ? 'shield-checkmark' : 'shield-outline'} size={16} color={planActive ? C.blue : C.muted} />
            <Text style={styles.accountText} numberOfLines={1}>
              {planActive && planName ? `ChapCam ${planName}` : 'Aucun forfait actif'}
            </Text>
            {!planActive ? (
              <Pressable onPress={() => WebBrowser.openBrowserAsync(PLANS_URL)} accessibilityRole="link" hitSlop={8}>
                <Text style={styles.textBtnLabel}>Voir les forfaits</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        <Pressable
          onPress={start}
          disabled={busy}
          accessibilityRole="button"
          accessibilityState={{ disabled: busy, busy }}
          style={({ pressed }) => [pressed && styles.pressed, busy && styles.dim]}
        >
          <LinearGradient colors={BRAND} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cta}>
            <Ionicons name={granted ? 'videocam' : 'camera-outline'} size={20} color={C.white} />
            <Text style={styles.ctaText}>{granted ? 'Démarrer Live Swap' : 'Autoriser la caméra'}</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  )
}

function PermissionState({ loading, canAskAgain, onPress }) {
  return (
    <View style={styles.permission}>
      {loading ? (
        <ActivityIndicator color={C.white} />
      ) : (
        <>
          <View style={styles.permissionIcon}><Ionicons name="camera-outline" size={26} color={C.white} /></View>
          <Text style={styles.permissionTitle}>Caméra requise</Text>
          <Text style={styles.permissionCopy}>
            {canAskAgain ? "Autorise l'accès pour voir ton aperçu en direct." : "L'accès a été refusé. Active-le dans Réglages."}
          </Text>
          <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.permissionBtn, pressed && styles.pressed]}>
            <Text style={styles.permissionBtnText}>{canAskAgain ? 'Autoriser' : 'Ouvrir Réglages'}</Text>
          </Pressable>
        </>
      )}
    </View>
  )
}

function SessionNotice({ session, onDismiss }) {
  if (session !== 'ended' && session !== 'failed') return null
  const failed = session === 'failed'
  return (
    <View style={[styles.notice, failed && styles.noticeError]} accessibilityLiveRegion="polite">
      <Ionicons name={failed ? 'alert-circle' : 'checkmark-circle'} size={18} color={failed ? '#E5484D' : C.blue} />
      <Text style={styles.noticeText}>{failed ? 'Connexion impossible. Réessaie dans un instant.' : 'Session terminée.'}</Text>
      <Pressable onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Fermer" hitSlop={10}>
        <Ionicons name="close" size={18} color={C.muted} />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  pressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
  dim: { opacity: 0.6 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: PAD - 6, height: 56 },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { color: C.ink, fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  subtitle: { color: C.muted, fontSize: 12, marginTop: 1 },
  content: { paddingHorizontal: PAD, paddingTop: 4, paddingBottom: 24 },

  preview: { aspectRatio: 3 / 4, borderRadius: 28, overflow: 'hidden', backgroundColor: '#11173A', borderWidth: 1, borderColor: 'rgba(30,107,255,0.18)', ...shadow },
  sideControls: { position: 'absolute', top: 14, right: 14, gap: 10 },
  control: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(14,21,48,0.55)', alignItems: 'center', justifyContent: 'center' },
  pip: { position: 'absolute', right: 14, bottom: 14, width: '26%', aspectRatio: 1, borderRadius: 18, overflow: 'hidden', borderWidth: 2, borderColor: C.white, backgroundColor: '#11173A' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(14,21,48,0.6)', alignItems: 'center', justifyContent: 'center', gap: 10 },
  overlayText: { color: C.white, fontSize: 14, fontWeight: '600' },

  permission: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 8 },
  permissionIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  permissionTitle: { color: C.white, fontSize: 17, fontWeight: '800' },
  permissionCopy: { color: 'rgba(255,255,255,0.72)', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  permissionBtn: { marginTop: 10, backgroundColor: C.white, borderRadius: 999, paddingHorizontal: 22, height: 44, justifyContent: 'center' },
  permissionBtnText: { color: C.ink, fontSize: 15, fontWeight: '700' },

  notice: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, backgroundColor: C.white, borderRadius: 16, borderWidth: 1, borderColor: C.line, paddingHorizontal: 14, minHeight: 48 },
  noticeError: { borderColor: '#F7C9CB' },
  noticeText: { flex: 1, color: C.ink, fontSize: 14, fontWeight: '600' },

  sectionTitle: { color: C.ink, fontSize: 17, fontWeight: '800', letterSpacing: -0.3, marginTop: 22, marginBottom: 12 },
  faceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.white, borderRadius: 18, borderWidth: 1, borderColor: C.line, padding: 10 },
  faceEmpty: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.white, borderRadius: 18, borderWidth: 1, borderColor: C.line, borderStyle: 'dashed', padding: 10 },
  addIcon: { width: 56, height: 56, borderRadius: 14, backgroundColor: '#E8F0FF', alignItems: 'center', justifyContent: 'center' },
  face: { width: 56, height: 56, borderRadius: 16, padding: 2, borderWidth: 2, borderColor: 'transparent' },
  faceActive: { borderColor: C.blue },
  faceImage: { flex: 1, borderRadius: 12, backgroundColor: C.line },
  faceTitle: { color: C.ink, fontSize: 15, fontWeight: '700' },
  faceCopy: { color: C.muted, fontSize: 13, marginTop: 2 },
  textBtn: { paddingHorizontal: 6, height: 44, justifyContent: 'center' },
  textBtnLabel: { color: C.blue, fontSize: 14, fontWeight: '700' },

  card: { backgroundColor: C.white, borderRadius: 18, borderWidth: 1, borderColor: C.line, paddingHorizontal: 14 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60 },
  settingIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#E8F0FF', alignItems: 'center', justifyContent: 'center' },
  settingLabel: { color: C.ink, fontSize: 15, fontWeight: '700' },
  settingHint: { color: C.muted, fontSize: 12, marginTop: 1 },

  footer: { paddingHorizontal: PAD, paddingTop: 12, gap: 10, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.line },
  account: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 2 },
  accountText: { flex: 1, color: C.ink, fontSize: 13, fontWeight: '600' },
  cta: { height: 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  ctaText: { color: C.white, fontSize: 16, fontWeight: '800' },
})
