import React, { useCallback, useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, Alert, Animated, AppState, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { StatusBar } from 'expo-status-bar'
import { Ionicons } from '@expo/vector-icons'
import { useCameraPermissions } from 'expo-camera'
import * as ImagePicker from 'expo-image-picker'
import Constants from 'expo-constants'
import { BRAND, C, PAD, shadow } from '../ui/catalog'
import { ChapCamLoader } from '../ui/ChapCamLoader'
import { supabase } from '../lib/supabase'
import { loadDecart, mediaDevices, newSessionId, RTCView } from '../lib/realtime'
import { AiBadge, RightsConsent } from '../ui/Safety'

const WEB_URL = (process.env.EXPO_PUBLIC_API_URL ?? Constants.expoConfig?.extra?.apiUrl ?? 'https://chapcam.com').replace(/\/$/, '')

const RATE = 2
const HEARTBEAT_SECONDS = 5
const RESOLUTION = '720p'
const MODEL = 'lucy-2.5'
const ERROR = '#E5484D'
const STAGE = '#050816'
const CONTROLS_IDLE_MS = 2500
const FADE_MS = 220

const EFFECT_PLANS = ['premium', 'vip-pro', 'vip-debout']
const normalizePlan = (plan) => (plan ? String(plan).toLowerCase().trim().replace(/[\s_]+/g, '-') : '')

const BACKGROUNDS = [
  { key: 'none', label: 'Aucun', icon: 'close-circle-outline', prompt: null },
  { key: 'beach', label: 'Plage', icon: 'sunny-outline', prompt: 'a sunny tropical beach with palm trees and turquoise sea' },
  { key: 'studio', label: 'Studio', icon: 'aperture-outline', prompt: 'a clean professional photo studio with soft lighting' },
  { key: 'city', label: 'Ville la nuit', icon: 'business-outline', prompt: 'a modern city skyline at night with glowing lights' },
  { key: 'office', label: 'Bureau', icon: 'briefcase-outline', prompt: 'a bright modern office with large windows' },
  { key: 'space', label: 'Espace', icon: 'planet-outline', prompt: 'outer space with stars, nebula and planets' },
  { key: 'forest', label: 'Forêt', icon: 'leaf-outline', prompt: 'a lush green forest with soft sunlight through the trees' },
]

const EFFECTS = [
  { key: 'none', label: 'Aucun', icon: 'close-circle-outline', prompt: null },
  { key: 'cinema', label: 'Cinéma', icon: 'film-outline', prompt: 'cinematic color grading, film look' },
  { key: 'neon', label: 'Néon', icon: 'flash-outline', prompt: 'vibrant neon cyberpunk lighting' },
  { key: 'anime', label: 'Anime', icon: 'color-palette-outline', prompt: 'anime illustration style' },
  { key: 'bw', label: 'Noir & blanc', icon: 'contrast-outline', prompt: 'black and white photography' },
  { key: 'paint', label: 'Peinture', icon: 'brush-outline', prompt: 'oil painting style' },
  { key: 'vintage', label: 'Vintage', icon: 'camera-outline', prompt: 'vintage 1970s film photo look' },
]

const buildLookPrompt = ({ background, effect }) => {
  const bg = BACKGROUNDS.find((b) => b.key === background)?.prompt
  const fx = EFFECTS.find((e) => e.key === effect)?.prompt
  const parts = []
  if (bg) parts.push(`Replace the background with ${bg}, keep the person unchanged`)
  if (fx) parts.push(`Apply ${fx}`)
  return parts.length ? parts.join('. ') : null
}

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
  if (status === 402) return body.error || 'Forfait inactif ou minutes insuffisantes. Ouvre « Forfaits » pour t\'abonner.'
  if (status === 409) return 'Un swap est déjà en cours sur ce compte. Ferme-le puis réessaie dans une minute.'
  if (status === 429) return body.error || 'Limite quotidienne atteinte. Réessaie demain.'
  return 'Le service Live Swap est indisponible. Réessaie dans un instant.'
}

export function LiveSwapScreen({ onBack, onOpenPlans, topInset, bottomInset, subscription }) {
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
  const effectsUnlocked = planActive && EFFECT_PLANS.includes(normalizePlan(subscription?.plan))
  const [look, setLook] = useState({ background: 'none', effect: 'none' })

  const applyLook = async (next) => {
    const client = clientRef.current
    if (!client || !face) return false
    const prompt = buildLookPrompt(next)
    try {
      await client.set(prompt ? { image: face.base64, prompt, enhance: true } : { image: face.base64 })
      setLook(next)
      return true
    } catch {
      return false
    }
  }

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
    setLook({ background: 'none', effect: 'none' })
    setPhase('preparing')
    const session = { id: newSessionId(), liveAt: null, startedAt: null }
    sessionRef.current = session

    try {
      const res = await authedFetch(`/api/decart-token?sessionId=${encodeURIComponent(session.id)}`)
      if (!res.ok || !res.body?.token) {
        sessionRef.current = null
        setPhase('idle')
        setNotice({ tone: 'error', text: tokenErrorMessage(res) })
        if (res.status === 402 && onOpenPlans) {
          Alert.alert('Forfait requis', 'Ton forfait est inactif ou tes minutes Live Swap sont épuisées.', [
            { text: 'Plus tard', style: 'cancel' },
            { text: 'Voir les forfaits', onPress: onOpenPlans },
          ])
        }
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

  const exitSession = async () => {
    await stop(null)
    onBack()
  }

  if (inSession) {
    const sessionStream = live && remoteStream ? remoteStream : localStream
    return (
      <ImmersiveSession
        stream={sessionStream}
        mirrored={sessionStream === localStream && facing === 'front' && mirror}
        phase={phase}
        elapsed={elapsed}
        face={face}
        planLabel={subscription !== undefined ? (planActive && planName ? `ChapCam ${planName}` : null) : null}
        remaining={points !== null ? formatRemaining(points) : null}
        topInset={topInset}
        bottomInset={bottomInset}
        onStop={() => stop(null)}
        onBack={exitSession}
        effectsUnlocked={effectsUnlocked}
        look={look}
        onApplyLook={applyLook}
        onOpenPlans={onOpenPlans}
      />
    )
  }

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
          {granted && localStream ? (
            <RTCView streamURL={localStream.toURL()} style={StyleSheet.absoluteFill} objectFit="cover" mirror={facing === 'front' && mirror} zOrder={0} />
          ) : granted ? (
            <View style={styles.permission}><ChapCamLoader size="large" /></View>
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
              <Image source={{ uri: face.uri }} style={StyleSheet.absoluteFill} />
            </View>
          ) : null}
        </View>

        <Notice notice={notice} onDismiss={() => setNotice(null)} />

        <Text style={styles.sectionTitle}>Choisir un visage</Text>
        {face ? (
          <View style={styles.faceRow}>
            <View style={[styles.face, styles.faceActive]}>
              <Image source={{ uri: face.uri }} style={styles.faceImage} accessibilityLabel="Visage source" />
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

        {face ? <RightsConsent checked={rightsOk} onChange={setRightsOk} /> : null}

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
            {points !== null ? <Text style={styles.points}>{formatRemaining(points)}</Text> : null}
            {!planActive ? (
              <Pressable onPress={onOpenPlans} accessibilityRole="button" hitSlop={8}>
                <Text style={styles.textBtnLabel}>Forfaits</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        <Pressable onPress={start} accessibilityRole="button" style={({ pressed }) => [pressed && styles.pressed]}>
          <LinearGradient colors={BRAND} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cta}>
            <Ionicons name={!granted ? 'camera-outline' : face ? 'videocam' : 'person-add-outline'} size={20} color={C.white} />
            <Text style={styles.ctaText}>{!granted ? 'Autoriser la caméra' : face ? 'Démarrer Live Swap' : 'Choisir un visage'}</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  )
}

function ImmersiveSession({ stream, mirrored, phase, elapsed, face, planLabel, remaining, topInset, bottomInset, onStop, onBack, effectsUnlocked, look, onApplyLook, onOpenPlans }) {
  const [visible, setVisible] = useState(false)
  const [effectsOpen, setEffectsOpen] = useState(false)
  const [pinned, setPinned] = useState(false)
  const opacity = useRef(new Animated.Value(0)).current
  const hideTimer = useRef(null)

  const live = phase === 'live'
  const stopping = phase === 'stopping'
  const busyText = phase === 'preparing' ? 'Préparation…' : phase === 'connecting' ? 'Connexion…' : stopping ? 'Arrêt…' : null

  // VoiceOver users cannot discover controls hidden behind a tap, so keep them on screen.
  useEffect(() => {
    let mounted = true
    AccessibilityInfo.isScreenReaderEnabled().then((on) => mounted && setPinned(on))
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setPinned)
    return () => {
      mounted = false
      sub.remove()
    }
  }, [])

  const shown = visible || pinned

  useEffect(() => {
    Animated.timing(opacity, { toValue: shown ? 1 : 0, duration: FADE_MS, useNativeDriver: true }).start()
  }, [shown, opacity])

  const scheduleHide = useCallback(() => {
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setVisible(false), CONTROLS_IDLE_MS)
  }, [])

  useEffect(() => () => clearTimeout(hideTimer.current), [])

  const reveal = () => {
    setVisible(true)
    scheduleHide()
  }

  const openEffects = () => {
    if (!live) return
    if (!effectsUnlocked) {
      Alert.alert('Forfait Premium requis', 'Les effets et arrière-plans sont disponibles à partir du forfait Premium.', [
        { text: 'Plus tard', style: 'cancel' },
        ...(onOpenPlans ? [{ text: 'Voir les forfaits', onPress: onOpenPlans }] : []),
      ])
      return
    }
    clearTimeout(hideTimer.current)
    setEffectsOpen(true)
  }

  const toggle = () => {
    if (visible) {
      clearTimeout(hideTimer.current)
      setVisible(false)
    } else {
      reveal()
    }
  }

  return (
    <View style={styles.stage}>
      <StatusBar hidden={!shown} animated style="light" />

      <Pressable style={StyleSheet.absoluteFill} onPress={toggle} accessible={false}>
        {stream ? (
          <RTCView streamURL={stream.toURL()} style={StyleSheet.absoluteFill} objectFit="cover" mirror={mirrored} zOrder={0} />
        ) : null}
      </Pressable>

      {busyText ? (
        <View style={styles.busy} pointerEvents="none" accessibilityLiveRegion="polite">
          <ChapCamLoader size="large" />
          <Text style={styles.busyText}>{busyText}</Text>
        </View>
      ) : null}

      <Animated.View style={[StyleSheet.absoluteFill, { opacity }]} pointerEvents={shown ? 'box-none' : 'none'}>
        <LinearGradient colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0)']} style={[styles.scrimTop, { height: topInset + 120 }]} pointerEvents="none" />
        <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.6)']} style={[styles.scrimBottom, { height: bottomInset + 200 }]} pointerEvents="none" />

        <View style={[styles.topBar, { paddingTop: topInset + 8 }]} pointerEvents="box-none">
          <Pressable
            onPress={onBack}
            onPressIn={scheduleHide}
            disabled={stopping}
            accessibilityRole="button"
            accessibilityLabel="Quitter Live Swap"
            hitSlop={8}
            style={({ pressed }) => [styles.glassBtn, pressed && styles.pressed]}
          >
            <Ionicons name="chevron-back" size={22} color={C.white} />
          </Pressable>
          <View style={styles.flex} />
          {live ? (
            <View style={styles.livePill} accessibilityLabel={`En direct, ${formatClock(elapsed)}`}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>EN DIRECT</Text>
              <Text style={styles.liveClock}>{formatClock(elapsed)}</Text>
            </View>
          ) : null}
          <AiBadge tone="dark" />
        </View>

        <View style={[styles.bottomBar, { paddingBottom: Math.max(bottomInset, 16) + 12 }]} pointerEvents="box-none">
          {planLabel || remaining ? (
            <Text style={styles.meta} numberOfLines={1}>
              {[planLabel, remaining].filter(Boolean).join('  ·  ')}
            </Text>
          ) : null}
          <View style={styles.bottomRow} pointerEvents="box-none">
            <View style={[styles.sideSlot, styles.sideSlotStart]}>
              <Pressable
                onPress={openEffects}
                onPressIn={scheduleHide}
                disabled={!live}
                accessibilityRole="button"
                accessibilityLabel={effectsUnlocked ? 'Effets et arrière-plans' : 'Effets et arrière-plans, réservé au forfait Premium'}
                style={({ pressed }) => [styles.effectsBtn, pressed && styles.pressed, !live && styles.dim]}
              >
                <View style={styles.glassBtn}>
                  <Ionicons name={effectsUnlocked ? 'sparkles' : 'lock-closed'} size={20} color={C.white} />
                </View>
                <Text style={styles.effectsLabel}>Effets</Text>
              </Pressable>
            </View>
            <Pressable
              onPress={onStop}
              onPressIn={scheduleHide}
              disabled={stopping}
              accessibilityRole="button"
              accessibilityLabel={live ? 'Arrêter Live Swap' : 'Annuler Live Swap'}
              style={({ pressed }) => [styles.stopWrap, pressed && styles.pressed, stopping && styles.dim]}
            >
              <View style={styles.stopRing}>
                <View style={styles.stopCore}>
                  <View style={styles.stopSquare} />
                </View>
              </View>
              <Text style={styles.stopLabel}>{live ? 'Arrêter' : 'Annuler'}</Text>
            </Pressable>
            <View style={styles.sideSlot}>
              {face ? (
                <View style={styles.sessionPip} accessibilityLabel="Visage source">
                  <Image source={{ uri: face.uri }} style={StyleSheet.absoluteFill} />
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </Animated.View>

      {effectsOpen ? (
        <EffectsSheet look={look} bottomInset={bottomInset} onApply={onApplyLook} onClose={() => setEffectsOpen(false)} />
      ) : null}
    </View>
  )
}

function EffectsSheet({ look, bottomInset, onApply, onClose }) {
  const [pending, setPending] = useState(null)
  const [failed, setFailed] = useState(false)

  const choose = async (kind, key) => {
    if (pending || look[kind] === key) return
    setPending(`${kind}:${key}`)
    setFailed(false)
    const ok = await onApply({ ...look, [kind]: key })
    setPending(null)
    if (!ok) setFailed(true)
  }

  const renderRow = (kind, items) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
      {items.map((item) => {
        const active = look[kind] === item.key
        const loading = pending === `${kind}:${item.key}`
        return (
          <Pressable
            key={item.key}
            onPress={() => choose(kind, item.key)}
            disabled={Boolean(pending)}
            accessibilityRole="button"
            accessibilityState={{ selected: active, busy: loading }}
            accessibilityLabel={item.label}
            style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.pressed]}
          >
            {loading ? <ChapCamLoader size="small" /> : <Ionicons name={item.icon} size={20} color={active ? C.white : 'rgba(255,255,255,0.85)'} />}
            <Text style={[styles.chipLabel, active && styles.chipLabelActive]} numberOfLines={1}>{item.label}</Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )

  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose} accessibilityLabel="Fermer" accessibilityRole="button" />
      <View style={[styles.sheet, { paddingBottom: Math.max(bottomInset, 16) + 8 }]}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle} accessibilityRole="header">Effets</Text>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Fermer" hitSlop={10}>
            <Ionicons name="close" size={22} color={C.white} />
          </Pressable>
        </View>
        <Text style={styles.sheetSection}>Arrière-plan</Text>
        {renderRow('background', BACKGROUNDS)}
        <Text style={styles.sheetSection}>Effet</Text>
        {renderRow('effect', EFFECTS)}
        {failed ? <Text style={styles.sheetError}>Impossible d&apos;appliquer ce choix. Réessaie.</Text> : null}
      </View>
    </Modal>
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
  flex: { flex: 1 },
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

  stage: { flex: 1, backgroundColor: STAGE },
  busy: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: 'rgba(5,8,22,0.45)' },
  busyText: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '600', letterSpacing: 0.2 },
  scrimTop: { position: 'absolute', top: 0, left: 0, right: 0 },
  scrimBottom: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16 },
  glassBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 999, paddingHorizontal: 10, height: 28 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: ERROR },
  liveText: { color: C.white, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  liveClock: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'] },
  bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', gap: 14, paddingHorizontal: 20 },
  meta: { color: 'rgba(255,255,255,0.72)', fontSize: 12, fontWeight: '600', letterSpacing: 0.2 },
  bottomRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', alignSelf: 'stretch' },
  sideSlot: { width: 64, alignItems: 'flex-end' },
  sideSlotStart: { alignItems: 'flex-start' },
  effectsBtn: { alignItems: 'center', gap: 6 },
  effectsLabel: { color: C.white, fontSize: 12, fontWeight: '700' },
  sheetBackdrop: { flex: 1 },
  sheet: { backgroundColor: 'rgba(10,14,34,0.96)', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 8, gap: 10 },
  sheetHandle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: 40 },
  sheetTitle: { color: C.white, fontSize: 18, fontWeight: '800' },
  sheetSection: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '700', paddingHorizontal: 20 },
  sheetError: { color: '#FF8A8D', fontSize: 13, fontWeight: '600', paddingHorizontal: 20 },
  chipRow: { gap: 10, paddingHorizontal: 20 },
  chip: { width: 84, height: 76, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 6 },
  chipActive: { backgroundColor: C.blue, borderColor: C.blue },
  chipLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600' },
  chipLabelActive: { color: C.white },
  sessionPip: { width: 56, height: 56, borderRadius: 16, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.85)', backgroundColor: '#11173A' },
  stopWrap: { alignItems: 'center', gap: 8 },
  stopRing: { width: 76, height: 76, borderRadius: 38, borderWidth: 3, borderColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  stopCore: { width: 62, height: 62, borderRadius: 31, backgroundColor: ERROR, alignItems: 'center', justifyContent: 'center' },
  stopSquare: { width: 20, height: 20, borderRadius: 5, backgroundColor: C.white },
  stopLabel: { color: C.white, fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },

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
  account: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 2 },
  accountText: { flex: 1, color: C.ink, fontSize: 13, fontWeight: '600' },
  points: { color: C.muted, fontSize: 13, fontWeight: '600' },
  cta: { height: 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  ctaText: { color: C.white, fontSize: 16, fontWeight: '800' },
})
