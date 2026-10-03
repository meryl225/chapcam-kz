import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { File, Paths } from 'expo-file-system'
import { useVideoPlayer, VideoView } from 'expo-video'
import { supabase } from '../lib/supabase'
import { C, PAD } from '../ui/catalog'
import { ChapCamLoader } from '../ui/ChapCamLoader'
import { VoicePicker } from '../ui/VoicePicker'
import { VoiceRecorder } from '../ui/VoiceRecorder'
import { AudioClip } from '../ui/AudioClip'
import { API_URL } from '../lib/api'
import { AiBadge, ReportAbuseButton, RightsConsent } from '../ui/Safety'

const MAX_SCRIPT_CHARS = 420
const CHARS_PER_SECOND = 14
// Mirrors lib/jetons.ts + lib/tool-costs.ts: reserveJetons(estimatedSeconds * 0.05).
const JETONS_PER_USD = 60
const PER_SECOND_USD = 0.05

// Same option lists as app/dashboard/photo-video/page.tsx.
const GESTURES = [
  { label: 'Bisou', value: 'raise one hand up to the lips and blow a kiss toward the camera' },
  { label: "Clin d'oeil", value: 'wink one eye at the camera' },
  { label: 'Toucher les cheveux', value: 'raise one hand and gently touch and play with the hair' },
  { label: 'Sourire', value: 'smile warmly at the camera' },
  { label: 'Coucou de la main', value: 'raise one hand up into the frame and wave hello to the camera' },
  { label: 'Rire', value: 'laugh happily' },
  { label: 'Signe de la paix', value: 'raise one hand up into the frame and make a peace sign with two fingers' },
  { label: 'Hocher la tête', value: 'nod the head' },
  { label: 'Envoyer un coeur', value: 'raise both hands up into the frame and make a heart shape with the fingers' },
  { label: "Pouce en l'air", value: 'raise one hand up into the frame and give a thumbs up' },
]
const EXPRESSIVENESS = [
  { label: 'Douce', value: 'low' },
  { label: 'Naturelle', value: 'medium' },
  { label: 'Intense', value: 'high' },
]
const SPEEDS = [
  { label: 'Posé', value: 0.9 },
  { label: 'Naturel', value: 1.0 },
  { label: 'Énergique', value: 1.1 },
]

function estimateSeconds(script) {
  return Math.min(30, Math.max(2, Math.ceil(script.trim().length / CHARS_PER_SECOND)))
}

async function getToken() {
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  if (!token) throw new Error('Session expirée. Reconnecte-toi.')
  return token
}

function ResultVideo({ uri }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = false })
  return <VideoView player={player} style={styles.resultVideo} nativeControls contentFit="contain" allowsFullscreen />
}

function Segment({ options, value, onChange }) {
  return (
    <View style={styles.segment}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <Pressable key={o.label} onPress={() => onChange(o.value)} style={[styles.segmentItem, active && styles.segmentOn]} accessibilityRole="button" accessibilityState={{ selected: active }}>
            <Text style={[styles.segmentText, active && styles.segmentTextOn]}>{o.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

export function PhotoVideoScreen({ onBack }) {
  const [photo, setPhoto] = useState(null)
  const [prompt, setPrompt] = useState('')
  const [rawVoices, setRawVoices] = useState([])
  const [voicesError, setVoicesError] = useState('')
  const [voiceMode, setVoiceMode] = useState('preset')
  const [voiceId, setVoiceId] = useState('')
  const [voiceSample, setVoiceSample] = useState(null)
  const [gestures, setGestures] = useState([])
  const [expressiveness, setExpressiveness] = useState('medium')
  const [speed, setSpeed] = useState(1.0)
  const [previewUri, setPreviewUri] = useState(null)
  const [previewing, setPreviewing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const pollRef = useRef(null)

  useEffect(() => () => pollRef.current && clearInterval(pollRef.current), [])
  useEffect(() => {
    let active = true
    ;(async () => {
      const token = await getToken()
      const response = await fetch(`${API_URL}/api/heygen/voices`, { headers: { Authorization: `Bearer ${token}` } })
      const json = await response.json().catch(() => ({}))
      if (!active) return
      if (!response.ok) return setVoicesError(json.error || 'Impossible de charger les voix.')
      const list = json.voices || []
      setRawVoices(list)
      if (list.length) setVoiceId(list[0].voice_id)
    })().catch((e) => active && setVoicesError(e.message))
    return () => { active = false }
  }, [])

  const voices = useMemo(() => rawVoices.map((v) => ({
    id: v.voice_id,
    name: v.name,
    meta: [v.gender === 'female' ? 'Femme' : v.gender === 'male' ? 'Homme' : v.gender, v.language].filter(Boolean).join(' • '),
    previewUrl: v.preview || null,
    group: /fr/i.test(v.language || '') ? 'Voix françaises' : v.language || 'Autres voix',
  })), [rawVoices])

  const seconds = estimateSeconds(prompt)
  const cost = Math.ceil(seconds * PER_SECOND_USD * JETONS_PER_USD)
  const scriptOk = prompt.trim().length > 0 && prompt.trim().length <= MAX_SCRIPT_CHARS
  const voiceOk = voiceMode === 'clone' ? !!voiceSample : !!voiceId
  const canGenerate = !!photo?.uri && scriptOk && voiceOk && !busy

  const choosePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) return Alert.alert('Photos', 'Autorise ChapCam à accéder à tes photos dans Réglages.')
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.9 })
    const selected = picked.assets?.[0]
    if (!picked.canceled && selected?.uri) setPhoto(selected)
  }

  const toggleGesture = (value) => setGestures((prev) => (prev.includes(value) ? prev.filter((g) => g !== value) : [...prev, value]))

  const previewVoice = async () => {
    if (!prompt.trim()) return Alert.alert('Aperçu', "Écris d'abord le texte que la photo doit dire.")
    if (!voiceId) return
    setPreviewing(true)
    try {
      const token = await getToken()
      const res = await fetch(`${API_URL}/api/heygen/voice-preview`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: prompt.trim(), voice_id: voiceId, speed }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || "Impossible de générer l'aperçu.")
      }
      const file = new File(Paths.cache, `chapcam-preview-${Date.now()}.mp3`)
      file.write(new Uint8Array(await res.arrayBuffer()))
      setPreviewUri(file.uri)
    } catch (e) {
      Alert.alert('Aperçu indisponible', e.message)
    } finally {
      setPreviewing(false)
    }
  }

  const [rightsOk, setRightsOk] = useState(false)

  const generate = async () => {
    if (!canGenerate || !rightsOk) return
    setBusy(true); setError(''); setResult(null)
    try {
      const token = await getToken()
      const form = new FormData()
      form.append('file', { uri: photo.uri, name: 'photo.jpg', type: photo.mimeType || 'image/jpeg' })
      form.append('script', prompt.trim())
      if (voiceMode === 'clone') form.append('voice_sample', { uri: voiceSample, name: 'voix.wav', type: 'audio/wav' })
      else form.append('voice_id', voiceId)
      if (gestures.length) form.append('motion_prompt', gestures.join(', '))
      form.append('expressiveness', expressiveness)
      form.append('speed', String(speed))
      const response = await fetch(`${API_URL}/api/heygen/photo-video`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form })
      const json = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(json.error || 'La génération a échoué.')
      const cloneParam = json.clone_voice_id ? `&clone_voice_id=${encodeURIComponent(json.clone_voice_id)}` : ''
      pollRef.current = setInterval(async () => {
        const statusResponse = await fetch(`${API_URL}/api/heygen/photo-video?video_id=${encodeURIComponent(json.video_id)}${cloneParam}`, { headers: { Authorization: `Bearer ${token}` } })
        const status = await statusResponse.json().catch(() => ({}))
        if (status.status === 'completed' && status.video_url) {
          clearInterval(pollRef.current); pollRef.current = null; setResult(status.video_url); setBusy(false)
        } else if (status.status === 'failed') {
          clearInterval(pollRef.current); pollRef.current = null; setBusy(false); setError(status.error || 'La génération a échoué.')
        }
      }, 4000)
    } catch (e) {
      if (pollRef.current) clearInterval(pollRef.current)
      pollRef.current = null; setError(e.message || 'Réessaie dans un instant.'); setBusy(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.topbar}>
        <Pressable onPress={onBack} style={styles.back} accessibilityRole="button" accessibilityLabel="Retour"><Ionicons name="chevron-back" size={25} color={C.ink} /></Pressable>
        <View style={styles.titleWrap}><Text style={styles.title}>Photos en Vidéo</Text><Text style={styles.subtitle}>Fais parler une photo avec la voix de ton choix.</Text></View>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionLabel}>1 · PHOTO</Text>
        <Pressable onPress={choosePhoto} style={styles.photoCard} accessibilityRole="button">
          {photo ? <Image source={{ uri: photo.uri }} style={styles.photo} resizeMode="cover" /> : <><Ionicons name="image-outline" size={32} color={C.violet} /><Text style={styles.photoTitle}>Choisir une photo</Text><Text style={styles.photoHint}>Un visage de face, net et bien éclairé</Text></>}
          {photo ? <Pressable onPress={() => setPhoto(null)} style={styles.remove} accessibilityLabel="Retirer la photo"><Ionicons name="close" size={17} color={C.white} /></Pressable> : null}
        </Pressable>

        <Text style={styles.sectionLabel}>2 · CE QUE LA PHOTO VA DIRE</Text>
        <View style={styles.promptCard}><TextInput value={prompt} onChangeText={setPrompt} multiline maxLength={MAX_SCRIPT_CHARS} placeholder="Écris le texte que la personne va prononcer…" placeholderTextColor={C.muted} style={styles.input} textAlignVertical="top" /><Text style={styles.counter}>{prompt.length}/{MAX_SCRIPT_CHARS} · ~{seconds} s</Text></View>

        <Text style={styles.sectionLabel}>3 · VOIX</Text>
        <Segment options={[{ label: 'Voix disponibles', value: 'preset' }, { label: 'Cloner ma voix', value: 'clone' }]} value={voiceMode} onChange={setVoiceMode} />
        {voiceMode === 'preset' ? (
          <View style={styles.gap}>
            {voicesError ? <Text style={styles.error}>{voicesError}</Text> : null}
            <VoicePicker voices={voices} selectedId={voiceId} onSelect={(v) => { setVoiceId(v.id); setPreviewUri(null) }} accent={C.violet} />
            <Pressable onPress={previewVoice} disabled={previewing || !voiceId} style={[styles.secondary, (previewing || !voiceId) && styles.off]} accessibilityRole="button">
              {previewing ? <ChapCamLoader size="small" /> : <><Ionicons name="volume-high-outline" size={18} color={C.violet} /><Text style={styles.secondaryText}>Écouter mon texte avec cette voix</Text></>}
            </Pressable>
            {previewUri ? <AudioClip uri={previewUri} label="Aperçu de la voix" accent={C.violet} /> : null}
          </View>
        ) : (
          <View style={styles.gap}>
            <Text style={styles.help}>Enregistre <Text style={styles.strong}>10 à 30 secondes</Text> de ta voix (parle clairement, sans bruit). Ta voix est clonée uniquement pour cette vidéo puis supprimée.</Text>
            {voiceSample ? (
              <>
                <AudioClip uri={voiceSample} label="Ton échantillon vocal" accent={C.violet} />
                <Pressable onPress={() => setVoiceSample(null)} style={styles.link} accessibilityRole="button"><Ionicons name="refresh" size={15} color={C.muted} /><Text style={styles.linkText}>Recommencer</Text></Pressable>
              </>
            ) : (
              <VoiceRecorder maxSeconds={30} minSeconds={10} sampleRate={22050} accent={C.violet} disabled={busy} onRecorded={(uri) => setVoiceSample(uri)} />
            )}
          </View>
        )}

        <Text style={styles.sectionLabel}>4 · GESTES (OPTIONNEL)</Text>
        <View style={styles.chips}>
          {GESTURES.map((g) => {
            const active = gestures.includes(g.value)
            return (
              <Pressable key={g.label} onPress={() => toggleGesture(g.value)} style={[styles.chip, active && styles.chipOn]} accessibilityRole="button" accessibilityState={{ selected: active }}>
                {active ? <Ionicons name="checkmark" size={14} color={C.white} /> : null}
                <Text style={[styles.chipText, active && styles.chipTextOn]}>{g.label}</Text>
              </Pressable>
            )
          })}
        </View>

        <Text style={styles.sectionLabel}>5 · RÉGLAGES</Text>
        <View style={styles.settings}>
          <Text style={styles.settingLabel}>Expressivité</Text>
          <Segment options={EXPRESSIVENESS} value={expressiveness} onChange={setExpressiveness} />
          <Text style={styles.settingLabel}>Débit de parole</Text>
          <Segment options={SPEEDS} value={speed} onChange={(v) => { setSpeed(v); setPreviewUri(null) }} />
        </View>

        {result ? (
          <View style={styles.resultCard}>
            <View style={styles.resultHead}><Text style={styles.resultLabel}>VIDÉO GÉNÉRÉE</Text><AiBadge /></View>
            <ResultVideo uri={result} />
            <ReportAbuseButton contentUrl={result} context="Photos en Vidéo" />
          </View>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.footer}>
          <RightsConsent checked={rightsOk} onChange={setRightsOk} disabled={busy} />
          <Text style={styles.cost}>{prompt.trim() ? <>Coût : <Text style={styles.costStrong}>{cost} Jetons</Text></> : 'Le coût sera calculé selon ton texte'}</Text>
          <Pressable onPress={generate} disabled={!canGenerate || !rightsOk} style={[styles.generate, (!canGenerate || !rightsOk) && styles.off]} accessibilityRole="button" accessibilityState={{ disabled: !canGenerate || !rightsOk }}>
            {busy ? <ChapCamLoader size="small" tone="light" /> : <><Text style={styles.generateText}>Générer la vidéo</Text><Ionicons name="arrow-forward" size={19} color={C.white} /></>}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  topbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: PAD, paddingTop: 58, paddingBottom: 16, gap: 10, borderBottomWidth: 1, borderBottomColor: '#E7EAF3' },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white },
  titleWrap: { flex: 1 },
  title: { color: C.ink, fontSize: 21, fontWeight: '900' },
  subtitle: { color: C.muted, fontSize: 12, marginTop: 3 },
  content: { padding: PAD, gap: 12, paddingBottom: 40 },
  gap: { gap: 10 },
  sectionLabel: { color: C.muted, fontSize: 11, fontWeight: '900', letterSpacing: 1, marginTop: 12 },
  photoCard: { height: 245, borderRadius: 24, backgroundColor: C.white, borderWidth: 1, borderColor: '#E2E6F1', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  photo: { width: '100%', height: '100%' },
  photoTitle: { color: C.ink, fontSize: 18, fontWeight: '900', marginTop: 10 },
  photoHint: { color: C.muted, fontSize: 13, marginTop: 5 },
  remove: { position: 'absolute', right: 12, top: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(11,18,51,0.8)', alignItems: 'center', justifyContent: 'center' },
  promptCard: { minHeight: 160, backgroundColor: C.white, borderRadius: 24, borderWidth: 1, borderColor: '#E2E6F1', padding: 16 },
  input: { flex: 1, minHeight: 115, color: C.ink, fontSize: 16, lineHeight: 24 },
  counter: { color: C.muted, fontSize: 11, textAlign: 'right' },
  segment: { flexDirection: 'row', gap: 6, padding: 4, borderRadius: 16, backgroundColor: '#E9ECF5' },
  segmentItem: { flex: 1, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  segmentOn: { backgroundColor: C.white },
  segmentText: { color: C.muted, fontSize: 13, fontWeight: '800' },
  segmentTextOn: { color: C.ink },
  secondary: { height: 48, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.white, borderWidth: 1, borderColor: '#E2E6F1' },
  secondaryText: { color: C.ink, fontSize: 14, fontWeight: '800' },
  help: { color: C.muted, fontSize: 13, lineHeight: 19 },
  strong: { color: C.ink, fontWeight: '800' },
  link: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  linkText: { color: C.muted, fontSize: 13, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 18, paddingHorizontal: 13, paddingVertical: 9, backgroundColor: C.white, borderWidth: 1, borderColor: '#E2E6F1' },
  chipOn: { backgroundColor: C.violet, borderColor: C.violet },
  chipText: { color: C.ink, fontSize: 13, fontWeight: '700' },
  chipTextOn: { color: C.white },
  settings: { gap: 10, padding: 16, borderRadius: 20, backgroundColor: C.white, borderWidth: 1, borderColor: '#E2E6F1' },
  settingLabel: { color: C.ink, fontSize: 14, fontWeight: '800' },
  resultCard: { backgroundColor: C.white, borderRadius: 24, padding: 12, gap: 10 },
  resultHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resultLabel: { color: C.muted, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  resultVideo: { width: '100%', aspectRatio: 9 / 16, borderRadius: 16, backgroundColor: '#000' },
  error: { color: '#DC2626', fontSize: 13, lineHeight: 18 },
  footer: { gap: 10, marginTop: 8 },
  cost: { color: C.muted, fontSize: 13, textAlign: 'center' },
  costStrong: { color: C.ink, fontWeight: '900' },
  generate: { height: 56, borderRadius: 28, backgroundColor: C.violet, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  generateText: { color: C.white, fontSize: 16, fontWeight: '900' },
  off: { opacity: 0.4 },
})
