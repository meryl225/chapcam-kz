import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { File, Paths } from 'expo-file-system'
import { ChapCamLoader } from '../ui/ChapCamLoader'
import { C } from '../ui/catalog'
import { supabase } from '../lib/supabase'
import { ValueSlider } from '../ui/ValueSlider'
import { VoiceRecorder } from '../ui/VoiceRecorder'
import { AudioClip } from '../ui/AudioClip'
import { VoicePicker } from '../ui/VoicePicker'
import { API_URL as WEB_URL, friendlyError } from '../lib/api'
import { AiBadge, RightsConsent } from '../ui/Safety'

// Mirrors lib/plans.ts VOICE_MESSAGE_MAX_CHARS / VOICE_MESSAGE_MAX_SECONDS.
const MAX_CHARS = 240
const MAX_SECONDS = 15
// Mirrors components/message-vocal/message-vocal-client.tsx and lib/jetons.ts (1 000 Jetons = 10 000 FCFA).
const JETONS_PER_MESSAGE = 10
const FCFA_PER_JETON = 10

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

export function VoiceMessageScreen({ onBack }) {
  const [tab, setTab] = useState('text')
  const [voices, setVoices] = useState([])
  const [selected, setSelected] = useState(null)
  const [quota, setQuota] = useState(null)
  const [loadError, setLoadError] = useState(null)

  const load = useCallback(async () => {
    const headers = await authHeaders()
    const [voiceRes, quotaRes] = await Promise.all([
      fetch(`${WEB_URL}/api/voice-swap/voices`, { headers }),
      fetch(`${WEB_URL}/api/voice/message-quota`, { headers }),
    ])
    if (!voiceRes.ok || !quotaRes.ok) throw new Error('Impossible de charger les voix ou le solde.')
    const voiceData = await voiceRes.json()
    const quotaData = await quotaRes.json()
    const list = (Array.isArray(voiceData.voices) ? voiceData.voices : []).map((v) => ({
      id: v.id || v.voice_id,
      name: v.shortName || v.name,
      meta: [v.genderLabel, v.languageLabel, v.accentLabel].filter(Boolean).join(' • '),
      previewUrl: v.previewUrl || v.preview_url || null,
      group: v.isFrench ? 'Voix françaises' : v.languageLabel || 'Autres voix',
    }))
    list.sort((a, b) => (a.group === 'Voix françaises' ? -1 : b.group === 'Voix françaises' ? 1 : a.group.localeCompare(b.group)))
    setVoices(list)
    setSelected((prev) => prev || list[0] || null)
    setQuota(quotaData)
  }, [])

  useEffect(() => { load().catch((e) => setLoadError(friendlyError(e, 'Chargement des voix impossible.'))) }, [load])

  const locked = quota ? quota.remaining < 1 : true
  const onConsumed = (remaining) => setQuota((q) => ({ ...q, remaining }))

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.top}>
        <Pressable onPress={onBack} style={styles.back} accessibilityRole="button" accessibilityLabel="Retour"><Ionicons name="chevron-back" size={24} color={C.ink} /></Pressable>
        <View style={styles.flex}><Text style={styles.title}>Message Vocal</Text><Text style={styles.subtitle}>Écris ou enregistre, ChapCam fait parler la voix choisie</Text></View>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.quota}>
          <Ionicons name="chatbubble-ellipses-outline" size={18} color={C.blue} />
          <Text style={styles.quotaText}>{quota ? `${quota.remaining} message${quota.remaining > 1 ? 's' : ''} vocal${quota.remaining > 1 ? 'aux' : ''} restant${quota.remaining > 1 ? 's' : ''}` : 'Chargement du solde…'}</Text>
          <Text style={styles.quotaCost}>{`1 message = ${JETONS_PER_MESSAGE} Jetons · ${(JETONS_PER_MESSAGE * FCFA_PER_JETON).toLocaleString('fr-FR')} FCFA`}</Text>
        </View>
        {quota && quota.remaining < 1 ? (
          <Text style={styles.warn}>{quota.subActive ? 'Tu as utilisé tous tes messages vocaux inclus.' : 'Les messages vocaux sont inclus avec un abonnement ChapCam.'}</Text>
        ) : null}
        {loadError ? <Text style={styles.error}>{loadError}</Text> : null}

        <View style={styles.tabs} accessibilityRole="tablist">
          <TabButton active={tab === 'text'} icon="create-outline" label="Écrire un message" onPress={() => setTab('text')} />
          <TabButton active={tab === 'record'} icon="mic-outline" label="Enregistrer ma voix" onPress={() => setTab('record')} />
        </View>

        {tab === 'text'
          ? <TextTab voices={voices} selected={selected} onSelect={setSelected} locked={locked} onConsumed={onConsumed} />
          : <RecordTab voices={voices} selected={selected} onSelect={setSelected} locked={locked} onConsumed={onConsumed} />}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function TabButton({ active, icon, label, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.tab, active && styles.tabOn]} accessibilityRole="tab" accessibilityState={{ selected: active }}>
      <Ionicons name={icon} size={17} color={active ? C.white : C.ink} />
      <Text style={[styles.tabText, active && styles.tabTextOn]}>{label}</Text>
    </Pressable>
  )
}

function Step({ n, title }) {
  return <View style={styles.step}><View style={styles.stepNum}><Text style={styles.stepNumText}>{n}</Text></View><Text style={styles.stepTitle}>{title}</Text></View>
}

function Advanced({ open, onToggle, children }) {
  return (
    <View>
      <Pressable onPress={onToggle} style={styles.advHead} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        <Ionicons name="options-outline" size={18} color={C.violet} />
        <Text style={styles.advTitle}>Réglages avancés</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={C.muted} />
      </Pressable>
      {open ? <View style={styles.advBody}>{children}</View> : null}
    </View>
  )
}

function TextTab({ voices, selected, onSelect, locked, onConsumed }) {
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const [stability, setStability] = useState(0.5)
  const [similarity, setSimilarity] = useState(0.85)
  const [style, setStyle] = useState(0.2)
  const [speed, setSpeed] = useState(1)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const canGenerate = text.trim().length > 0 && text.length <= MAX_CHARS && !!selected && !busy && !locked

  const generate = async () => {
    if (!canGenerate) return
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
      <Step n={1} title="Écris ou colle ton texte" />
      <View>
        <TextInput value={text} onChangeText={(v) => setText(v.slice(0, MAX_CHARS))} placeholder="Saisis le message que tu veux transformer en voix…" placeholderTextColor={C.muted} multiline textAlignVertical="top" style={styles.composer} />
        <Text style={[styles.count, text.length >= MAX_CHARS && styles.countMax]}>{text.length} / {MAX_CHARS}</Text>
      </View>
      <Step n={2} title="Choisis une voix" />
      <VoicePicker voices={voices} selectedId={selected?.id} onSelect={onSelect} accent={C.violet} />
      <Advanced open={open} onToggle={() => setOpen((o) => !o)}>
        <ValueSlider label="Stabilité" value={stability} onChange={setStability} hint="Plus bas = plus expressif, plus haut = plus régulier" />
        <ValueSlider label="Similarité" value={similarity} onChange={setSimilarity} hint="Fidélité au timbre de la voix" />
        <ValueSlider label="Style / expression" value={style} onChange={setStyle} hint="Accentue l'expressivité de la voix" />
        <ValueSlider label="Vitesse" value={speed} min={0.7} max={1.2} step={0.05} display={`${speed.toFixed(2)}×`} onChange={setSpeed} hint="Débit de parole" />
      </Advanced>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {busy ? <Busy label="Génération du message vocal…" /> : (
        <Pressable onPress={generate} disabled={!canGenerate} style={[styles.cta, { backgroundColor: C.violet }, !canGenerate && styles.ctaOff]} accessibilityRole="button">
          <Ionicons name="sparkles" size={19} color={C.white} /><Text style={styles.ctaText}>Générer le message vocal</Text>
        </Pressable>
      )}
      {result ? <><Step n={3} title="Écoute ton message" /><AiBadge /><AudioClip uri={result} label={`Audio · ${selected?.name ?? ''}`} accent={C.violet} /></> : null}
    </View>
  )
}

function RecordTab({ voices, selected, onSelect, locked, onConsumed }) {
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
      <Step n={1} title="Enregistre ton message" />
      {source ? (
        <View style={styles.gap}>
          <AudioClip uri={source} label="Ton enregistrement" accent={C.blue} />
          <Pressable onPress={() => { setSource(null); setResult(null) }} style={styles.link} accessibilityRole="button">
            <Ionicons name="refresh" size={15} color={C.muted} /><Text style={styles.linkText}>{"Recommencer l'enregistrement"}</Text>
          </Pressable>
        </View>
      ) : (
        <VoiceRecorder maxSeconds={MAX_SECONDS} minSeconds={1} disabled={busy || locked} onRecorded={(uri) => { setSource(uri); setResult(null) }} />
      )}
      <Step n={2} title="Choisis une voix cible" />
      <VoicePicker voices={voices} selectedId={selected?.id} onSelect={onSelect} accent={C.blue} />
      <Advanced open={open} onToggle={() => setOpen((o) => !o)}>
        <ValueSlider label="Stabilité" value={stability} onChange={setStability} accent={C.blue} hint="Plus bas = plus d'émotion et de variation" />
        <ValueSlider label="Similarité" value={similarity} onChange={setSimilarity} accent={C.blue} hint="Ressemblance à la voix cible" />
        <ValueSlider label="Style / expression" value={style} onChange={setStyle} accent={C.blue} hint="Accentue le style de la voix cible" />
        <View style={styles.switchRow}><Text style={styles.switchLabel}>Réduction de bruit</Text><Switch value={removeNoise} onValueChange={setRemoveNoise} trackColor={{ true: C.blue }} /></View>
      </Advanced>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <RightsConsent checked={rightsOk} onChange={setRightsOk} disabled={busy} />
      {busy ? <Busy label="Transformation de ta voix…" /> : (
        <Pressable onPress={transform} disabled={!canTransform} style={[styles.cta, { backgroundColor: C.blue }, !canTransform && styles.ctaOff]} accessibilityRole="button">
          <Ionicons name="sparkles" size={19} color={C.white} /><Text style={styles.ctaText}>Transformer ma voix</Text>
        </Pressable>
      )}
      {!source ? <Text style={styles.hint}>Enregistre un message de {MAX_SECONDS} secondes maximum pour commencer.</Text> : null}
      {result ? (
        <View style={styles.gap}>
          <Step n={3} title="Compare le résultat" />
          <AudioClip uri={source} label="Voix originale" accent={C.muted} />
          <AiBadge />
          <AudioClip uri={result} label={`Voix transformée · ${selected?.name ?? ''}`} accent={C.blue} />
        </View>
      ) : null}
    </View>
  )
}

function Busy({ label }) {
  return <View style={styles.loader}><ChapCamLoader size="medium" /><Text style={styles.loaderText}>{label}</Text></View>
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  gap: { gap: 10 },
  top: { paddingTop: 58, paddingHorizontal: 20, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  title: { color: C.ink, fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  subtitle: { color: C.muted, fontSize: 13, marginTop: 2 },
  content: { paddingHorizontal: 20, paddingBottom: 48, gap: 14 },
  quota: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: 16, backgroundColor: C.white, borderWidth: 1, borderColor: '#E5E9F4' },
  quotaText: { flex: 1, color: C.ink, fontSize: 14, fontWeight: '800' },
  quotaCost: { color: C.muted, fontSize: 11 },
  warn: { color: '#B45309', fontSize: 13, lineHeight: 18 },
  tabs: { flexDirection: 'row', gap: 8, padding: 4, borderRadius: 18, backgroundColor: '#E9ECF5' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: 14 },
  tabOn: { backgroundColor: C.ink },
  tabText: { color: C.ink, fontSize: 13, fontWeight: '800' },
  tabTextOn: { color: C.white },
  tabBody: { gap: 14 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  stepNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#E5E9F4', alignItems: 'center', justifyContent: 'center' },
  stepNumText: { color: C.ink, fontSize: 12, fontWeight: '900' },
  stepTitle: { color: C.ink, fontSize: 15, fontWeight: '900' },
  composer: { minHeight: 150, borderRadius: 20, backgroundColor: C.white, borderWidth: 1, borderColor: '#E5E9F4', padding: 16, paddingBottom: 30, color: C.ink, fontSize: 16, lineHeight: 24 },
  count: { position: 'absolute', right: 14, bottom: 10, color: C.muted, fontSize: 11 },
  countMax: { color: '#EF4444' },
  advHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, height: 50, borderRadius: 16, backgroundColor: C.white, borderWidth: 1, borderColor: '#E5E9F4' },
  advTitle: { flex: 1, color: C.ink, fontSize: 14, fontWeight: '800' },
  advBody: { marginTop: 8, gap: 16, padding: 16, borderRadius: 16, backgroundColor: C.white, borderWidth: 1, borderColor: '#E5E9F4' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchLabel: { color: C.ink, fontSize: 14, fontWeight: '700' },
  cta: { height: 56, borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  ctaOff: { opacity: 0.4 },
  ctaText: { color: C.white, fontSize: 16, fontWeight: '900' },
  hint: { color: C.muted, fontSize: 12, textAlign: 'center' },
  link: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  linkText: { color: C.muted, fontSize: 13, fontWeight: '700' },
  loader: { alignItems: 'center', gap: 10, paddingVertical: 22, borderRadius: 20, backgroundColor: C.white },
  loaderText: { color: C.ink, fontSize: 14, fontWeight: '800' },
  error: { color: '#DC2626', fontSize: 13, lineHeight: 18 },
})
