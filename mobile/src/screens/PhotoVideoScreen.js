import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Image, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { requestLibraryAccess } from '../lib/mediaAccess'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { File, Paths } from 'expo-file-system'
import { useVideoPlayer, VideoView } from 'expo-video'
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio'
import { supabase } from '../lib/supabase'
import { C, PAD } from '../ui/catalog'
import { ChapCamLoader } from '../ui/ChapCamLoader'
import { VoicePicker } from '../ui/VoicePicker'
import { VoiceRecorder } from '../ui/VoiceRecorder'
import { AudioClip } from '../ui/AudioClip'
import { API_URL, friendlyError } from '../lib/api'
import { AiBadge, ReportAbuseButton, RightsConsent } from '../ui/Safety'

const MAX_SCRIPT_CHARS = 420
const CHARS_PER_SECOND = 14
// Mirrors lib/tool-costs.ts estimatePhotoVideoPriceUsd + lib/jetons.ts providerCostToJetons.
const JETONS_PER_USD = 60
const PER_SECOND_USD = 0.05
const PROVIDER_MARGIN_MULTIPLIER = 2.5
const round4 = (value) => Math.round(value * 10000) / 10000
const photoVideoCost = (seconds) =>
  Math.max(1, Math.ceil(round4(round4(seconds * PER_SECOND_USD) * PROVIDER_MARGIN_MULTIPLIER) * JETONS_PER_USD))

const OK_GREEN = '#22C55E'
const BAD_RED = '#EF4444'
const CARD_BORDER = '#E8EAF4'
const VIOLET_SOFT = '#F1ECFF'
const GRADIENT = ['#8F63FF', C.violet]

// Teaching examples only: displayed locally, never uploaded as the user's photo.
const PHOTO_EXAMPLES = [
  { source: require('../../assets/photo-examples/good-male.jpg'), ok: true, label: 'Exemple de bonne photo : visage net et de face' },
  { source: require('../../assets/photo-examples/good-female.jpg'), ok: true, label: 'Exemple de bonne photo : visage bien éclairé' },
  { source: require('../../assets/photo-examples/bad-blurry.jpg'), ok: false, label: 'Exemple de photo à éviter : image floue' },
]

const SUGGESTIONS = [
  { label: 'Bonjour', icon: 'sparkles', text: 'Bonjour ! Je suis ravi de te parler aujourd’hui.' },
  { label: 'Merci', icon: 'heart', text: 'Merci beaucoup pour tout, ça me touche vraiment.' },
  { label: 'Je t’aime', icon: 'heart-outline', text: 'Je t’aime, et je pense très fort à toi.' },
  { label: 'Bonne journée', icon: 'sunny-outline', text: 'Je te souhaite une excellente journée !' },
]

// Same option lists as app/dashboard/photo-video/page.tsx.
const GESTURES = [
  { label: 'Bisou', value: 'raise one hand up to the lips and blow a kiss toward the camera' },
  { label: "Clin d'œil", value: 'wink one eye at the camera' },
  { label: 'Sourire', value: 'smile warmly at the camera' },
  { label: 'Rire', value: 'laugh happily' },
  { label: 'Coucou de la main', value: 'raise one hand up into the frame and wave hello to the camera' },
  { label: 'Toucher les cheveux', value: 'raise one hand and gently touch and play with the hair' },
  { label: 'Signe de la paix', value: 'raise one hand up into the frame and make a peace sign with two fingers' },
  { label: 'Hocher la tête', value: 'nod the head' },
  { label: 'Envoyer un cœur', value: 'raise both hands up into the frame and make a heart shape with the fingers' },
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
const WAVE = [6, 12, 9, 18, 14, 24, 16, 28, 20, 26, 14, 22, 10, 18, 12, 8]

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

function Segment({ options, value, onChange, compact }) {
  return (
    <View style={[styles.segment, compact && styles.segmentCompact]}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <Pressable key={o.label} onPress={() => onChange(o.value)} style={[styles.segmentItem, compact && styles.segmentItemCompact, active && styles.segmentOn]} accessibilityRole="button" accessibilityState={{ selected: active }}>
            <Text style={[styles.segmentText, compact && styles.segmentTextCompact, active && styles.segmentTextOn]} numberOfLines={1} adjustsFontSizeToFit>{o.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

function SectionLabel({ children }) {
  return <Text style={styles.sectionLabel}>{children}</Text>
}

function PhotoSection({ photo, onPick, onRemove }) {
  return (
    <View style={styles.card}>
      <View style={styles.photoRow}>
        <Pressable onPress={onPick} style={styles.photoMain} accessibilityRole="button" accessibilityLabel={photo ? 'Remplacer la photo' : 'Choisir une photo'}>
          {photo ? (
            <Image source={{ uri: photo.uri }} style={styles.photoImg} resizeMode="cover" />
          ) : (
            <Ionicons name="person-outline" size={38} color="#C3B4FF" />
          )}
          {photo ? (
            <Pressable onPress={onRemove} style={styles.remove} hitSlop={8} accessibilityRole="button" accessibilityLabel="Retirer la photo">
              <Ionicons name="close" size={16} color={C.white} />
            </Pressable>
          ) : null}
        </Pressable>
        <View style={styles.photoSide}>
          <Pressable onPress={onPick} style={styles.dropZone} accessibilityRole="button" accessibilityLabel={photo ? 'Choisir une autre photo' : 'Choisir une photo dans la galerie'}>
            <Ionicons name="image-outline" size={30} color={C.violet} />
            <Text style={styles.dropTitle} numberOfLines={1} adjustsFontSizeToFit>{photo ? 'Changer de photo' : 'Choisir une photo'}</Text>
            <Text style={styles.dropHint} numberOfLines={2}>Un visage de face, net et bien éclairé</Text>
          </Pressable>
          <View style={styles.examples} accessibilityLabel="Exemples de photos">
            {PHOTO_EXAMPLES.map((ex) => (
              <View key={ex.label} style={styles.example} accessible accessibilityLabel={ex.label}>
                <Image source={ex.source} style={styles.exampleImg} resizeMode="cover" />
                <View style={[styles.exampleBadge, { backgroundColor: ex.ok ? OK_GREEN : BAD_RED }]}>
                  <Ionicons name={ex.ok ? 'checkmark' : 'close'} size={11} color={C.white} />
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  )
}

function VoiceCard({ title, meta, playing, canPlay, onPlay, onChange }) {
  return (
    <View style={[styles.card, styles.voiceCard]}>
      <Pressable onPress={onPlay} disabled={!canPlay} style={[styles.playBtn, !canPlay && styles.off]} accessibilityRole="button" accessibilityLabel={playing ? 'Arrêter l’écoute' : 'Écouter la voix'}>
        <Ionicons name={playing ? 'pause' : 'play'} size={20} color={C.violet} style={playing ? null : styles.playIcon} />
      </Pressable>
      <View style={styles.wave} importantForAccessibility="no-hide-descendants">
        {WAVE.map((h, i) => <View key={i} style={[styles.waveBar, { height: h, opacity: playing ? 1 : 0.55 }]} />)}
      </View>
      <View style={styles.flex}>
        <Text style={styles.voiceName} numberOfLines={1}>{title}</Text>
        {meta ? <Text style={styles.voiceMeta} numberOfLines={1}>{meta}</Text> : null}
      </View>
      <Pressable onPress={onChange} style={styles.changeBtn} accessibilityRole="button" accessibilityLabel="Changer de voix">
        <Ionicons name="swap-horizontal" size={15} color={C.violet} />
        <Text style={styles.changeText}>Changer</Text>
      </Pressable>
    </View>
  )
}

export function PhotoVideoScreen({ onBack }) {
  const insets = useSafeAreaInsets()
  const [photo, setPhoto] = useState(null)
  const [prompt, setPrompt] = useState('')
  const [rawVoices, setRawVoices] = useState([])
  const [voicesError, setVoicesError] = useState('')
  const [voiceMode, setVoiceMode] = useState('preset')
  const [voiceId, setVoiceId] = useState('')
  const [voiceSample, setVoiceSample] = useState(null)
  const [voiceSheet, setVoiceSheet] = useState(false)
  const [gestures, setGestures] = useState([])
  const [expressiveness, setExpressiveness] = useState('medium')
  const [speed, setSpeed] = useState(1.0)
  const [customOpen, setCustomOpen] = useState(true)
  const [previewUri, setPreviewUri] = useState(null)
  const [previewing, setPreviewing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [rightsOk, setRightsOk] = useState(false)
  const [playing, setPlaying] = useState(false)
  const pollRef = useRef(null)
  const player = useAudioPlayer(null)
  const playerStatus = useAudioPlayerStatus(player)

  useEffect(() => () => pollRef.current && clearInterval(pollRef.current), [])
  useEffect(() => { if (playing && playerStatus.didJustFinish) setPlaying(false) }, [playerStatus.didJustFinish, playing])
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
    })().catch((e) => active && setVoicesError(friendlyError(e, 'Voix indisponibles pour le moment.')))
    return () => { active = false }
  }, [])

  const voices = useMemo(() => rawVoices.map((v) => ({
    id: v.voice_id,
    name: v.name,
    meta: [v.gender === 'female' ? 'Femme' : v.gender === 'male' ? 'Homme' : v.gender, v.language].filter(Boolean).join(' • '),
    previewUrl: v.preview || null,
    group: /fr/i.test(v.language || '') ? 'Voix françaises' : v.language || 'Autres voix',
  })), [rawVoices])
  const selectedVoice = voices.find((v) => v.id === voiceId) || null

  const trimmed = prompt.trim()
  const seconds = estimateSeconds(prompt)
  const cost = trimmed ? photoVideoCost(seconds) : null
  const scriptOk = trimmed.length > 0 && trimmed.length <= MAX_SCRIPT_CHARS
  const voiceOk = voiceMode === 'clone' ? !!voiceSample : !!voiceId
  const canGenerate = !!photo?.uri && scriptOk && voiceOk && !busy
  const ready = canGenerate && rightsOk

  const stopAudio = () => { if (playing) player.pause(); setPlaying(false) }

  const choosePhoto = async () => {
    const permission = await requestLibraryAccess()
    if (!permission.granted) {
      return Alert.alert('Accès aux photos', 'Pour choisir une photo, tu peux autoriser l’accès à ta photothèque dans les Réglages.', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Ouvrir les Réglages', onPress: () => Linking.openSettings() },
      ])
    }
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.9 })
    const selected = picked.assets?.[0]
    if (!picked.canceled && selected?.uri) setPhoto(selected)
  }

  const toggleGesture = (value) => setGestures((prev) => (prev.includes(value) ? prev.filter((g) => g !== value) : [...prev, value]))

  const playSelected = () => {
    if (playing) return stopAudio()
    const uri = voiceMode === 'clone' ? voiceSample : selectedVoice?.previewUrl
    if (!uri) return
    player.replace({ uri })
    player.play()
    setPlaying(true)
  }

  const previewVoice = async () => {
    if (!trimmed) return Alert.alert('Aperçu', "Écris d'abord le texte que la photo doit dire.")
    if (!voiceId) return
    stopAudio()
    setPreviewing(true)
    try {
      const token = await getToken()
      const res = await fetch(`${API_URL}/api/heygen/voice-preview`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed, voice_id: voiceId, speed }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || "Impossible de générer l'aperçu.")
      }
      const file = new File(Paths.cache, `chapcam-preview-${Date.now()}.mp3`)
      file.write(new Uint8Array(await res.arrayBuffer()))
      setPreviewUri(file.uri)
    } catch (e) {
      Alert.alert('Aperçu indisponible', friendlyError(e))
    } finally {
      setPreviewing(false)
    }
  }

  const generate = async () => {
    if (!ready) return
    stopAudio()
    setBusy(true); setError(''); setResult(null)
    try {
      const token = await getToken()
      const form = new FormData()
      form.append('file', { uri: photo.uri, name: 'photo.jpg', type: photo.mimeType || 'image/jpeg' })
      form.append('script', trimmed)
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
      pollRef.current = null; setError(friendlyError(e, 'Réessaie dans un instant.')); setBusy(false)
    }
  }

  const voiceTitle = voiceMode === 'clone' ? 'Ma voix clonée' : selectedVoice?.name || (voicesError ? 'Voix indisponibles' : 'Chargement…')
  const voiceMeta = voiceMode === 'clone' ? (voiceSample ? 'Échantillon enregistré' : 'Enregistrement requis') : selectedVoice?.meta
  const canPlay = voiceMode === 'clone' ? !!voiceSample : !!selectedVoice?.previewUrl
  const footerHeight = 104 + insets.bottom

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.topbar, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={onBack} style={styles.back} accessibilityRole="button" accessibilityLabel="Retour"><Ionicons name="chevron-back" size={24} color={C.ink} /></Pressable>
        <View style={styles.flex}>
          <Text style={styles.title}>Photos en Vidéo</Text>
          <Text style={styles.subtitle}>Fais parler une photo avec la voix de ton choix.</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: footerHeight + 16 }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
        <SectionLabel>1 · TA PHOTO</SectionLabel>
        <PhotoSection photo={photo} onPick={choosePhoto} onRemove={() => setPhoto(null)} />

        <SectionLabel>2 · TON TEXTE</SectionLabel>
        <View style={[styles.card, styles.promptCard]}>
          <TextInput value={prompt} onChangeText={setPrompt} multiline maxLength={MAX_SCRIPT_CHARS} placeholder="Écris le texte que la personne va prononcer…" placeholderTextColor={C.muted} style={styles.input} textAlignVertical="top" accessibilityLabel="Texte à prononcer" />
          <Text style={styles.counter}>{prompt.length}/{MAX_SCRIPT_CHARS} · ~{seconds} s</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestions} keyboardShouldPersistTaps="handled">
          {SUGGESTIONS.map((s) => (
            <Pressable key={s.label} onPress={() => { setPrompt(s.text); setPreviewUri(null) }} style={styles.suggestion} accessibilityRole="button" accessibilityLabel={`Suggestion : ${s.label}`}>
              <Ionicons name={s.icon} size={15} color={C.violet} />
              <Text style={styles.suggestionText}>{s.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <SectionLabel>3 · VOIX</SectionLabel>
        <VoiceCard title={voiceTitle} meta={voiceMeta} playing={playing} canPlay={canPlay} onPlay={playSelected} onChange={() => { stopAudio(); setVoiceSheet(true) }} />
        {voicesError && voiceMode === 'preset' ? <Text style={styles.error}>{voicesError}</Text> : null}
        {voiceMode === 'preset' ? (
          <Pressable onPress={previewVoice} disabled={previewing || !voiceId} style={[styles.textLink, (previewing || !voiceId) && styles.off]} accessibilityRole="button">
            {previewing ? <ChapCamLoader size="small" /> : <Ionicons name="volume-high-outline" size={16} color={C.violet} />}
            <Text style={styles.textLinkLabel}>Écouter mon texte avec cette voix</Text>
          </Pressable>
        ) : null}
        {previewUri && voiceMode === 'preset' ? <AudioClip uri={previewUri} label="Aperçu de la voix" accent={C.violet} /> : null}

        <View style={[styles.card, styles.customCard]}>
          <Pressable onPress={() => setCustomOpen((o) => !o)} style={styles.customHead} accessibilityRole="button" accessibilityState={{ expanded: customOpen }}>
            <Text style={[styles.sectionLabel, styles.noTop]}>4 · PERSONNALISER LA VIDÉO</Text>
            <Ionicons name={customOpen ? 'chevron-up' : 'chevron-down'} size={18} color={C.muted} />
          </Pressable>
          {customOpen ? (
            <View style={styles.customBody}>
              <View style={styles.innerCard}>
                <View style={styles.innerHead}>
                  <Ionicons name="person-outline" size={19} color={C.violet} />
                  <Text style={styles.innerTitle}>Gestes <Text style={styles.optional}>(optionnel)</Text></Text>
                  {gestures.length ? <Text style={styles.count}>{gestures.length}</Text> : null}
                </View>
                <View style={styles.chips}>
                  {GESTURES.map((g) => {
                    const active = gestures.includes(g.value)
                    return (
                      <Pressable key={g.label} onPress={() => toggleGesture(g.value)} style={[styles.chip, active && styles.chipOn]} accessibilityRole="button" accessibilityState={{ selected: active }}>
                        <Text style={[styles.chipText, active && styles.chipTextOn]}>{g.label}</Text>
                      </Pressable>
                    )
                  })}
                </View>
              </View>
              <View style={styles.settingsRow}>
                <View style={[styles.innerCard, styles.flex]}>
                  <View style={styles.innerHead}><Ionicons name="happy-outline" size={18} color={C.violet} /><Text style={styles.innerTitle}>Expressivité</Text></View>
                  <Segment compact options={EXPRESSIVENESS} value={expressiveness} onChange={setExpressiveness} />
                </View>
                <View style={[styles.innerCard, styles.flex]}>
                  <View style={styles.innerHead}><Ionicons name="speedometer-outline" size={18} color={C.violet} /><Text style={styles.innerTitle} numberOfLines={1}>Débit de parole</Text></View>
                  <Segment compact options={SPEEDS} value={speed} onChange={(v) => { setSpeed(v); setPreviewUri(null) }} />
                </View>
              </View>
            </View>
          ) : null}
        </View>

        <View style={[styles.card, styles.consentCard]}>
          <RightsConsent checked={rightsOk} onChange={setRightsOk} disabled={busy} />
        </View>

        {result ? (
          <View style={[styles.card, styles.resultCard]}>
            <View style={styles.resultHead}><Text style={[styles.sectionLabel, styles.noTop]}>VIDÉO GÉNÉRÉE</Text><AiBadge /></View>
            <ResultVideo uri={result} />
            {Platform.OS !== 'ios' ? <ReportAbuseButton contentUrl={result} context="Photos en Vidéo" /> : null}
          </View>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Pressable onPress={generate} disabled={!ready} style={[styles.generateWrap, !ready && !busy && styles.off]} accessibilityRole="button" accessibilityLabel={cost ? `Générer la vidéo, ${cost} jetons` : 'Générer la vidéo'} accessibilityState={{ disabled: !ready, busy }}>
          <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.generate}>
            {busy ? (
              <><ChapCamLoader size="small" tone="light" /><Text style={styles.generateText}>Génération en cours…</Text></>
            ) : (
              <>
                <Ionicons name="sparkles" size={20} color={C.white} />
                <Text style={styles.generateText}>Générer la vidéo</Text>
                <Ionicons name="arrow-forward" size={19} color={C.white} />
                {cost ? <View style={styles.costPill}><Ionicons name="layers-outline" size={14} color={C.white} /><Text style={styles.costText}>{cost}</Text></View> : null}
              </>
            )}
          </LinearGradient>
        </Pressable>
        <Text style={styles.costHint}>{cost ? `Coût estimé : ${cost} Jetons` : 'Le coût sera calculé selon ton texte'}</Text>
      </View>

      <Modal visible={voiceSheet} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setVoiceSheet(false)}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>Choisir une voix</Text>
            <Pressable onPress={() => setVoiceSheet(false)} style={styles.sheetDone} accessibilityRole="button"><Text style={styles.sheetDoneText}>Terminé</Text></Pressable>
          </View>
          <Segment options={[{ label: 'Voix disponibles', value: 'preset' }, { label: 'Cloner ma voix', value: 'clone' }]} value={voiceMode} onChange={(m) => { stopAudio(); setVoiceMode(m) }} />
          <ScrollView contentContainerStyle={styles.sheetBody} keyboardShouldPersistTaps="handled">
            {voiceMode === 'preset' ? (
              <>
                {voicesError ? <Text style={styles.error}>{voicesError}</Text> : null}
                <VoicePicker voices={voices} selectedId={voiceId} onSelect={(v) => { setVoiceId(v.id); setPreviewUri(null) }} accent={C.violet} />
              </>
            ) : (
              <View style={styles.gap}>
                <Text style={styles.help}>Enregistre <Text style={styles.strong}>10 à 30 secondes</Text> de ta voix (parle clairement, sans bruit). Ta voix est clonée uniquement pour cette vidéo puis supprimée.</Text>
                {voiceSample ? (
                  <>
                    <AudioClip uri={voiceSample} label="Ton échantillon vocal" accent={C.violet} />
                    <Pressable onPress={() => setVoiceSample(null)} style={styles.textLink} accessibilityRole="button"><Ionicons name="refresh" size={15} color={C.muted} /><Text style={styles.retry}>Recommencer</Text></Pressable>
                  </>
                ) : (
                  <VoiceRecorder maxSeconds={30} minSeconds={10} sampleRate={22050} accent={C.violet} disabled={busy} onRecorded={(uri) => setVoiceSample(uri)} />
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  gap: { gap: 12 },
  off: { opacity: 0.45 },
  topbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: PAD, paddingBottom: 12, gap: 14 },
  back: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white, shadowColor: '#1B2559', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
  title: { color: C.ink, fontSize: 24, fontWeight: '900', letterSpacing: -0.4 },
  subtitle: { color: C.muted, fontSize: 13, marginTop: 3 },
  content: { paddingHorizontal: PAD, gap: 10 },
  sectionLabel: { color: C.muted, fontSize: 12, fontWeight: '900', letterSpacing: 1.2, marginTop: 10 },
  noTop: { marginTop: 0 },
  card: { backgroundColor: C.white, borderRadius: 22, borderWidth: 1, borderColor: CARD_BORDER },

  photoRow: { flexDirection: 'row', gap: 12, padding: 12 },
  photoMain: { width: '40%', aspectRatio: 0.93, borderRadius: 18, overflow: 'hidden', backgroundColor: VIOLET_SOFT, alignItems: 'center', justifyContent: 'center' },
  photoImg: { width: '100%', height: '100%' },
  remove: { position: 'absolute', right: 8, top: 8, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(14,21,48,0.85)', alignItems: 'center', justifyContent: 'center' },
  photoSide: { flex: 1, gap: 10 },
  dropZone: { flex: 1, borderRadius: 16, borderWidth: 1.2, borderStyle: 'dashed', borderColor: '#C9BEFA', backgroundColor: '#F6F5FF', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, paddingVertical: 10, gap: 4 },
  dropTitle: { color: C.ink, fontSize: 15, fontWeight: '900', marginTop: 2 },
  dropHint: { color: C.muted, fontSize: 11, textAlign: 'center', lineHeight: 15 },
  examples: { flexDirection: 'row', gap: 8 },
  example: { flex: 1, aspectRatio: 1 },
  exampleImg: { width: '100%', height: '100%', borderRadius: 12, backgroundColor: '#ECEEF5' },
  exampleBadge: { position: 'absolute', right: -3, bottom: -3, width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: C.white, alignItems: 'center', justifyContent: 'center' },

  promptCard: { minHeight: 112, padding: 16 },
  input: { flex: 1, minHeight: 64, color: C.ink, fontSize: 16, lineHeight: 23, padding: 0 },
  counter: { color: C.muted, fontSize: 11, textAlign: 'right', marginTop: 6 },
  suggestions: { gap: 8, paddingVertical: 2 },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: 7, height: 38, paddingHorizontal: 15, borderRadius: 19, backgroundColor: VIOLET_SOFT },
  suggestionText: { color: C.ink, fontSize: 14, fontWeight: '600' },

  voiceCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  playBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: VIOLET_SOFT, alignItems: 'center', justifyContent: 'center' },
  playIcon: { marginLeft: 3 },
  wave: { flexDirection: 'row', alignItems: 'center', gap: 2.5, height: 32 },
  waveBar: { width: 2.5, borderRadius: 2, backgroundColor: '#A98BFF' },
  voiceName: { color: C.ink, fontSize: 16, fontWeight: '900' },
  voiceMeta: { color: C.muted, fontSize: 12, marginTop: 3 },
  changeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 13, borderRadius: 19, backgroundColor: VIOLET_SOFT },
  changeText: { color: C.violet, fontSize: 14, fontWeight: '800' },
  textLink: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', paddingVertical: 4 },
  textLinkLabel: { color: C.violet, fontSize: 13, fontWeight: '700' },
  retry: { color: C.muted, fontSize: 13, fontWeight: '700' },

  customCard: { marginTop: 10, padding: 12, gap: 12, backgroundColor: '#FBFBFE' },
  customHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, paddingTop: 2 },
  customBody: { gap: 10 },
  innerCard: { backgroundColor: C.white, borderRadius: 18, borderWidth: 1, borderColor: CARD_BORDER, padding: 12, gap: 10 },
  innerHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  innerTitle: { flexShrink: 1, color: C.ink, fontSize: 14, fontWeight: '800' },
  optional: { color: C.muted, fontWeight: '500' },
  count: { marginLeft: 'auto', minWidth: 22, height: 22, borderRadius: 11, textAlign: 'center', lineHeight: 22, overflow: 'hidden', backgroundColor: C.violet, color: C.white, fontSize: 12, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: '#F1F2F8' },
  chipOn: { backgroundColor: C.violet },
  chipText: { color: C.ink, fontSize: 13, fontWeight: '600' },
  chipTextOn: { color: C.white },
  settingsRow: { flexDirection: 'row', gap: 10 },

  segment: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 16, backgroundColor: '#EEF0F6' },
  segmentCompact: { borderRadius: 13, padding: 3, gap: 2 },
  segmentItem: { flex: 1, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  segmentItemCompact: { height: 34, borderRadius: 10 },
  segmentOn: { backgroundColor: C.white, shadowColor: '#1B2559', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  segmentText: { color: C.muted, fontSize: 13, fontWeight: '700' },
  segmentTextCompact: { fontSize: 12 },
  segmentTextOn: { color: C.violet, fontWeight: '900' },

  consentCard: { marginTop: 10, padding: 14 },
  resultCard: { padding: 12, gap: 10 },
  resultHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resultVideo: { width: '100%', aspectRatio: 9 / 16, borderRadius: 16, backgroundColor: C.navy },
  error: { color: '#DC2626', fontSize: 13, lineHeight: 18 },

  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: PAD, paddingTop: 10, gap: 8, backgroundColor: 'rgba(245,248,255,0.96)' },
  generateWrap: { borderRadius: 32, shadowColor: C.violet, shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
  generate: { height: 62, borderRadius: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 18 },
  generateText: { color: C.white, fontSize: 17, fontWeight: '900' },
  costPill: { position: 'absolute', right: 12, flexDirection: 'row', alignItems: 'center', gap: 5, height: 34, paddingHorizontal: 11, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.2)' },
  costText: { color: C.white, fontSize: 14, fontWeight: '800' },
  costHint: { color: C.muted, fontSize: 12, textAlign: 'center' },

  sheet: { flex: 1, backgroundColor: C.bg, paddingHorizontal: PAD, paddingTop: 18, gap: 14 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { color: C.ink, fontSize: 20, fontWeight: '900' },
  sheetDone: { height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: VIOLET_SOFT, justifyContent: 'center' },
  sheetDoneText: { color: C.violet, fontSize: 14, fontWeight: '800' },
  sheetBody: { gap: 12, paddingBottom: 24 },
  help: { color: C.muted, fontSize: 13, lineHeight: 19 },
  strong: { color: C.ink, fontWeight: '800' },
})
