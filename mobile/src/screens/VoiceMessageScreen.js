import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio'
import { File, Paths } from 'expo-file-system'
import { ChapCamLoader } from '../ui/ChapCamLoader'
import { C } from '../ui/catalog'
import { supabase } from '../lib/supabase'

const WEB_URL = 'https://chapcam.com'
const MAX_CHARS = 1200
const SETTINGS = { stability: 0.5, similarity: 0.85, style: 0.2, speed: 1 }

async function authHeaders() {
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export function VoiceMessageScreen({ onBack }) {
  const [text, setText] = useState('')
  const [voices, setVoices] = useState([])
  const [selected, setSelected] = useState(null)
  const [quota, setQuota] = useState(null)
  const [busy, setBusy] = useState(false)
  const [resultUri, setResultUri] = useState(null)
  const [error, setError] = useState(null)
  const player = useAudioPlayer(resultUri || undefined)
  const status = useAudioPlayerStatus(player)

  const load = useCallback(async () => {
    const headers = await authHeaders()
    const [voiceRes, quotaRes] = await Promise.all([
      fetch(`${WEB_URL}/api/voice-swap/voices`, { headers }),
      fetch(`${WEB_URL}/api/voice/message-quota`, { headers }),
    ])
    if (!voiceRes.ok || !quotaRes.ok) throw new Error('Impossible de charger les voix ou le solde.')
    const voiceData = await voiceRes.json()
    const quotaData = await quotaRes.json()
    const available = Array.isArray(voiceData.voices) ? voiceData.voices : []
    const normalized = available.map((voice) => ({ ...voice, id: voice.id || voice.voice_id }))
    setVoices(normalized)
    setSelected(normalized[0] || null)
    setQuota(quotaData)
  }, [])

  useEffect(() => { load().catch((e) => setError(e.message)) }, [load])

  const cost = 1
  const canGenerate = text.trim().length > 0 && text.length <= MAX_CHARS && selected && !busy && quota?.remaining >= cost

  const generate = async () => {
    if (!canGenerate) return
    setBusy(true); setError(null)
    try {
      const headers = { ...(await authHeaders()), 'Content-Type': 'application/json' }
      const res = await fetch(`${WEB_URL}/api/voice/text-to-speech`, {
        method: 'POST', headers,
        body: JSON.stringify({ text: text.trim(), voiceId: selected.id, modelId: 'eleven_multilingual_v2', stability: SETTINGS.stability, similarity: SETTINGS.similarity, style: SETTINGS.style, speed: SETTINGS.speed, speakerBoost: true }),
      })
      if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data.error || 'La génération a échoué.') }
      const bytes = new Uint8Array(await res.arrayBuffer())
      const file = new File(Paths.cache, `chapcam-voice-${Date.now()}.mp3`)
      file.write(bytes)
      setResultUri(file.uri)
      const remaining = Number(res.headers.get('X-Remaining-Credits'))
      if (Number.isFinite(remaining)) setQuota((q) => ({ ...q, remaining }))
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  const toggle = () => { if (status.playing) player.pause(); else player.play() }
  const duration = status.duration > 0 ? `${Math.floor(status.duration / 60)}:${String(Math.floor(status.duration % 60)).padStart(2, '0')}` : null

  return <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={styles.top}><Pressable onPress={onBack} style={styles.back}><Ionicons name="chevron-back" size={24} color={C.ink} /></Pressable><View><Text style={styles.title}>Message Vocal</Text><Text style={styles.subtitle}>Transforme ton texte en voix naturelle</Text></View></View>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.section}>Ton message</Text>
      <TextInput value={text} onChangeText={(v) => setText(v.slice(0, MAX_CHARS))} placeholder="Écris le texte que la voix doit prononcer..." placeholderTextColor={C.muted} multiline textAlignVertical="top" style={styles.composer} />
      <Text style={styles.count}>{text.length}/{MAX_CHARS}</Text>
      <Text style={styles.section}>Choisir une voix</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.voiceList}>
        {voices.map((voice) => <Pressable key={voice.id} onPress={() => setSelected(voice)} style={[styles.voice, selected?.id === voice.id && styles.voiceOn]}><View style={styles.voiceIcon}><Ionicons name="mic" size={17} color={selected?.id === voice.id ? C.white : C.blue} /></View><Text numberOfLines={1} style={styles.voiceName}>{voice.shortName || voice.name}</Text><Text numberOfLines={1} style={styles.voiceMeta}>{voice.languageLabel || voice.language || 'Voix disponible'}</Text></Pressable>)}
      </ScrollView>
      <View style={styles.info}><Ionicons name="options-outline" size={18} color={C.violet} /><View style={{ flex: 1 }}><Text style={styles.infoTitle}>Réglage naturel</Text><Text style={styles.infoText}>Voix multilingue, stabilité et expressivité optimisées automatiquement.</Text></View></View>
      <View style={styles.costRow}><Text style={styles.cost}>Coût : <Text style={styles.costStrong}>{cost} Jeton</Text></Text><Text style={styles.remaining}>{quota ? `${quota.remaining} restant${quota.remaining > 1 ? 's' : ''}` : 'Solde...'}</Text></View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {busy ? <View style={styles.loader}><ChapCamLoader size="medium" /><Text style={styles.loaderText}>Création de ta voix...</Text></View> : <Pressable onPress={generate} disabled={!canGenerate} style={[styles.cta, !canGenerate && styles.ctaOff]}><Ionicons name="sparkles" size={19} color={C.white} /><Text style={styles.ctaText}>Générer le message vocal</Text></Pressable>}
      {resultUri ? <View style={styles.result}><Text style={styles.resultTitle}>Ton message vocal</Text><Pressable onPress={toggle} style={styles.play}><Ionicons name={status.playing ? 'pause' : 'play'} size={22} color={C.white} /><Text style={styles.playText}>{status.playing ? 'Pause' : 'Écouter'}</Text></Pressable><View style={styles.resultFooter}><Text style={styles.resultMeta}>{duration || 'Audio généré'}</Text><Pressable onPress={() => player.seekTo(0)}><Ionicons name="refresh" size={19} color={C.blue} /></Pressable></View></View> : null}
    </ScrollView>
  </KeyboardAvoidingView>
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: C.bg }, top: { paddingTop: 58, paddingHorizontal: 20, paddingBottom: 18, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.bg }, back: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' }, title: { color: C.ink, fontSize: 24, fontWeight: '900', letterSpacing: -0.5 }, subtitle: { color: C.muted, fontSize: 13, marginTop: 2 }, content: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 }, section: { color: C.ink, fontSize: 16, fontWeight: '900', marginTop: 10 }, composer: { minHeight: 170, borderRadius: 22, backgroundColor: C.white, borderWidth: 1, borderColor: '#E5E9F4', padding: 18, color: C.ink, fontSize: 17, lineHeight: 25 }, count: { color: C.muted, fontSize: 12, textAlign: 'right', marginTop: -8 }, voiceList: { gap: 10, paddingVertical: 2 }, voice: { width: 128, padding: 12, borderRadius: 18, backgroundColor: C.white, borderWidth: 1, borderColor: '#E5E9F4' }, voiceOn: { borderColor: C.blue, backgroundColor: '#F0F4FF' }, voiceIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E8EEFF', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }, voiceName: { color: C.ink, fontWeight: '800', fontSize: 13 }, voiceMeta: { color: C.muted, fontSize: 11, marginTop: 3 }, info: { flexDirection: 'row', gap: 10, padding: 15, borderRadius: 18, backgroundColor: '#F1EEFF' }, infoTitle: { color: C.ink, fontWeight: '800' }, infoText: { color: C.muted, fontSize: 12, marginTop: 3, lineHeight: 17 }, costRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6 }, cost: { color: C.ink, fontSize: 15 }, costStrong: { fontWeight: '900' }, remaining: { color: C.blue, fontSize: 13, fontWeight: '800' }, cta: { height: 56, borderRadius: 28, backgroundColor: C.blue, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 }, ctaOff: { opacity: 0.4 }, ctaText: { color: C.white, fontSize: 16, fontWeight: '900' }, error: { color: '#B42318', fontSize: 13, fontWeight: '700' }, loader: { height: 92, alignItems: 'center', justifyContent: 'center', gap: 5 }, loaderText: { color: C.muted, fontSize: 13 }, result: { marginTop: 10, padding: 18, borderRadius: 22, backgroundColor: C.navy }, resultTitle: { color: C.white, fontSize: 18, fontWeight: '900', marginBottom: 14 }, play: { height: 50, borderRadius: 25, backgroundColor: C.blue, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, playText: { color: C.white, fontWeight: '900' }, resultFooter: { marginTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, resultMeta: { color: '#CBD4F2', fontSize: 13 } })
