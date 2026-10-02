import React, { useEffect, useRef, useState } from 'react'
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import Constants from 'expo-constants'
import { useVideoPlayer, VideoView } from 'expo-video'
import { supabase } from '../lib/supabase'
import { C, PAD } from '../ui/catalog'
import { ChapCamLoader } from '../ui/ChapCamLoader'

const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? Constants.expoConfig?.extra?.apiUrl ?? 'https://chapcam.com').replace(/\/$/, '')
const MAX_SCRIPT_CHARS = 420
const CHARS_PER_SECOND = 14
// Mirrors lib/jetons.ts + lib/tool-costs.ts: reserveJetons(estimatedSeconds * 0.05).
const JETONS_PER_USD = 60
const PER_SECOND_USD = 0.05

function estimateSeconds(script) {
  return Math.min(30, Math.max(2, Math.ceil(script.trim().length / CHARS_PER_SECOND)))
}

function ResultVideo({ uri }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = false })
  return <VideoView player={player} style={styles.resultVideo} nativeControls contentFit="contain" allowsFullscreen />
}

export function PhotoVideoScreen({ onBack }) {
  const [photo, setPhoto] = useState(null)
  const [prompt, setPrompt] = useState('')
  const [voices, setVoices] = useState([])
  const [voiceId, setVoiceId] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const pollRef = useRef(null)

  useEffect(() => () => pollRef.current && clearInterval(pollRef.current), [])
  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(async ({ data }) => {
      const token = data?.session?.access_token
      if (!token) return
      const response = await fetch(`${API_URL}/api/heygen/voices`, { headers: { Authorization: `Bearer ${token}` } })
      const json = await response.json().catch(() => ({}))
      if (active && response.ok && json.voices?.length) {
        setVoices(json.voices)
        setVoiceId(json.voices[0].voice_id)
      }
    }).catch(() => {})
    return () => { active = false }
  }, [])

  const seconds = estimateSeconds(prompt)
  const cost = Math.ceil(seconds * PER_SECOND_USD * JETONS_PER_USD)
  const canGenerate = !!photo?.uri && prompt.trim().length > 0 && prompt.trim().length <= MAX_SCRIPT_CHARS && !!voiceId && !busy

  const choosePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) return Alert.alert('Photos', 'Autorise ChapCam à accéder à tes photos dans Réglages.')
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.9 })
    const selected = picked.assets?.[0]
    if (!picked.canceled && selected?.uri) setPhoto(selected)
  }

  const generate = async () => {
    if (!canGenerate) return
    setBusy(true); setError(''); setResult(null)
    try {
      const { data } = await supabase.auth.getSession()
      const token = data?.session?.access_token
      if (!token) throw new Error('Session expirée. Reconnecte-toi.')
      const form = new FormData()
      form.append('file', { uri: photo.uri, name: 'photo.jpg', type: photo.mimeType || 'image/jpeg' })
      form.append('script', prompt.trim())
      form.append('voice_id', voiceId)
      form.append('expressiveness', 'medium')
      form.append('speed', '1')
      const response = await fetch(`${API_URL}/api/heygen/photo-video`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form })
      const json = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(json.error || 'La génération a échoué.')
      const videoId = json.video_id
      pollRef.current = setInterval(async () => {
        const statusResponse = await fetch(`${API_URL}/api/heygen/photo-video?video_id=${encodeURIComponent(videoId)}`, { headers: { Authorization: `Bearer ${token}` } })
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
        <View style={styles.titleWrap}><Text style={styles.title}>Photos en Vidéo</Text><Text style={styles.subtitle}>Anime une photo avec une voix et un mouvement naturels.</Text></View>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionLabel}>PHOTO DE RÉFÉRENCE</Text>
        <Pressable onPress={choosePhoto} style={styles.photoCard} accessibilityRole="button">
          {photo ? <Image source={{ uri: photo.uri }} style={styles.photo} resizeMode="cover" /> : <><Ionicons name="image-outline" size={32} color={C.violet} /><Text style={styles.photoTitle}>Choisir une photo</Text><Text style={styles.photoHint}>Une image nette donne de meilleurs résultats</Text></>}
          {photo ? <Pressable onPress={() => setPhoto(null)} style={styles.remove}><Ionicons name="close" size={17} color={C.white} /></Pressable> : null}
        </Pressable>
        <Text style={styles.sectionLabel}>PROMPT</Text>
        <View style={styles.promptCard}><TextInput value={prompt} onChangeText={setPrompt} multiline maxLength={MAX_SCRIPT_CHARS} placeholder="Décris le mouvement, l’action, la caméra ou l’ambiance souhaitée..." placeholderTextColor={C.muted} style={styles.input} textAlignVertical="top" /><Text style={styles.counter}>{prompt.length}/{MAX_SCRIPT_CHARS}</Text></View>
        <Text style={styles.sectionLabel}>VOIX</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.voiceRow}>{voices.map((voice) => <Pressable key={voice.voice_id} onPress={() => setVoiceId(voice.voice_id)} style={[styles.voice, voice.voice_id === voiceId && styles.voiceActive]}><Ionicons name="mic-outline" size={16} color={voice.voice_id === voiceId ? C.white : C.violet} /><Text style={[styles.voiceText, voice.voice_id === voiceId && styles.voiceTextActive]} numberOfLines={1}>{voice.name}</Text></Pressable>)}</ScrollView>
        {result ? <View style={styles.resultCard}><Text style={styles.resultLabel}>VIDÉO GÉNÉRÉE</Text><ResultVideo uri={result} /></View> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.footer}><Text style={styles.cost}>{prompt.trim() ? <>Coût : <Text style={styles.costStrong}>{cost} Jetons</Text></> : 'Le coût sera calculé selon ton prompt'}</Text><Pressable onPress={generate} disabled={!canGenerate} style={[styles.generate, !canGenerate && styles.generateDisabled]}>{busy ? <ChapCamLoader size="small" tone="light" /> : <><Text style={styles.generateText}>Générer la vidéo</Text><Ionicons name="arrow-forward" size={19} color={C.white} /></>}</Pressable></View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg }, topbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: PAD, paddingVertical: 16, gap: 10, borderBottomWidth: 1, borderBottomColor: '#E7EAF3' }, back: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white }, titleWrap: { flex: 1 }, title: { color: C.ink, fontSize: 21, fontWeight: '900' }, subtitle: { color: C.muted, fontSize: 12, marginTop: 3 }, content: { padding: PAD, gap: 12, paddingBottom: 36 }, sectionLabel: { color: C.muted, fontSize: 11, fontWeight: '900', letterSpacing: 1, marginTop: 10 }, photoCard: { height: 245, borderRadius: 24, backgroundColor: C.white, borderWidth: 1, borderColor: '#E2E6F1', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }, photo: { width: '100%', height: '100%' }, photoTitle: { color: C.ink, fontSize: 18, fontWeight: '900', marginTop: 10 }, photoHint: { color: C.muted, fontSize: 13, marginTop: 5 }, remove: { position: 'absolute', right: 12, top: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(11,18,51,0.8)', alignItems: 'center', justifyContent: 'center' }, promptCard: { minHeight: 170, backgroundColor: C.white, borderRadius: 24, borderWidth: 1, borderColor: '#E2E6F1', padding: 16 }, input: { flex: 1, minHeight: 125, color: C.ink, fontSize: 16, lineHeight: 24 }, counter: { color: C.muted, fontSize: 11, textAlign: 'right' }, voiceRow: { gap: 8, paddingVertical: 2 }, voice: { maxWidth: 180, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 18, paddingHorizontal: 13, paddingVertical: 10, backgroundColor: C.white, borderWidth: 1, borderColor: '#E2E6F1' }, voiceActive: { backgroundColor: C.violet, borderColor: C.violet }, voiceText: { color: C.ink, fontSize: 13, fontWeight: '800' }, voiceTextActive: { color: C.white }, resultCard: { backgroundColor: C.white, borderRadius: 24, padding: 12, gap: 10 }, resultLabel: { color: C.muted, fontSize: 11, fontWeight: '900', letterSpacing: 1 }, resultVideo: { width: '100%', height: 360, borderRadius: 18, backgroundColor: '#0B1233' }, error: { color: '#B42318', fontSize: 13, fontWeight: '700' }, footer: { gap: 10, marginTop: 8 }, cost: { color: C.muted, fontSize: 14 }, costStrong: { color: C.ink, fontWeight: '900' }, generate: { minHeight: 56, borderRadius: 28, backgroundColor: C.blue, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }, generateDisabled: { opacity: 0.45 }, generateText: { color: C.white, fontSize: 17, fontWeight: '900' },
})


