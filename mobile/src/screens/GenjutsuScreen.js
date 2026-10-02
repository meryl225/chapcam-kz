import React, { useCallback, useEffect, useState } from 'react'
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import Constants from 'expo-constants'
import { useVideoPlayer, VideoView } from 'expo-video'
import { supabase } from '../lib/supabase'
import { C, PAD } from '../ui/catalog'
import { ChapCamLoader } from '../ui/ChapCamLoader'
import { useJetonsBalance } from '../lib/useJetonsBalance'

const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? Constants.expoConfig?.extra?.apiUrl ?? 'https://chapcam.com').replace(/\/$/, '')

// Same rules and options as app/dashboard/genjutsu/page.tsx + lib/tool-costs.ts.
const MAX_PROMPT = 500
const MAX_PRESETS = 3
const MIN_REFERENCE_SECONDS = 4
const MAX_REFERENCE_SECONDS = 30
const DURATIONS = [5, 10, 15, 20, 25, 30]
const QUALITIES = ['720p']
const DEFAULT_PROMPT = 'Un mouvement de caméra lent vers le visage, sourire naturel et cheveux animés par une légère brise.'
const GENJUTSU_PROVIDER_COST_PER_SECOND_USD = 0.2708333333
const GENJUTSU_MARGIN_MULTIPLIER = 2
const JETONS_PER_USD = 60
const FCFA_PER_JETON = 10
const genjutsuCost = (seconds) => Math.ceil(GENJUTSU_PROVIDER_COST_PER_SECOND_USD * GENJUTSU_MARGIN_MULTIPLIER * JETONS_PER_USD * seconds)

async function authHeaders() {
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  if (!token) throw new Error('Session expirée. Reconnecte-toi pour continuer.')
  return { Authorization: `Bearer ${token}` }
}

function videoContentType(asset) {
  const mime = asset?.mimeType || ''
  if (mime === 'video/mp4' || mime === 'video/webm' || mime === 'video/quicktime') return mime
  const name = (asset?.fileName || asset?.uri || '').toLowerCase()
  if (name.endsWith('.mp4') || name.endsWith('.m4v')) return 'video/mp4'
  if (name.endsWith('.webm')) return 'video/webm'
  return 'video/quicktime'
}

function imageContentType(asset) {
  const mime = asset?.mimeType || ''
  return mime === 'image/png' || mime === 'image/webp' ? mime : 'image/jpeg'
}

const referenceSeconds = (asset) => (typeof asset?.duration === 'number' && asset.duration > 0 ? asset.duration / 1000 : null)

async function pickMedia(mediaTypes) {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!permission.granted) {
    Alert.alert('Photos', 'Autorise ChapCam à accéder à tes photos dans Réglages.')
    return null
  }
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes, allowsEditing: false, quality: 0.9 })
  return result.canceled ? null : result.assets?.[0] ?? null
}

function VideoPreview({ uri }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = true; p.muted = true; p.play() })
  return <VideoView player={player} style={styles.media} contentFit="cover" nativeControls={false} />
}

function UploadCard({ label, hint, icon, item, onPick, onClear, disabled }) {
  return (
    <Pressable onPress={onPick} disabled={disabled} style={styles.upload} accessibilityRole="button" accessibilityLabel={label}>
      {item ? (
        item.type === 'video' ? <VideoPreview uri={item.uri} /> : <Image source={{ uri: item.uri }} style={styles.media} resizeMode="cover" />
      ) : (
        <>
          <View style={styles.uploadIcon}><Ionicons name={icon} size={24} color={C.violet} /></View>
          <Text style={styles.uploadTitle}>{label}</Text>
          <Text style={styles.uploadHint}>{hint}</Text>
        </>
      )}
      {item && !disabled ? (
        <Pressable onPress={onClear} style={styles.remove} accessibilityRole="button" accessibilityLabel={`Retirer : ${label}`}>
          <Ionicons name="close" size={17} color={C.white} />
        </Pressable>
      ) : null}
    </Pressable>
  )
}

export function GenjutsuScreen({ onBack, onOpenCreations, topInset = 0 }) {
  const [image, setImage] = useState(null)
  const [reference, setReference] = useState(null)
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT)
  const [quality, setQuality] = useState('720p')
  const [duration, setDuration] = useState(10)
  const [enhance, setEnhance] = useState(true)
  const [motions, setMotions] = useState([])
  const [motionsLoading, setMotionsLoading] = useState(true)
  const [selectedMotions, setSelectedMotions] = useState([])
  const [showMotions, setShowMotions] = useState(false)
  const [loading, setLoading] = useState(false)
  const [stage, setStage] = useState('')
  const [message, setMessage] = useState(null)
  const [pendingRequestId, setPendingRequestId] = useState(null)
  const [completed, setCompleted] = useState(false)
  const balance = useJetonsBalance()
  const reloadBalance = balance.reload

  const cost = genjutsuCost(duration)
  const referenceDuration = referenceSeconds(reference)
  const referenceInvalid = referenceDuration !== null && (referenceDuration < MIN_REFERENCE_SECONDS || referenceDuration > MAX_REFERENCE_SECONDS)
  const busy = loading || !!pendingRequestId
  const ready = !!image?.uri && !!reference?.uri && !!prompt.trim() && !referenceInvalid && !busy

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const headers = await authHeaders()
        const res = await fetch(`${API_URL}/api/motion?info=motions`, { headers })
        const json = res.ok ? await res.json() : { motions: [] }
        if (!cancelled && Array.isArray(json.motions)) {
          setMotions(json.motions.filter((m) => m && typeof m.id === 'string' && typeof m.name === 'string'))
        }
      } catch {
        // Presets are optional, exactly like the web page.
      } finally {
        if (!cancelled) setMotionsLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Same safety net as the web: recover finished videos or refund stuck/failed jobs.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const headers = await authHeaders()
        const res = await fetch(`${API_URL}/api/motion?reconcile=genjutsu`, { headers })
        const result = res.ok ? await res.json() : null
        if (cancelled || !result) return
        if (result.recovered > 0 || result.refunded > 0) reloadBalance()
        if (result.refunded > 0) {
          setMessage({ tone: 'info', text: `Une génération précédente n'a pas abouti : ${result.refunded} jetons ont été remboursés sur ton solde.` })
        } else if (result.recovered > 0) {
          setMessage({ tone: 'success', text: 'Une vidéo Genjutsu terminée a été récupérée dans Mes créations.' })
          setCompleted(true)
        }
      } catch {
        // Non-blocking.
      }
    })()
    return () => { cancelled = true }
  }, [reloadBalance])

  useEffect(() => {
    if (!pendingRequestId) return undefined
    const interval = setInterval(async () => {
      try {
        const headers = await authHeaders()
        const res = await fetch(`${API_URL}/api/motion?request_id=${encodeURIComponent(pendingRequestId)}`, { headers })
        const result = await res.json().catch(() => ({}))
        if (result.status === 'completed' && result.video_url) {
          setPendingRequestId(null)
          setCompleted(true)
          reloadBalance()
          setMessage({ tone: 'success', text: 'Ta vidéo Genjutsu est prête. Retrouve-la dans Mes créations.' })
        } else if (result.status === 'failed' || result.status === 'nsfw' || result.status === 'canceled') {
          setPendingRequestId(null)
          reloadBalance()
          setMessage({ tone: 'error', text: `${result.error || 'La génération a échoué.'} Tes jetons ont été remboursés sur ton solde.` })
        }
      } catch {
        // Retry on next tick.
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [pendingRequestId, reloadBalance])

  const pickReference = async () => {
    const asset = await pickMedia(['videos'])
    if (!asset) return
    const seconds = referenceSeconds(asset)
    if (seconds !== null && (seconds < MIN_REFERENCE_SECONDS || seconds > MAX_REFERENCE_SECONDS)) {
      Alert.alert('Vidéo de mouvement', `Ta vidéo dure ${Math.round(seconds)} s. Genjutsu exige une vidéo de 4 à 30 secondes.`)
      return
    }
    setReference({ ...asset, type: 'video' })
  }

  const toggleMotion = (id) => {
    setSelectedMotions((current) => {
      if (current.includes(id)) return current.filter((m) => m !== id)
      if (current.length >= MAX_PRESETS) return current
      return [...current, id]
    })
  }

  const onGenerate = useCallback(async () => {
    if (!image || !prompt.trim()) {
      setMessage({ tone: 'error', text: 'Ajoute une image et décris le mouvement souhaité.' })
      return
    }
    if (!reference) {
      setMessage({ tone: 'error', text: 'Ajoute une vidéo de mouvement : Genjutsu transfère son mouvement sur ton image.' })
      return
    }
    const seconds = referenceSeconds(reference)
    if (seconds !== null && (seconds < MIN_REFERENCE_SECONDS || seconds > MAX_REFERENCE_SECONDS)) {
      setMessage({ tone: 'error', text: `Ta vidéo dure ${Math.round(seconds)} s. Genjutsu exige une vidéo de 4 à 30 secondes.` })
      return
    }
    if (balance.jetons !== null && balance.jetons < cost) {
      setMessage({ tone: 'error', text: `Solde insuffisant : ${cost.toLocaleString('fr-FR')} Jetons requis.` })
      return
    }

    setLoading(true)
    setCompleted(false)
    setMessage(null)
    try {
      const headers = await authHeaders()
      const contentType = videoContentType(reference)

      setStage('Préparation de la vidéo de mouvement…')
      const uploadRes = await fetch(`${API_URL}/api/motion/upload`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType }),
      })
      const upload = await uploadRes.json().catch(() => ({}))
      if (!uploadRes.ok || typeof upload.signedUrl !== 'string') throw new Error(upload.error || 'Impossible de préparer la vidéo.')

      setStage('Envoi de la vidéo de mouvement…')
      const videoBlob = await (await fetch(reference.uri)).blob()
      const putRes = await fetch(upload.signedUrl, { method: 'PUT', headers: { 'Content-Type': contentType }, body: videoBlob })
      if (!putRes.ok) throw new Error('Échec de l’upload de la vidéo de référence.')

      setStage('Genjutsu prépare ton animation…')
      const form = new FormData()
      form.append('file', { uri: image.uri, name: 'image.jpg', type: imageContentType(image) })
      form.append('prompt', prompt.trim())
      form.append('model', 'genjutsu')
      form.append('quality', quality)
      form.append('durationSeconds', String(duration))
      form.append('enhance', String(enhance))
      if (selectedMotions.length > 0) form.append('motions', JSON.stringify(selectedMotions))
      form.append('referenceVideoUrl', typeof upload.publicUrl === 'string' ? upload.publicUrl : '')

      const res = await fetch(`${API_URL}/api/motion`, { method: 'POST', headers, body: form })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) {
        const detail = [result.error, result.detail].filter((v) => typeof v === 'string' && v.trim()).join(' — ')
        throw new Error(detail || `La génération a échoué (HTTP ${res.status}).`)
      }
      if (typeof result.request_id === 'string' && result.request_id) setPendingRequestId(result.request_id)
      reloadBalance()
      setMessage({ tone: 'info', text: 'Génération lancée (1 à 3 min). Le résultat sera enregistré dans Mes créations.' })
    } catch (error) {
      setMessage({ tone: 'error', text: error instanceof Error ? error.message : 'Une erreur est survenue.' })
    } finally {
      setStage('')
      setLoading(false)
    }
  }, [image, reference, prompt, quality, duration, enhance, selectedMotions, balance.jetons, cost, reloadBalance])

  return (
    <KeyboardAvoidingView style={[styles.root, { paddingTop: topInset }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.topbar}>
        <Pressable onPress={onBack} style={styles.back} accessibilityRole="button" accessibilityLabel="Retour"><Ionicons name="chevron-back" size={25} color={C.ink} /></Pressable>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>Genjutsu</Text>
          <Text style={styles.subtitle}>Transfère un mouvement vidéo sur ton image.</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionLabel}>IMAGE ET MOUVEMENT</Text>
        <View style={styles.uploadRow}>
          <UploadCard label="Image sujet" hint="JPG, PNG ou WebP · requis" icon="image-outline" item={image} disabled={busy} onPick={async () => { const a = await pickMedia(['images']); if (a) setImage(a) }} onClear={() => setImage(null)} />
          <UploadCard label="Vidéo de mouvement *" hint="Requise · de 4 à 30 secondes" icon="videocam-outline" item={reference} disabled={busy} onPick={pickReference} onClear={() => setReference(null)} />
        </View>
        {referenceDuration !== null ? (
          <Text style={[styles.durationNote, referenceInvalid && styles.durationNoteError]}>{`Vidéo de mouvement : ${Math.round(referenceDuration)} s`}</Text>
        ) : null}

        <Text style={styles.sectionLabel}>DÉCRIS LE MOUVEMENT *</Text>
        <View style={styles.promptCard}>
          <TextInput value={prompt} onChangeText={setPrompt} multiline maxLength={MAX_PROMPT} editable={!busy} placeholder="Ex. La caméra avance lentement…" placeholderTextColor={C.muted} style={styles.input} textAlignVertical="top" accessibilityLabel="Décris le mouvement" />
          <Text style={styles.counter}>{`${prompt.length}/${MAX_PROMPT}`}</Text>
        </View>

        <Text style={styles.sectionLabel}>PARAMÈTRES</Text>
        <View style={styles.settings}>
          <View style={styles.settingRow}>
            <View style={styles.flex}>
              <Text style={styles.settingTitle}>Amélioration intelligente</Text>
              <Text style={styles.settingHint}>Optimise automatiquement la description du mouvement.</Text>
            </View>
            <Switch value={enhance} onValueChange={setEnhance} disabled={busy} trackColor={{ true: C.violet, false: C.line }} accessibilityLabel="Amélioration intelligente" />
          </View>

          {motionsLoading || motions.length > 0 ? (
            <>
              <View style={styles.divider} />
              <View style={styles.settingRow}>
                <View style={styles.flex}>
                  <Text style={styles.settingTitle}>Presets de mouvement</Text>
                  <Text style={styles.settingHint}>{`Sélectionne jusqu’à ${MAX_PRESETS} mouvements caméra · ${selectedMotions.length}/${MAX_PRESETS}`}</Text>
                </View>
                {motionsLoading ? (
                  <ChapCamLoader size="small" />
                ) : (
                  <Pressable onPress={() => setShowMotions((v) => !v)} style={styles.toggle} accessibilityRole="button" accessibilityState={{ expanded: showMotions }}>
                    <Text style={styles.toggleText}>{showMotions ? 'Masquer' : 'Voir les presets'}</Text>
                  </Pressable>
                )}
              </View>
              {showMotions ? (
                <View style={styles.chips}>
                  {motions.map((m) => {
                    const selected = selectedMotions.includes(m.id)
                    const locked = !selected && selectedMotions.length >= MAX_PRESETS
                    return (
                      <Pressable key={m.id} onPress={() => toggleMotion(m.id)} disabled={busy || locked} style={[styles.chip, selected && styles.chipActive, locked && styles.chipLocked]} accessibilityRole="button" accessibilityState={{ selected, disabled: busy || locked }} accessibilityHint={m.description}>
                        <Text style={[styles.chipText, selected && styles.chipTextActive]}>{m.name}</Text>
                      </Pressable>
                    )
                  })}
                </View>
              ) : null}
            </>
          ) : null}

          <View style={styles.divider} />
          <Text style={styles.settingTitle}>Qualité de sortie</Text>
          <View style={styles.chips}>
            {QUALITIES.map((q) => (
              <Pressable key={q} onPress={() => setQuality(q)} disabled={busy} style={[styles.chip, quality === q && styles.chipActive]} accessibilityRole="button" accessibilityState={{ selected: quality === q }}>
                <Text style={[styles.chipText, quality === q && styles.chipTextActive]}>{q}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.divider} />
          <Text style={styles.settingTitle}>Durée de la vidéo</Text>
          <View style={styles.chips}>
            {DURATIONS.map((d) => (
              <Pressable key={d} onPress={() => setDuration(d)} disabled={busy} style={[styles.chip, duration === d && styles.chipActive]} accessibilityRole="button" accessibilityState={{ selected: duration === d }}>
                <Text style={[styles.chipText, duration === d && styles.chipTextActive]}>{d === 30 ? '30 s (max)' : `${d} s`}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.costRow}>
            <View>
              <Text style={styles.costLabel}>Coût</Text>
              <Text style={styles.costValue}>{`${cost.toLocaleString('fr-FR')} Jetons`}</Text>
              <Text style={styles.costSub}>{`${(cost * FCFA_PER_JETON).toLocaleString('fr-FR')} FCFA · ${duration} s`}</Text>
            </View>
            <View style={styles.balanceBox}>
              <Text style={styles.costLabel}>Ton solde</Text>
              {balance.loading ? (
                <ChapCamLoader size="small" />
              ) : balance.jetons !== null ? (
                <Text style={styles.balanceValue}>{`${balance.jetons.toLocaleString('fr-FR')} Jetons`}</Text>
              ) : (
                <Pressable onPress={balance.reload} accessibilityRole="button"><Text style={styles.balanceError}>Indisponible · Réessayer</Text></Pressable>
              )}
            </View>
          </View>

          {message ? (
            <View style={[styles.message, message.tone === 'error' && styles.messageError, message.tone === 'success' && styles.messageSuccess]} accessibilityLiveRegion="polite">
              <Text style={[styles.messageText, message.tone === 'error' && styles.messageTextError]}>{message.text}</Text>
            </View>
          ) : null}

          {pendingRequestId ? (
            <View style={styles.progress} accessibilityLiveRegion="polite">
              <ChapCamLoader size="small" />
              <Text style={styles.progressText}>Rendu en cours… tu peux quitter l’écran, la vidéo sera enregistrée dans Mes créations.</Text>
            </View>
          ) : null}

          {completed && onOpenCreations ? (
            <Pressable onPress={onOpenCreations} style={styles.creations} accessibilityRole="button">
              <Ionicons name="albums-outline" size={18} color={C.blue} />
              <Text style={styles.creationsText}>Voir dans Mes créations</Text>
            </Pressable>
          ) : null}

          <Pressable onPress={onGenerate} disabled={!ready} style={[styles.generate, !ready && styles.generateDisabled]} accessibilityRole="button" accessibilityState={{ disabled: !ready, busy: loading }}>
            {loading ? (
              <>
                <ChapCamLoader size="small" />
                <Text style={styles.generateText}>{stage || 'Génération…'}</Text>
              </>
            ) : (
              <>
                <Text style={styles.generateText}>Générer avec Genjutsu</Text>
                <Ionicons name="arrow-forward" size={19} color={C.white} />
              </>
            )}
          </Pressable>
          {!image || !reference ? <Text style={styles.footHint}>Ajoute une image et une vidéo de mouvement pour continuer.</Text> : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  topbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: PAD, paddingVertical: 16, gap: 10, borderBottomWidth: 1, borderBottomColor: '#E7EAF3' },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white },
  titleWrap: { flex: 1 },
  title: { color: C.ink, fontSize: 21, fontWeight: '900' },
  subtitle: { color: C.muted, fontSize: 12, marginTop: 3 },
  content: { padding: PAD, gap: 12, paddingBottom: 36 },
  sectionLabel: { color: C.muted, fontSize: 11, fontWeight: '900', letterSpacing: 1, marginTop: 10 },
  uploadRow: { flexDirection: 'row', gap: 12 },
  upload: { flex: 1, height: 210, borderRadius: 24, backgroundColor: C.white, borderWidth: 1, borderColor: '#E2E6F1', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 12 },
  uploadIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F0EBFF', alignItems: 'center', justifyContent: 'center' },
  uploadTitle: { color: C.ink, fontSize: 15, fontWeight: '900', marginTop: 10, textAlign: 'center' },
  uploadHint: { color: C.muted, fontSize: 12, marginTop: 4, textAlign: 'center' },
  media: { ...StyleSheet.absoluteFillObject },
  remove: { position: 'absolute', right: 10, top: 10, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(11,18,51,0.8)', alignItems: 'center', justifyContent: 'center' },
  durationNote: { color: C.muted, fontSize: 12, fontWeight: '700' },
  durationNoteError: { color: '#B42318' },
  promptCard: { minHeight: 170, backgroundColor: C.white, borderRadius: 24, borderWidth: 1, borderColor: '#E2E6F1', padding: 16 },
  input: { flex: 1, minHeight: 125, color: C.ink, fontSize: 16, lineHeight: 24 },
  counter: { color: C.muted, fontSize: 11, textAlign: 'right' },
  settings: { backgroundColor: C.white, borderRadius: 24, borderWidth: 1, borderColor: '#E2E6F1', padding: 16, gap: 10 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingTitle: { color: C.ink, fontSize: 14, fontWeight: '800' },
  settingHint: { color: C.muted, fontSize: 12, marginTop: 3, lineHeight: 17 },
  divider: { height: 1, backgroundColor: C.line, marginVertical: 4 },
  toggle: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: '#F0EBFF' },
  toggleText: { color: C.violet, fontSize: 12, fontWeight: '900' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 16, backgroundColor: C.bg, borderWidth: 1, borderColor: '#E2E6F1' },
  chipActive: { backgroundColor: C.violet, borderColor: C.violet },
  chipLocked: { opacity: 0.4 },
  chipText: { color: C.ink, fontSize: 13, fontWeight: '800' },
  chipTextActive: { color: C.white },
  footer: { marginTop: 10, gap: 12 },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 },
  costLabel: { color: C.muted, fontSize: 11, fontWeight: '900', letterSpacing: 0.6, textTransform: 'uppercase' },
  costValue: { color: C.ink, fontSize: 20, fontWeight: '900', marginTop: 3, fontVariant: ['tabular-nums'] },
  costSub: { color: C.muted, fontSize: 12, fontWeight: '700', marginTop: 2, fontVariant: ['tabular-nums'] },
  balanceBox: { alignItems: 'flex-end', gap: 3 },
  balanceValue: { color: C.blue, fontSize: 15, fontWeight: '900', fontVariant: ['tabular-nums'] },
  balanceError: { color: '#B42318', fontSize: 13, fontWeight: '800' },
  message: { borderRadius: 18, padding: 14, backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#DCE3FF' },
  messageError: { backgroundColor: '#FEF3F2', borderColor: '#FECDCA' },
  messageSuccess: { backgroundColor: '#ECFDF3', borderColor: '#ABEFC6' },
  messageText: { color: C.ink, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  messageTextError: { color: '#B42318' },
  progress: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 18, backgroundColor: C.white, borderWidth: 1, borderColor: '#E2E6F1' },
  progressText: { flex: 1, color: C.muted, fontSize: 12, lineHeight: 17 },
  creations: { height: 48, borderRadius: 24, borderWidth: 1, borderColor: C.blue, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.white },
  creationsText: { color: C.blue, fontSize: 15, fontWeight: '900' },
  generate: { height: 58, borderRadius: 29, backgroundColor: C.blue, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 18 },
  generateDisabled: { opacity: 0.45 },
  generateText: { color: C.white, fontSize: 17, fontWeight: '900' },
  footHint: { color: C.muted, fontSize: 12, textAlign: 'center' },
})
