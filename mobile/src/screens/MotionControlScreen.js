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
const MAX_PROMPT = 500
const MOTION_CREDIT_COST = 1

function Preview({ item }) {
  if (!item) return null
  if (item.type?.startsWith('video')) {
    const player = useVideoPlayer(item.uri, (p) => { p.loop = true })
    return <VideoView player={player} style={styles.preview} contentFit="cover" nativeControls />
  }
  return <Image source={{ uri: item.uri }} style={styles.preview} resizeMode="cover" />
}

async function pickMedia(mediaTypes) {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!permission.granted) {
    Alert.alert('Photos', 'Autorise ChapCam à accéder à tes photos dans Réglages.')
    return null
  }
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes, allowsEditing: false, quality: 0.9 })
  return result.canceled ? null : result.assets?.[0] ?? null
}

export function MotionControlScreen({ onBack }) {
  const [source, setSource] = useState(null)
  const [reference, setReference] = useState(null)
  const [prompt, setPrompt] = useState('')
  const [quality, setQuality] = useState('standard')
  const [enhance, setEnhance] = useState(false)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const pollRef = useRef(null)

  useEffect(() => () => pollRef.current && clearInterval(pollRef.current), [])

  const canGenerate = !!source?.uri && !!reference?.uri && !busy && prompt.length <= MAX_PROMPT

  const generate = async () => {
    if (!canGenerate) return
    setBusy(true); setError(''); setResult(null)
    try {
      const { data } = await supabase.auth.getSession()
      const token = data?.session?.access_token
      if (!token) throw new Error('Session expirée. Reconnecte-toi.')
      const form = new FormData()
      form.append('file', { uri: source.uri, name: source.fileName || 'source.jpg', type: source.mimeType || 'image/jpeg' })
      form.append('referenceVideo', { uri: reference.uri, name: reference.fileName || 'motion.mp4', type: reference.mimeType || 'video/mp4' })
      form.append('prompt', prompt.trim() || 'natural full-body motion transfer')
      form.append('model', 'kling3')
      form.append('quality', quality)
      form.append('enhance', String(enhance))
      const response = await fetch(`${API_URL}/api/motion`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form })
      const json = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(json.error || 'Impossible de lancer Motion Control.')
      const requestId = json.request_id
      if (!requestId) throw new Error('Réponse Motion Control invalide.')
      pollRef.current = setInterval(async () => {
        try {
          const statusResponse = await fetch(`${API_URL}/api/motion?request_id=${encodeURIComponent(requestId)}`, { headers: { Authorization: `Bearer ${token}` } })
          const status = await statusResponse.json().catch(() => ({}))
          if (status.status === 'completed' && (status.video_url || status.url)) {
            clearInterval(pollRef.current); pollRef.current = null
            setResult(status.video_url || status.url); setBusy(false)
          } else if (status.status === 'failed') {
            clearInterval(pollRef.current); pollRef.current = null
            setBusy(false); setError(status.error || 'La génération a échoué.')
          }
        } catch { /* polling continues until the server reports completion */ }
      }, 5000)
    } catch (e) { setBusy(false); setError(e.message || 'Une erreur est survenue.') }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.topbar}>
        <Pressable onPress={onBack} style={styles.back} accessibilityRole="button" accessibilityLabel="Retour"><Ionicons name="chevron-back" size={24} color={C.ink} /></Pressable>
        <View style={styles.titleWrap}><Text style={styles.title}>Motion Control</Text><Text style={styles.subtitle}>Transfère un mouvement sur ton personnage</Text></View>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.section}>Média source</Text>
        <View style={styles.card}>
          {source ? <><Preview item={source} /><View style={styles.actions}><Pressable onPress={async () => setSource(await pickMedia(['images']))}><Text style={styles.action}>Remplacer</Text></Pressable><Pressable onPress={() => setSource(null)}><Text style={styles.remove}>Supprimer</Text></Pressable></View></> : <Pressable onPress={async () => setSource(await pickMedia(['images']))} style={styles.drop}><Ionicons name="image-outline" size={28} color={C.blue} /><Text style={styles.dropTitle}>Ajouter une image</Text><Text style={styles.dropCopy}>Le personnage à animer</Text></Pressable>}
        </View>
        <Text style={styles.section}>Référence de mouvement</Text>
        <View style={styles.card}>
          {reference ? <><Preview item={reference} /><View style={styles.actions}><Pressable onPress={async () => setReference(await pickMedia(['videos']))}><Text style={styles.action}>Remplacer</Text></Pressable><Pressable onPress={() => setReference(null)}><Text style={styles.remove}>Supprimer</Text></Pressable></View></> : <Pressable onPress={async () => setReference(await pickMedia(['videos']))} style={styles.drop}><Ionicons name="videocam-outline" size={28} color={C.violet} /><Text style={styles.dropTitle}>Ajouter une vidéo</Text><Text style={styles.dropCopy}>Le mouvement à transférer</Text></Pressable>}
        </View>
        <Text style={styles.section}>Prompt</Text>
        <View style={styles.promptCard}><TextInput value={prompt} onChangeText={setPrompt} multiline maxLength={MAX_PROMPT} placeholder="Décris le mouvement ou le comportement souhaité..." placeholderTextColor={C.muted} style={styles.input} /><Text style={styles.counter}>{prompt.length}/{MAX_PROMPT}</Text></View>
        <Text style={styles.section}>Réglages</Text>
        <View style={styles.options}><Text style={styles.optionLabel}>Qualité</Text><View style={styles.segment}><Pressable onPress={() => setQuality('standard')} style={[styles.segmentItem, quality === 'standard' && styles.segmentActive]}><Text style={[styles.segmentText, quality === 'standard' && styles.segmentTextActive]}>720p</Text></Pressable><Pressable onPress={() => setQuality('pro')} style={[styles.segmentItem, quality === 'pro' && styles.segmentActive]}><Text style={[styles.segmentText, quality === 'pro' && styles.segmentTextActive]}>1080p</Text></Pressable></View><Pressable onPress={() => setEnhance(!enhance)} style={styles.toggleRow}><Ionicons name={enhance ? 'checkbox' : 'square-outline'} size={22} color={enhance ? C.blue : C.muted} /><Text style={styles.toggleText}>Améliorer le rendu</Text></Pressable></View>
        <View style={styles.costRow}><Text style={styles.costLabel}>Coût</Text><Text style={styles.costValue}>{MOTION_CREDIT_COST} crédit Motion</Text></View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {result ? <View style={styles.resultCard}><Text style={styles.resultTitle}>Vidéo générée</Text><ResultVideo uri={result} /></View> : null}
        <Pressable disabled={!canGenerate} onPress={generate} style={[styles.generate, !canGenerate && styles.generateDisabled]}>{busy ? <ChapCamLoader size="small" tone="light" /> : <><Ionicons name="sparkles" size={18} color={C.white} /><Text style={styles.generateText}>Générer</Text></>}</Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  topbar: { paddingTop: 58, paddingHorizontal: PAD, paddingBottom: 18, flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  titleWrap: { flex: 1 }, title: { color: C.ink, fontSize: 22, fontWeight: '900' }, subtitle: { color: C.muted, fontSize: 13, marginTop: 2 },
  content: { paddingHorizontal: PAD, paddingBottom: 40 }, section: { color: C.ink, fontSize: 16, fontWeight: '900', marginTop: 18, marginBottom: 9 },
  card: { backgroundColor: C.white, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#E9EBF4' }, drop: { minHeight: 150, alignItems: 'center', justifyContent: 'center', padding: 22, borderStyle: 'dashed', borderWidth: 1, borderColor: '#D9DDF0' }, dropTitle: { color: C.ink, fontWeight: '900', fontSize: 16, marginTop: 9 }, dropCopy: { color: C.muted, marginTop: 4 }, preview: { width: '100%', height: 220, backgroundColor: C.navy }, actions: { flexDirection: 'row', justifyContent: 'space-between', padding: 14 }, action: { color: C.blue, fontWeight: '800' }, remove: { color: '#B42318', fontWeight: '800' },
  promptCard: { backgroundColor: C.white, borderRadius: 20, borderWidth: 1, borderColor: '#E9EBF4', padding: 14 }, input: { minHeight: 96, color: C.ink, fontSize: 16, lineHeight: 23, textAlignVertical: 'top' }, counter: { alignSelf: 'flex-end', color: C.muted, fontSize: 12 },
  options: { backgroundColor: C.white, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#E9EBF4' }, optionLabel: { color: C.ink, fontWeight: '800', marginBottom: 10 }, segment: { flexDirection: 'row', backgroundColor: '#F1F3FA', borderRadius: 12, padding: 3 }, segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 9 }, segmentActive: { backgroundColor: C.navy }, segmentText: { color: C.muted, fontWeight: '800' }, segmentTextActive: { color: C.white }, toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 16 }, toggleText: { color: C.ink, fontWeight: '700' },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, paddingHorizontal: 4 }, costLabel: { color: C.muted, fontSize: 15 }, costValue: { color: C.ink, fontWeight: '900' }, error: { color: '#B42318', marginTop: 14, fontWeight: '700' }, resultCard: { backgroundColor: C.white, borderRadius: 20, padding: 14, marginTop: 18 }, resultTitle: { color: C.ink, fontWeight: '900', marginBottom: 10 },
  generate: { height: 56, borderRadius: 28, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 24 }, generateDisabled: { opacity: 0.45 }, generateText: { color: C.white, fontSize: 17, fontWeight: '900' },
})
