import React, { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native'
import { Text, TextInput } from '../i18n/Text'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { File, Paths } from 'expo-file-system'
import { ChapCamLoader } from '../ui/ChapCamLoader'
import { C } from '../ui/catalog'
import { supabase } from '../lib/supabase'
import { ValueSlider } from '../ui/ValueSlider'
import { VoiceRecorder } from '../ui/VoiceRecorder'
import { AudioClip } from '../ui/AudioClip'
import { VoiceCatalogSheet } from '../ui/VoiceCatalogSheet'
import { useVoicePreview } from '../lib/useVoicePreview'
import { API_URL as WEB_URL, friendlyError } from '../lib/api'
import { AiBadge, RightsConsent } from '../ui/Safety'

// Mirrors lib/plans.ts VOICE_MESSAGE_MAX_CHARS / VOICE_MESSAGE_MAX_SECONDS.
const MAX_CHARS = 240
const MAX_SECONDS = 15
// ~240 characters of speech fit in the 15 s message cap.
const CHARS_PER_SECOND = MAX_CHARS / MAX_SECONDS
// Mirrors components/message-vocal/message-vocal-client.tsx and lib/jetons.ts (1 000 Jetons = 10 000 FCFA).
const JETONS_PER_MESSAGE = 10

const VIOLET_SOFT = '#F1ECFF'
const CARD_BORDER = '#E8EAF3'
const GRADIENT = ['#8F63FF', C.violet]
const WAVE = [8, 14, 20, 12, 24, 30, 18, 26, 14, 22, 30, 20, 12, 18, 26, 16, 10, 20, 14, 8]
const SUGGESTIONS = [
  { label: 'Bonjour', icon: 'sparkles', text: 'Bonjour !' },
  { label: 'Merci', icon: 'heart', text: 'Merci beaucoup !' },
  { label: 'Je t’aime', icon: 'heart-outline', text: 'Je t’aime.' },
  { label: 'Bonne journée', icon: 'sunny-outline', text: 'Bonne journée !' },
]

async function authHeaders() {
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function looksFrench(text) {
  const t = text.toLowerCase()
  if (/[àâçéèêëîïôûùü]/.test(t)) return true
  return /\b(le|la|les|un|une|des|et|est|vous|nous|bonjour|merci|pour|avec|dans|je|tu)\b/.test(t)
}

async function saveAudio(res) {
  const bytes = new Uint8Array(await res.arrayBuffer())
  const file = new File(Paths.cache, `chapcam-voice-${Date.now()}.mp3`)
  file.write(bytes)
  return file.uri
}

async function readError(res) {
  const data = await res.json().catch(() => ({}))
  return data.error || `Erreur ${res.status}`
}

function toVoice(v) {
  return {
    id: v.id || v.voice_id,
    name: v.shortName || v.name,
    tagline: v.tagline || null,
    meta: [v.genderLabel, v.languageLabel, v.accentLabel].filter(Boolean).join(' • '),
    description: v.summary || null,
    genderLabel: v.genderLabel || null,
    isFrench: !!v.isFrench,
    previewUrl: v.previewUrl || v.preview_url || null,
    group: v.isFrench ? 'Voix françaises' : v.languageLabel || 'Autres voix',
  }
}

export function VoiceMessageScreen({ onBack }) {
  const insets = useSafeAreaInsets()
  const [tab, setTab] = useState('text')
  const [voices, setVoices] = useState([])
  const [selected, setSelected] = useState(null)
  const [quota, setQuota] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [catalogOpen, setCatalogOpen] = useState(false)
  const preview = useVoicePreview()

  const load = useCallback(async () => {
    const headers = await authHeaders()
    const [voiceRes, quotaRes] = await Promise.all([
      fetch(`${WEB_URL}/api/voice-swap/voices`, { headers }),
      fetch(`${WEB_URL}/api/voice/message-quota`, { headers }),
    ])
    if (!voiceRes.ok || !quotaRes.ok) throw new Error('Impossible de charger les voix ou le solde.')
    const voiceData = await voiceRes.json()
    const quotaData = await quotaRes.json()
    const list = (Array.isArray(voiceData.voices) ? voiceData.voices : []).map(toVoice)
    list.sort((a, b) => (a.isFrench === b.isFrench ? a.name.localeCompare(b.name) : a.isFrench ? -1 : 1))
    setVoices(list)
    setSelected((prev) => prev || list[0] || null)
    setQuota(quotaData)
  }, [])

  useEffect(() => { load().catch((e) => setLoadError(friendlyError(e, 'Chargement des voix impossible.'))) }, [load])

  const locked = quota ? quota.remaining < 1 : true
  const onConsumed = (remaining) => setQuota((q) => ({ ...q, remaining }))
  const switchTab = (next) => { preview.stop(); setTab(next) }

  const voiceSection = (
    <>
      <Text style={styles.sectionLabel}>{tab === 'text' ? '2 • VOIX' : '2 • VOIX CIBLE'}</Text>
      <VoiceCard voice={selected} preview={preview} onChange={() => setCatalogOpen(true)} />
      {preview.error && !catalogOpen ? <Text style={styles.error}>{preview.error}</Text> : null}
    </>
  )

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.top, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={onBack} style={styles.back} accessibilityRole="button" accessibilityLabel="Retour"><Ionicons name="chevron-back" size={24} color={C.ink} /></Pressable>
        <View style={styles.flex}>
          <Text style={styles.title}>Message Vocal</Text>
          <Text style={styles.subtitle}>Écris ou enregistre, ChapCam fait parler la voix choisie.</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 40 + insets.bottom }]} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, styles.quota]}>
          <View style={styles.quotaIcon}><Ionicons name="chatbubble-ellipses" size={16} color={C.violet} /></View>
          <View style={styles.flex}>
            <Text style={styles.quotaText}>{quota ? `${quota.remaining} message${quota.remaining > 1 ? 's' : ''} vocal${quota.remaining > 1 ? 'aux' : ''} restant${quota.remaining > 1 ? 's' : ''}` : 'Chargement du solde…'}</Text>
            <Text style={styles.quotaCost}>{`${JETONS_PER_MESSAGE} Jetons par tranche de 15 s`}</Text>
          </View>
        </View>
        {quota && quota.remaining < 1 ? (
          <Text style={styles.warn}>{quota.subActive ? 'Tu as utilisé tous tes messages vocaux inclus.' : 'Les messages vocaux sont inclus avec un abonnement ChapCam.'}</Text>
        ) : null}
        {loadError ? <Text style={styles.error}>{loadError}</Text> : null}

        <View style={styles.tabs} accessibilityRole="tablist">
          <TabButton active={tab === 'text'} icon="create-outline" label="Écrire un message" onPress={() => switchTab('text')} />
          <TabButton active={tab === 'record'} icon="mic-outline" label="Enregistrer ma voix" onPress={() => switchTab('record')} />
        </View>

        {tab === 'text'
          ? <TextTab selected={selected} locked={locked} onConsumed={onConsumed} voiceSection={voiceSection} stopPreview={preview.stop} />
          : <RecordTab selected={selected} locked={locked} onConsumed={onConsumed} voiceSection={voiceSection} stopPreview={preview.stop} />}
      </ScrollView>

      <VoiceCatalogSheet
        visible={catalogOpen}
        voices={voices}
        selectedId={selected?.id}
        onSelect={setSelected}
        onClose={() => { preview.clearError(); setCatalogOpen(false) }}
        preview={preview}
      />
    </KeyboardAvoidingView>
  )
}

function TabButton({ active, icon, label, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.tab, active && styles.tabOn]} accessibilityRole="tab" accessibilityState={{ selected: active }}>
      <Ionicons name={icon} size={17} color={active ? C.violet : C.muted} />
      <Text style={[styles.tabText, active && styles.tabTextOn]}>{label}</Text>
    </Pressable>
  )
}

function VoiceCard({ voice, preview, onChange }) {
  if (!voice) {
    return <View style={[styles.card, styles.voiceCard]}><ActivityIndicator color={C.violet} /><Text style={styles.voiceMeta}>Chargement des voix…</Text></View>
  }
  const playing = preview.isPlaying(voice.id)
  const loading = preview.isLoading(voice.id)
  return (
    <View style={[styles.card, styles.voiceCard]}>
      <Pressable onPress={() => preview.toggle(voice)} style={styles.voicePlay} accessibilityRole="button" accessibilityLabel={playing ? `Mettre en pause l’aperçu de ${voice.name}` : `Écouter un aperçu de ${voice.name}`}>
        {loading ? <ActivityIndicator color={C.violet} /> : <Ionicons name={playing ? 'pause' : 'play'} size={22} color={C.violet} style={playing ? null : styles.playIcon} />}
      </Pressable>
      <View style={styles.wave} importantForAccessibility="no-hide-descendants">
        {WAVE.map((h, i) => <View key={i} style={[styles.waveBar, { height: h * 0.8, opacity: playing ? 1 : 0.5 }]} />)}
      </View>
      <View style={styles.flex}>
        <Text style={styles.voiceName} numberOfLines={1}>{voice.name}</Text>
        {voice.meta ? <Text style={styles.voiceMeta} numberOfLines={1}>{voice.meta}</Text> : null}
        {voice.tagline ? <Text style={styles.voiceTagline} numberOfLines={1}>{voice.tagline}</Text> : null}
      </View>
      <Pressable onPress={onChange} style={styles.change} accessibilityRole="button" accessibilityLabel="Changer de voix">
        <Ionicons name="swap-horizontal" size={16} color={C.violet} />
        <Text style={styles.changeText}>Changer</Text>
      </Pressable>
    </View>
  )
}

function Advanced({ open, onToggle, children }) {
  return (
    <View style={styles.card}>
      <Pressable onPress={onToggle} style={styles.advHead} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        <Ionicons name="options-outline" size={18} color={C.violet} />
        <Text style={styles.advTitle}>Réglages avancés</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={C.muted} />
      </Pressable>
      {open ? <View style={styles.advBody}>{children}</View> : null}
    </View>
  )
}

function GenerateButton({ label, onPress, disabled }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [disabled && styles.ctaOff, pressed && styles.pressed]} accessibilityRole="button" accessibilityState={{ disabled }}>
      <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
        <Ionicons name="sparkles" size={20} color={C.white} />
        <Text style={styles.ctaText}>{label}</Text>
        <Ionicons name="arrow-forward" size={18} color={C.white} />
      </LinearGradient>
    </Pressable>
  )
}

function TextTab({ selected, locked, onConsumed, voiceSection, stopPreview }) {
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const [stability, setStability] = useState(0.5)
  const [similarity, setSimilarity] = useState(0.85)
  const [style, setStyle] = useState(0.2)
  const [speed, setSpeed] = useState(1)
  const [rightsOk, setRightsOk] = useState(false)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const canGenerate = text.trim().length > 0 && text.length <= MAX_CHARS && !!selected && !busy && !locked && rightsOk
  const seconds = text.trim() ? Math.max(1, Math.ceil(text.length / CHARS_PER_SECOND)) : 0

  const addSuggestion = (s) => setText((prev) => (prev.trim() ? `${prev.trimEnd()} ${s}` : s).slice(0, MAX_CHARS))

  const generate = async () => {
    if (!canGenerate) return
    stopPreview()
    setBusy(true); setError(null); setResult(null)
    try {
      const res = await fetch(`${WEB_URL}/api/voice/text-to-speech`, {
        method: 'POST',
        headers: { ...(await authHeaders()), 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), voiceId: selected.id, modelId: 'eleven_multilingual_v2', languageCode: looksFrench(text) ? 'fr' : undefined, stability, similarity, style, speed, speakerBoost: true }),
      })
      if (res.status === 402) { onConsumed(0); throw new Error(await readError(res)) }
      if (!res.ok) throw new Error(await readError(res))
      const remaining = Number(res.headers.get('X-Remaining-Credits'))
      setResult(await saveAudio(res))
      if (Number.isFinite(remaining)) onConsumed(remaining)
    } catch (e) { setError(friendlyError(e)) } finally { setBusy(false) }
  }

  return (
    <View style={styles.tabBody}>
      <Text style={styles.sectionLabel}>1 • TON MESSAGE</Text>
      <View style={styles.card}>
        <TextInput
          value={text}
          onChangeText={(v) => setText(v.slice(0, MAX_CHARS))}
          placeholder="Écris le texte que la voix va prononcer…"
          placeholderTextColor={C.muted}
          multiline
          textAlignVertical="top"
          style={styles.composer}
          accessibilityLabel="Texte du message vocal"
        />
        <Text style={[styles.count, text.length >= MAX_CHARS && styles.countMax]}>{`${text.length}/${MAX_CHARS} · ~${seconds} s`}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
        {SUGGESTIONS.map((s) => (
          <Pressable key={s.label} onPress={() => addSuggestion(s.text)} style={styles.chip} accessibilityRole="button" accessibilityLabel={`Ajouter « ${s.text} »`}>
            <Ionicons name={s.icon} size={15} color={C.violet} />
            <Text style={styles.chipText}>{s.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {voiceSection}

      <Text style={styles.sectionLabel}>3 • PERSONNALISER</Text>
      <Advanced open={open} onToggle={() => setOpen((o) => !o)}>
        <ValueSlider label="Stabilité" value={stability} onChange={setStability} hint="Plus bas = plus expressif, plus haut = plus régulier" />
        <ValueSlider label="Similarité" value={similarity} onChange={setSimilarity} hint="Fidélité au timbre de la voix" />
        <ValueSlider label="Style / expression" value={style} onChange={setStyle} hint="Accentue l'expressivité de la voix" />
        <ValueSlider label="Vitesse" value={speed} min={0.7} max={1.2} step={0.05} display={`${speed.toFixed(2)}×`} onChange={setSpeed} hint="Débit de parole" />
      </Advanced>

      <View style={[styles.card, styles.consentCard]}><RightsConsent checked={rightsOk} onChange={setRightsOk} disabled={busy} /></View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {busy ? <Busy label="Génération du message vocal…" /> : <GenerateButton label="Générer le message vocal" onPress={generate} disabled={!canGenerate} />}
      <Text style={styles.hint}>Le coût est calculé selon la durée réelle de l’audio. Aucun jeton n’est débité en cas d’échec.</Text>

      {result ? (
        <View style={styles.gap}>
          <Text style={styles.sectionLabel}>RÉSULTAT</Text>
          <AiBadge />
          <AudioClip uri={result} label={`Audio · ${selected?.name ?? ''}`} accent={C.violet} downloadName={`message-vocal-${selected?.name ?? ''}`} />
        </View>
      ) : null}
    </View>
  )
}

function RecordTab({ selected, locked, onConsumed, voiceSection, stopPreview }) {
  const [source, setSource] = useState(null)
  const [open, setOpen] = useState(false)
  const [stability, setStability] = useState(0.5)
  const [similarity, setSimilarity] = useState(0.9)
  const [style, setStyle] = useState(0)
  const [removeNoise, setRemoveNoise] = useState(true)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const [rightsOk, setRightsOk] = useState(false)
  const canTransform = !!source && !!selected && !busy && !locked && rightsOk

  const transform = async () => {
    if (!canTransform) return
    stopPreview()
    setBusy(true); setError(null); setResult(null)
    try {
      const form = new FormData()
      form.append('audio', { uri: source, name: 'message.wav', type: 'audio/wav' })
      form.append('voiceId', selected.id)
      form.append('model', 'eleven_multilingual_sts_v2')
      form.append('stability', String(stability))
      form.append('similarity', String(similarity))
      form.append('style', String(style))
      form.append('speakerBoost', 'true')
      form.append('removeNoise', String(removeNoise))
      const res = await fetch(`${WEB_URL}/api/voice/speech-to-speech`, { method: 'POST', headers: await authHeaders(), body: form })
      if (res.status === 402) { onConsumed(0); throw new Error(await readError(res)) }
      if (!res.ok) throw new Error(await readError(res))
      const remaining = Number(res.headers.get('X-Remaining-Credits'))
      setResult(await saveAudio(res))
      if (Number.isFinite(remaining)) onConsumed(remaining)
    } catch (e) { setError(friendlyError(e)) } finally { setBusy(false) }
  }

  return (
    <View style={styles.tabBody}>
      <Text style={styles.sectionLabel}>1 • TON ENREGISTREMENT</Text>
      {source ? (
        <View style={styles.gap}>
          <AudioClip uri={source} label="Ton enregistrement" accent={C.violet} />
          <Pressable onPress={() => { setSource(null); setResult(null) }} style={styles.link} accessibilityRole="button">
            <Ionicons name="refresh" size={15} color={C.muted} /><Text style={styles.linkText}>{"Recommencer l'enregistrement"}</Text>
          </Pressable>
        </View>
      ) : (
        <VoiceRecorder maxSeconds={MAX_SECONDS} minSeconds={1} disabled={busy || locked} onRecorded={(uri) => { stopPreview(); setSource(uri); setResult(null) }} />
      )}

      {voiceSection}

      <Text style={styles.sectionLabel}>3 • PERSONNALISER</Text>
      <Advanced open={open} onToggle={() => setOpen((o) => !o)}>
        <ValueSlider label="Stabilité" value={stability} onChange={setStability} hint="Plus bas = plus d'émotion et de variation" />
        <ValueSlider label="Similarité" value={similarity} onChange={setSimilarity} hint="Ressemblance à la voix cible" />
        <ValueSlider label="Style / expression" value={style} onChange={setStyle} hint="Accentue le style de la voix cible" />
        <View style={styles.switchRow}><Text style={styles.switchLabel}>Réduction de bruit</Text><Switch value={removeNoise} onValueChange={setRemoveNoise} trackColor={{ true: C.violet }} /></View>
      </Advanced>

      <View style={[styles.card, styles.consentCard]}><RightsConsent checked={rightsOk} onChange={setRightsOk} disabled={busy} /></View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {busy ? <Busy label="Transformation de ta voix…" /> : <GenerateButton label="Transformer ma voix" onPress={transform} disabled={!canTransform} />}
      <Text style={styles.hint}>{source ? 'Aucun jeton n’est débité en cas d’échec.' : `Enregistre un message de ${MAX_SECONDS} secondes maximum pour commencer.`}</Text>

      {result ? (
        <View style={styles.gap}>
          <Text style={styles.sectionLabel}>COMPARE LE RÉSULTAT</Text>
          <AudioClip uri={source} label="Voix originale" accent={C.muted} />
          <AiBadge />
          <AudioClip uri={result} label={`Voix transformée · ${selected?.name ?? ''}`} accent={C.violet} downloadName={`voix-transformee-${selected?.name ?? ''}`} />
        </View>
      ) : null}
    </View>
  )
}

function Busy({ label }) {
  return <View style={[styles.card, styles.loader]}><ChapCamLoader size="medium" /><Text style={styles.loaderText}>{label}</Text></View>
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  gap: { gap: 10 },
  pressed: { opacity: 0.85 },
  top: { paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 14 },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  title: { color: C.ink, fontSize: 26, fontWeight: '900', letterSpacing: -0.6 },
  subtitle: { color: C.muted, fontSize: 13, lineHeight: 18, marginTop: 2 },
  content: { paddingHorizontal: 20, gap: 12 },
  card: { backgroundColor: C.white, borderRadius: 22, borderWidth: 1, borderColor: CARD_BORDER },
  quota: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  quotaIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: VIOLET_SOFT, alignItems: 'center', justifyContent: 'center' },
  quotaText: { color: C.ink, fontSize: 14, fontWeight: '800' },
  quotaCost: { color: C.muted, fontSize: 12, marginTop: 1 },
  warn: { color: '#B45309', fontSize: 13, lineHeight: 18 },
  tabs: { flexDirection: 'row', gap: 6, padding: 4, borderRadius: 18, backgroundColor: '#ECEEF6' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 42, borderRadius: 14 },
  tabOn: { backgroundColor: C.white, shadowColor: '#2A3A7A', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  tabText: { color: C.muted, fontSize: 13, fontWeight: '800' },
  tabTextOn: { color: C.violet },
  tabBody: { gap: 12 },
  sectionLabel: { color: C.muted, fontSize: 12, fontWeight: '900', letterSpacing: 1.2, marginTop: 8 },
  composer: { minHeight: 110, padding: 16, paddingBottom: 34, color: C.ink, fontSize: 16, lineHeight: 24 },
  count: { position: 'absolute', right: 16, bottom: 12, color: C.muted, fontSize: 12 },
  countMax: { color: '#EF4444' },
  chips: { gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18, backgroundColor: VIOLET_SOFT },
  chipText: { color: C.ink, fontSize: 14, fontWeight: '600' },
  voiceCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  voicePlay: { width: 52, height: 52, borderRadius: 26, backgroundColor: VIOLET_SOFT, alignItems: 'center', justifyContent: 'center' },
  playIcon: { marginLeft: 3 },
  wave: { flexDirection: 'row', alignItems: 'center', gap: 2, height: 28 },
  waveBar: { width: 2.5, borderRadius: 2, backgroundColor: '#A98BFF' },
  voiceName: { color: C.ink, fontSize: 16, fontWeight: '900' },
  voiceMeta: { color: C.muted, fontSize: 12, marginTop: 2 },
  voiceTagline: { color: '#9AA2BA', fontSize: 11, marginTop: 1 },
  change: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 16, backgroundColor: VIOLET_SOFT },
  changeText: { color: C.violet, fontSize: 13, fontWeight: '800' },
  advHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, height: 54 },
  advTitle: { flex: 1, color: C.ink, fontSize: 15, fontWeight: '800' },
  advBody: { gap: 16, paddingHorizontal: 16, paddingBottom: 16 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchLabel: { color: C.ink, fontSize: 14, fontWeight: '700' },
  consentCard: { padding: 14 },
  cta: { height: 62, borderRadius: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 18 },
  ctaOff: { opacity: 0.45 },
  ctaText: { color: C.white, fontSize: 17, fontWeight: '900' },
  hint: { color: C.muted, fontSize: 12, lineHeight: 17, textAlign: 'center' },
  link: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  linkText: { color: C.muted, fontSize: 13, fontWeight: '700' },
  loader: { alignItems: 'center', gap: 10, paddingVertical: 22 },
  loaderText: { color: C.ink, fontSize: 14, fontWeight: '800' },
  error: { color: '#DC2626', fontSize: 13, lineHeight: 18 },
})
