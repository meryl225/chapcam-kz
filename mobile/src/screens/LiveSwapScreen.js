import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, AppState, Image, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useCameraPermissions } from 'expo-camera'
import * as ImagePicker from 'expo-image-picker'
import * as WebBrowser from 'expo-web-browser'
import Constants from 'expo-constants'
import { BRAND, C, PAD, shadow } from '../ui/catalog'
import { ChapCamLoader } from '../ui/ChapCamLoader'
import { supabase } from '../lib/supabase'
import { loadDecart, mediaDevices, newSessionId, RTCView } from '../lib/realtime'
import { AiBadge, RightsConsent } from '../ui/Safety'

const WEB_URL = (process.env.EXPO_PUBLIC_API_URL ?? Constants.expoConfig?.extra?.apiUrl ?? 'https://chapcam.com').replace(/\/$/, '')
const PLANS_URL = `${WEB_URL}/dashboard/plans`

const RATE = 2
const HEARTBEAT_SECONDS = 5
const RESOLUTION = '720p'
const MODEL = 'lucy-2.5'
const ERROR = '#E5484D'

const formatPlan = (plan) => (plan ? plan.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : null)
const formatClock = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
const formatRemaining = (points) => {
  const minutes = Math.floor(points / RATE / 60)
  return minutes >= 1 ? `≈ ${minutes} min restantes` : `≈ ${Math.floor(points / RATE)} s restantes`
}

async function authedFetch(path, init = {}) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw Object.assign(new Error('Session expirée. Reconnecte-toi.'), { status: 401 })
  const res = await fetch(`${WEB_URL}${path}`, {
    ...init,
    headers: { ...(init.headers || {}), Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  })
  const body = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, body }
}

const tokenErrorMessage = ({ status, body }) => {
  if (status === 401) return 'Session expirée. Reconnecte-toi.'
  if (status === 402) return body.error || 'Forfait inactif ou points insuffisants.'
  if (status === 409) return 'Un swap est déjà en cours sur ce compte. Ferme-le puis réessaie dans une minute.'
  if (status === 429) return body.error || 'Limite quotidienne atteinte. Réessaie demain.'
  return 'Le service Live Swap est indisponible. Réessaie dans un instant.'
}

export function LiveSwapScreen({ onBack, topInset, bottomInset, subscription }) {
  const [permission, requestPermission] = useCameraPermissions()
  const [facing, setFacing] = useState('front')
  const [mirror, setMirror] = useState(true)
  const [face, setFace] = useState(null)
  const [phase, setPhase] = useState('idle')
  const [notice, setNotice] = useState(null)
  const [localStream, setLocalStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [points, setPoints] = useState(null)

  const localRef = useRef(null)
  const clientRef = useRef(null)
  const sessionRef = useRef(null)
  const timersRef = useRef([])
  const endingRef = useRef(false)

  const granted = permission?.granted === true
  const canAskAgain = permission?.canAskAgain !== false
  const inSession = phase === 'preparing' || phase === 'connecting' || phase === 'live' || phase === 'stopping'
  const live = phase === 'live'

  const planName = formatPlan(subscription?.plan)
  const planActive = Boolean(subscription && (subscription.is_active === true || subscription.status === 'active'))

  useEffect(() => {
    authedFetch('/api/points')
      .then(({ body }) => {
        if (body?.success) setPoints(body.points ?? 0)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!granted || inSession) return undefined
    let cancelled = false
    mediaDevices
      .getUserMedia({ audio: false, video: { facingMode: facing === 'front' ? 'user' : 'environment', width: 1280, height: 720, frameRate: 30 } })
      .then((stream) => {
        if (cancelled) return stream.getTracks().forEach((t) => t.stop())
        localRef.current?.getTracks().forEach((t) => t.stop())
        localRef.current = stream
        setLocalStream(stream)
      })
      .catch(() => setNotice({ tone: 'error', text: "Impossible d'ouvrir la caméra." }))
    return () => {
      cancelled = true
    }
    // inSession is intentionally read only to avoid re-acquiring the camera mid-session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [granted, facing])

  const clearTimers = () => {
    timersRef.current.forEach(clearInterval)
    timersRef.current = []
  }

  const stop = useCallback(async (reason) => {
    if (endingRef.current) return
    endingRef.current = true
    clearTimers()
    const session = sessionRef.current
    sessionRef.current = null
    setPhase('stopping')
    try {
      clientRef.current?.disconnect()
    } catch {}
    clientRef.current = null
    setRemoteStream(null)

    if (session) {
      const seconds = Math.floor((Date.now() - (session.liveAt ?? Date.now())) / 1000)
      try {
        if (session.liveAt && seconds > 0) {
          const { body } = await authedFetch('/api/points', {
            method: 'POST',
            body: JSON.stringify({
              saveSession: true,
              sessionId: session.id,
              avatarName: 'iOS',
              sessionDuration: seconds,
              pointsToDeduct: seconds * RATE,
              resolution: RESOLUTION,
              startedAt: session.startedAt,
            }),
          })
          if (typeof body?.currentPoints === 'number') setPoints(body.currentPoints)
        } else {
          await authedFetch('/api/points', { method: 'POST', body: JSON.stringify({ releaseReservation: true, sessionId: session.id }) })
        }
        const { body } = await authedFetch('/api/points')
        if (body?.success) setPoints(body.points ?? 0)
      } catch {}
    }

    setElapsed(0)
    setPhase('idle')
    if (reason) setNotice(reason)
    endingRef.current = false
  }, [])

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && sessionRef.current) stop({ tone: 'info', text: 'Session arrêtée en arrière-plan.' })
    })
    return () => {
      sub.remove()
      clearTimers()
      try {
        clientRef.current?.disconnect()
      } catch {}
      const session = sessionRef.current
      if (session) {
        authedFetch('/api/points', {
          method: 'POST',
          body: JSON.stringify(
            session.liveAt
              ? { saveSession: true, sessionId: session.id, avatarName: 'iOS', sessionDuration: Math.floor((Date.now() - session.liveAt) / 1000), pointsToDeduct: Math.floor((Date.now() - session.liveAt) / 1000) * RATE, resolution: RESOLUTION, startedAt: session.startedAt }
              : { releaseReservation: true, sessionId: session.id },
          ),
        }).catch(() => {})
      }
      localRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [stop])

  const goLive = () => {
    const session = sessionRef.current
    if (!session || session.liveAt) return
    session.liveAt = Date.now()
    session.startedAt = new Date().toISOString()
    setPhase('live')
    timersRef.current.push(setInterval(() => setElapsed(Math.floor((Date.now() - session.liveAt) / 1000)), 1000))
    timersRef.current.push(
      setInterval(async () => {
        try {
          const res = await authedFetch('/api/points', {
            method: 'POST',
            body: JSON.stringify({
              pointsToDeduct: RATE * HEARTBEAT_SECONDS,
              sessionDuration: HEARTBEAT_SECONDS,
              resolution: RESOLUTION,
              sessionId: session.id,
              avatarName: 'iOS',
              startedAt: session.startedAt,
            }),
          })
          if (res.status === 409) return stop({ tone: 'error', text: 'Session ouverte sur un autre appareil.' })
          if (!res.ok || res.body?.success === false) return stop({ tone: 'error', text: res.body?.error || 'Points insuffisants.' })
          if (typeof res.body.currentPoints === 'number') {
            setPoints(res.body.currentPoints)
            if (res.body.currentPoints < RATE * HEARTBEAT_SECONDS) stop({ tone: 'info', text: 'Points épuisés. Recharge pour continuer.' })
          }
        } catch {}
      }, HEARTBEAT_SECONDS * 1000),
    )
  }

  const [rightsOk, setRightsOk] = useState(false)

  const start = async () => {
    if (!granted) return askCamera()
    if (!face) return pickFace()
    if (!rightsOk) return setNotice({ tone: 'error', text: 'Confirme disposer des droits sur ce visage pour démarrer.' })
    if (!localRef.current) return setNotice({ tone: 'error', text: 'La caméra démarre encore. Réessaie.' })

    setNotice(null)
    setPhase('preparing')
    const session = { id: newSessionId(), liveAt: null, startedAt: null }
    sessionRef.current = session

    try {
      const res = await authedFetch(`/api/decart-token?sessionId=${encodeURIComponent(session.id)}`)
      if (!res.ok || !res.body?.token) {
        sessionRef.current = null
        setPhase('idle')
        setNotice({ tone: 'error', text: tokenErrorMessage(res) })
        return
      }
      if (sessionRef.current !== session) return

      setPhase('connecting')
      const { createDecartClient, models } = loadDecart()
      const client = await createDecartClient({ apiKey: res.body.token }).realtime.connect(localRef.current, {
        model: models.realtime(MODEL),
        mirror: false,
        resolution: RESOLUTION,
        initialState: { image: face.base64 },
        onRemoteStream: (stream) => setRemoteStream(stream),
      })
      if (sessionRef.current !== session) return client.disconnect()
      clientRef.current = client

      client.on('connectionChange', (state) => {
        if (state === 'generating') goLive()
        if (state === 'disconnected' && sessionRef.current === session) stop({ tone: 'error', text: 'Connexion perdue.' })
      })
      client.on('sessionEnded', () => stop({ tone: 'info', text: 'Session terminée par le serveur.' }))
      client.on('error', () => {
        if (!session.liveAt) stop({ tone: 'error', text: 'Connexion impossible. Réessaie dans un instant.' })
      })
      if (client.getConnectionState() === 'generating') goLive()
    } catch {
      stop({ tone: 'error', text: 'Connexion impossible. Réessaie dans un instant.' })
    }
  }

  const pickFace = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8, base64: true })
      const asset = res.assets?.[0]
      if (!res.canceled && asset?.uri && asset.base64) setFace({ uri: asset.uri, base64: asset.base64 })
    } catch {
      Alert.alert('Visage', "Impossible d'ouvrir tes photos. Vérifie l'accès dans Réglages.")
    }
  }

  const askCamera = () => (canAskAgain ? requestPermission() : Linking.openSettings())

  const showHelp = () =>
    Alert.alert('Live Swap', 'Choisis un visage, cadre-toi bien dans la lumière puis lance la session. Chaque seconde en direct coûte 2 points.')

  const shownStream = live && remoteStream ? remoteStream : localStream
  const mirrored = shownStream === localStream && facing === 'front' && mirror
  const busy = phase === 'preparing' || phase === 'connecting' || phase === 'stopping'
  const busyText = phase === 'preparing' ? 'Préparation de la session���' : phase === 'connecting' ? 'Connexion au moteur temps réel…' : 'Arrêt de la session…'

  return (
    <View style={[styles.root, inSession ? styles.fullscreenRoot : { paddingTop: topInset }]}> 
      {!inSession ? <View style={styles.header}>
        <Pressable onPress={onBack} disabled={inSession} accessibilityRole="button" accessibilityLabel="Retour" hitSlop={10} style={[styles.headerBtn, inSession && styles.dim]}>
          <Ionicons name="chevron-back" size={24} color={C.ink} />
        </Pressable>
        <View style={styles.flex}>
          <Text style={styles.title} accessibilityRole="header">Live Swap</Text>
          <Text style={styles.subtitle}>Change de visage en temps réel</Text>
        </View>
        <Pressable onPress={showHelp} accessibilityRole="button" accessibilityLabel="Aide" hitSlop={10} style={styles.headerBtn}>
          <Ionicons name="information-circle-outline" size={24} color={C.ink} />
        </Pressable>
        </View> : null}

      <ScrollView style={styles.flex} contentContainerStyle={[styles.content, inSession && styles.fullscreenContent]} showsVerticalScrollIndicator={false} scrollEnabled={!live}>
        <View style={inSession ? styles.fullscreenPreview : styles.preview}>
          {granted && shownStream ? (
            <RTCView streamURL={shownStream.toURL()} style={StyleSheet.absoluteFill} objectFit="cover" mirror={mirrored} zOrder={0} />
          ) : granted ? (
            <View style={styles.permission}><ChapCamLoader size="large" /></View>
          ) : (
            <PermissionState loading={!permission} canAskAgain={canAskAgain} onPress={askCamera} />
          )}

          {live ? (
            <View style={styles.liveBar}>
              <View style={styles.livePill} accessibilityLabel={`En direct, ${formatClock(elapsed)}`}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>EN DIRECT</Text>
                <Text style={styles.liveClock}>{formatClock(elapsed)}</Text>
              </View>
              <AiBadge tone="dark" />
            </View>
          ) : null}

          {granted && !inSession ? (
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
              <Image source={{ uri: face.uri }} style={StyleSheet.absoluteFill} />
            </View>
          ) : null}

          {busy ? (
            <View style={styles.overlay} accessibilityLiveRegion="polite">
              <ChapCamLoader size="large" />
              <Text style={styles.overlayText}>{busyText}</Text>
            </View>
          ) : null}
        </View>

        {!inSession ? <Notice notice={notice} onDismiss={() => setNotice(null)} /> : null}

        {!inSession ? <Text style={styles.sectionTitle}>Choisir un visage</Text> : null}
        {face ? (
          <View style={styles.faceRow}>
            <View style={[styles.face, styles.faceActive]}>
              <Image source={{ uri: face.uri }} style={styles.faceImage} accessibilityLabel="Visage source" />
            </View>
            <View style={styles.flex}>
              <Text style={styles.faceTitle}>Visage prêt</Text>
              <Text style={styles.faceCopy}>Photo nette, de face, bien éclairée.</Text>
            </View>
            <Pressable onPress={pickFace} disabled={inSession} accessibilityRole="button" hitSlop={8} style={[styles.textBtn, inSession && styles.dim]}>
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

        {face && !inSession ? <RightsConsent checked={rightsOk} onChange={setRightsOk} /> : null}

        {granted && facing === 'front' && !inSession ? (
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

      <View style={[styles.footer, inSession && styles.fullscreenFooter, { paddingBottom: Math.max(bottomInset, 16) }]}>
        {subscription !== undefined && !inSession ? (
          <View style={styles.account}>
            <Ionicons name={planActive ? 'shield-checkmark' : 'shield-outline'} size={16} color={planActive ? C.blue : C.muted} />
            <Text style={styles.accountText} numberOfLines={1}>
              {planActive && planName ? `ChapCam ${planName}` : 'Aucun forfait actif'}
            </Text>
            {points !== null ? <Text style={styles.points}>{formatRemaining(points)}</Text> : null}
            {!planActive ? (
              <Pressable onPress={() => WebBrowser.openBrowserAsync(PLANS_URL)} accessibilityRole="link" hitSlop={8}>
                <Text style={styles.textBtnLabel}>Forfaits</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        {inSession ? (
          <Pressable
            onPress={() => stop(null)}
            disabled={phase === 'stopping'}
            accessibilityRole="button"
            accessibilityLabel="Arrêter Live Swap"
            style={({ pressed }) => [styles.stop, pressed && styles.pressed, phase === 'stopping' && styles.dim]}
          >
            <Ionicons name="stop" size={18} color={C.white} />
            <Text style={styles.ctaText}>{phase === 'live' ? 'Arrêter' : 'Annuler'}</Text>
          </Pressable>
        ) : (
          <Pressable onPress={start} accessibilityRole="button" style={({ pressed }) => [pressed && styles.pressed]}>
            <LinearGradient colors={BRAND} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cta}>
              <Ionicons name={!granted ? 'camera-outline' : face ? 'videocam' : 'person-add-outline'} size={20} color={C.white} />
              <Text style={styles.ctaText}>{!granted ? 'Autoriser la caméra' : face ? 'Démarrer Live Swap' : 'Choisir un visage'}</Text>
            </LinearGradient>
          </Pressable>
        )}
      </View>
    </View>
  )
}

function PermissionState({ loading, canAskAgain, onPress }) {
  return (
    <View style={styles.permission}>
      {loading ? (
        <ChapCamLoader size="large" />
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

function Notice({ notice, onDismiss }) {
  if (!notice) return null
  const failed = notice.tone === 'error'
  return (
    <View style={[styles.notice, failed && styles.noticeError]} accessibilityLiveRegion="polite">
      <Ionicons name={failed ? 'alert-circle' : 'checkmark-circle'} size={18} color={failed ? ERROR : C.blue} />
      <Text style={styles.noticeText}>{notice.text}</Text>
      <Pressable onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Fermer" hitSlop={10}>
        <Ionicons name="close" size={18} color={C.muted} />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  fullscreenRoot: { backgroundColor: '#050816' },
  flex: { flex: 1 },
  fullscreenContent: { flexGrow: 1, paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 },
  fullscreenPreview: { flex: 1, width: '100%', height: '100%', borderRadius: 0, overflow: 'hidden', backgroundColor: '#050816' },
  pressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
  dim: { opacity: 0.5 },
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
  liveBar: { position: 'absolute', top: 14, left: 14, right: 14, flexDirection: 'row' },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(14,21,48,0.6)', borderRadius: 999, paddingHorizontal: 12, height: 32 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: ERROR },
  liveText: { color: C.white, fontSize: 12, fontWeight: '800', letterSpacing: 0.6 },
  liveClock: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },

  permission: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 8 },
  permissionIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  permissionTitle: { color: C.white, fontSize: 17, fontWeight: '800' },
  permissionCopy: { color: 'rgba(255,255,255,0.72)', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  permissionBtn: { marginTop: 10, backgroundColor: C.white, borderRadius: 999, paddingHorizontal: 22, height: 44, justifyContent: 'center' },
  permissionBtnText: { color: C.ink, fontSize: 15, fontWeight: '700' },

  notice: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, backgroundColor: C.white, borderRadius: 16, borderWidth: 1, borderColor: C.line, paddingHorizontal: 14, paddingVertical: 12, minHeight: 48 },
  noticeError: { borderColor: '#F7C9CB' },
  noticeText: { flex: 1, color: C.ink, fontSize: 14, fontWeight: '600', lineHeight: 20 },

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
  fullscreenFooter: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 10, backgroundColor: 'transparent', borderTopWidth: 0 },
  account: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 2 },
  accountText: { flex: 1, color: C.ink, fontSize: 13, fontWeight: '600' },
  points: { color: C.muted, fontSize: 13, fontWeight: '600' },
  cta: { height: 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  stop: { height: 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: C.ink },
  ctaText: { color: C.white, fontSize: 16, fontWeight: '800' },
})
