import React, { useEffect, useRef, useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useVideoPlayer, VideoView } from 'expo-video'
import { supabase } from '../lib/supabase'
import { C, PAD } from '../ui/catalog'
import { ChapCamLoader } from '../ui/ChapCamLoader'
import { API_URL, friendlyError } from '../lib/api'
import { AiBadge, ReportAbuseButton, RightsConsent } from '../ui/Safety'

const MAX_SECONDS = 60
const MAX_BYTES = 60 * 1024 * 1024

// Mirrors lib/tool-costs.ts translationJetons: HeyGen rate per source second x 2.5, 60 Jetons per USD.
const HEYGEN_USD_PER_SECOND = { speed: 0.0333, precision: 0.0667 }
const MARGIN_MULTIPLIER = 2.5
const JETONS_PER_USD = 60
const round4 = (value) => Math.round(value * 10000) / 10000
const translationJetons = (seconds, mode) => {
  const billed = Math.min(MAX_SECONDS, Math.max(1, Math.ceil(seconds)))
  const providerUsd = round4(billed * HEYGEN_USD_PER_SECOND[mode])
  return Math.max(1, Math.ceil(round4(providerUsd * MARGIN_MULTIPLIER) * JETONS_PER_USD))
}
const perSecondLabel = (mode) =>
  (translationJetons(MAX_SECONDS, mode) / MAX_SECONDS).toLocaleString('fr-FR', { maximumFractionDigits: 1 })

function Preview({ uri, result = false }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = false })
  return <VideoView player={player} style={result ? styles.resultVideo : styles.sourceVideo} nativeControls contentFit="contain" allowsFullscreen />
}

export function VideoTranslationScreen({ onBack }) {
  const insets = useSafeAreaInsets()
  const [video, setVideo] = useState(null)
  const [languages, setLanguages] = useState([])
  const [language, setLanguage] = useState('')
  const [mode, setMode] = useState('speed')
  const [caption, setCaption] = useState(false)
  const [credits, setCredits] = useState(null)
  const [status, setStatus] = useState('idle')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const pollRef = useRef(null)
  const [rightsOk, setRightsOk] = useState(false)
  const busy = status === 'uploading' || status === 'processing'
  const videoSeconds = video?.duration ? video.duration / 1000 : null
  const cost = translationJetons(videoSeconds ?? MAX_SECONDS, mode)

  useEffect(() => () => pollRef.current && clearInterval(pollRef.current), [])
  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(async ({ data }) => {
      const token = data?.session?.access_token
      if (!token) return
      const headers = { Authorization: `Bearer ${token}` }
      const [languageRes, quotaRes] = await Promise.all([
        fetch(`${API_URL}/api/heygen/video-translation?info=languages`, { headers }),
        fetch(`${API_URL}/api/heygen/video-translation?info=quota`, { headers }),
      ])
      const languageJson = await languageRes.json().catch(() => ({}))
      const quotaJson = await quotaRes.json().catch(() => ({}))
      if (active && languageRes.ok && Array.isArray(languageJson.languages)) setLanguages(languageJson.languages)
      if (active && quotaRes.ok && typeof quotaJson.remaining === 'number') setCredits(quotaJson.remaining)
    }).catch(() => {})
    return () => { active = false }
  }, [])

  const chooseVideo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) return Alert.alert('Photos', 'Autorise ChapCam à accéder à tes vidéos dans Réglages.')
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], allowsEditing: false })
    const selected = picked.assets?.[0]
    if (picked.canceled || !selected?.uri) return
    if (selected.fileSize && selected.fileSize > MAX_BYTES) return Alert.alert('Vidéo trop volumineuse', 'La vidéo doit faire 60 Mo maximum.')
    if (selected.duration && selected.duration > MAX_SECONDS * 1000) return Alert.alert('Vidéo trop longue', 'La vidéo doit durer 60 secondes maximum.')
    setVideo(selected); setResult(null); setStatus('idle'); setError('')
  }

  const refreshQuota = async (token) => {
    try {
      const res = await fetch(`${API_URL}/api/heygen/video-translation?info=quota`, { headers: { Authorization: `Bearer ${token}` } })
      const json = await res.json().catch(() => ({}))
      if (res.ok) setCredits(Math.max(0, Number(json.remaining) || 0))
    } catch {}
  }

  const translate = async () => {
    if (!video?.uri || !language || busy || !rightsOk) return
    if (credits !== null && credits < cost) {
      return Alert.alert('Solde insuffisant', `Cette traduction coûte ${cost.toLocaleString('fr-FR')} Jetons. Recharge tes Jetons.`)
    }
    setStatus('uploading'); setResult(null); setError('')
    try {
      const { data } = await supabase.auth.getSession()
      const token = data?.session?.access_token
      if (!token) throw new Error('Session expirée. Reconnecte-toi.')
      const form = new FormData()
      form.append('file', { uri: video.uri, name: video.fileName || 'source-video.mp4', type: video.mimeType || 'video/mp4' })
      form.append('language', language)
      form.append('mode', mode)
      form.append('caption', String(caption))
      const response = await fetch(`${API_URL}/api/heygen/video-translation`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form })
      const json = await response.json().catch(() => ({}))
      if (!response.ok) {
        if (response.status === 402 && typeof json.remaining === 'number') setCredits(json.remaining)
        throw new Error(json.error || 'Impossible de lancer la traduction.')
      }
      const id = json.id || json.video_translation_id
      if (!id) throw new Error('Réponse de traduction invalide.')
      if (typeof json.remaining === 'number') setCredits(json.remaining)
      setStatus('processing')
      if (pollRef.current) clearInterval(pollRef.current)
      pollRef.current = setInterval(async () => {
        try {
          const poll = await fetch(`${API_URL}/api/heygen/video-translation?id=${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${token}` } })
          const body = await poll.json().catch(() => ({}))
          if (body.status === 'completed' && body.video_url) {
            clearInterval(pollRef.current); pollRef.current = null; setResult(body.video_url); setStatus('completed')
          } else if (body.status === 'failed') {
            clearInterval(pollRef.current); pollRef.current = null
            setError(`${body.error || "La vidéo n'a pas pu être traduite."}${body.refunded ? ' Tes Jetons ont été remboursés.' : ''}`)
            setStatus('failed')
            refreshQuota(token)
          }
        } catch {}
      }, 8000)
    } catch (e) { setError(friendlyError(e, 'La traduction a échoué.')); setStatus('failed') }
  }

  const visibleLanguages = languages.filter((item) => item.toLowerCase().includes(search.trim().toLowerCase()))
  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}><Pressable onPress={onBack} style={styles.back} accessibilityLabel="Retour"><Ionicons name="chevron-back" size={24} color={C.ink} /></Pressable><View style={styles.heading}><Text style={styles.title}>Traduction de Vidéo</Text><Text style={styles.subtitle}>Traduis une vidéo dans une autre langue</Text></View></View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 40 + insets.bottom }]} keyboardShouldPersistTaps="handled">
        <Text style={styles.section}>Vidéo source</Text>
        {video ? <View style={styles.previewCard}><Preview uri={video.uri} /><View style={styles.fileRow}><View style={{ flex: 1 }}><Text style={styles.fileName} numberOfLines={1}>{video.fileName || 'Vidéo sélectionnée'}</Text>{video.duration ? <Text style={styles.muted}>{Math.round(video.duration / 1000)} s</Text> : null}</View><Pressable onPress={chooseVideo} style={styles.smallButton}><Text style={styles.smallButtonText}>Remplacer</Text></Pressable><Pressable onPress={() => setVideo(null)} accessibilityLabel="Supprimer la vidéo"><Ionicons name="trash-outline" size={20} color={C.muted} /></Pressable></View></View> : <Pressable onPress={chooseVideo} style={styles.upload}><Ionicons name="cloud-upload-outline" size={30} color={C.blue} /><Text style={styles.uploadTitle}>Choisir une vidéo</Text><Text style={styles.muted}>MP4, MOV ou WebM · 60 secondes maximum</Text></Pressable>}
        <Text style={styles.section}>Langue cible</Text>
        <View style={styles.search}><Ionicons name="search-outline" size={18} color={C.muted} /><TextInput value={search} onChangeText={setSearch} placeholder="Rechercher une langue" placeholderTextColor={C.muted} style={styles.searchInput} /></View>
        <View style={styles.languageGrid}>{visibleLanguages.map((item) => <Pressable key={item} onPress={() => setLanguage(item)} style={[styles.language, language === item && styles.languageSelected]}><Text style={[styles.languageText, language === item && styles.languageTextSelected]}>{item}</Text></Pressable>)}</View>
        {!languages.length ? <Text style={styles.muted}>Chargement des langues disponibles…</Text> : visibleLanguages.length === 0 ? <Text style={styles.muted}>Aucune langue trouvée.</Text> : null}
        <Text style={styles.section}>Options</Text>
        <View style={styles.segment}><Pressable onPress={() => setMode('speed')} style={[styles.segmentItem, mode === 'speed' && styles.segmentActive]}><Text style={[styles.segmentText, mode === 'speed' && styles.segmentTextActive]}>{`Rapide · ${perSecondLabel('speed')} J/s`}</Text></Pressable><Pressable onPress={() => setMode('precision')} style={[styles.segmentItem, mode === 'precision' && styles.segmentActive]}><Text style={[styles.segmentText, mode === 'precision' && styles.segmentTextActive]}>{`Précision · ${perSecondLabel('precision')} J/s`}</Text></Pressable></View>
        <Pressable onPress={() => setCaption(!caption)} style={styles.optionRow}><Ionicons name={caption ? 'checkbox' : 'square-outline'} size={22} color={caption ? C.blue : C.muted} /><View><Text style={styles.optionTitle}>Sous-titres</Text><Text style={styles.muted}>Ajouter des sous-titres à la vidéo traduite</Text></View></Pressable>
        <View style={styles.cost}><Text style={styles.costLabel}>Coût : <Text style={styles.costStrong}>{`${cost.toLocaleString('fr-FR')} Jetons${videoSeconds === null ? ' max' : ''}`}</Text></Text>{credits !== null ? <Text style={styles.muted}>{`${credits.toLocaleString('fr-FR')} Jetons disponibles`}</Text> : null}</View>
        {error ? <View style={styles.error}><Text style={styles.errorText}>{error}</Text></View> : null}
        <RightsConsent checked={rightsOk} onChange={setRightsOk} disabled={busy} />
        {busy ? <View style={styles.loading}><ChapCamLoader size="small" /><Text style={styles.loadingText}>Traduction en cours</Text></View> : <Pressable disabled={!video?.uri || !language || busy || !rightsOk} onPress={translate} style={[styles.cta, (!video?.uri || !language || busy || !rightsOk) && styles.ctaDisabled]} accessibilityRole="button"><Ionicons name="language" size={20} color={C.white} /><Text style={styles.ctaText}>Traduire la vidéo</Text></Pressable>}
        {result ? <View style={styles.result}><Text style={styles.section}>Vidéo traduite</Text><AiBadge /><Preview uri={result} result />{Platform.OS !== 'ios' ? <ReportAbuseButton contentUrl={result} context="Traduction de Vidéo" /> : null}</View> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  topBar: { paddingTop: 12, paddingHorizontal: PAD, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  back: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  heading: { flex: 1 }, title: { color: C.ink, fontSize: 21, fontWeight: '900' }, subtitle: { color: C.muted, fontSize: 13, marginTop: 3 },
  content: { padding: PAD, paddingBottom: 40, gap: 14 }, section: { color: C.ink, fontSize: 17, fontWeight: '900', marginTop: 8 },
  upload: { minHeight: 180, borderRadius: 24, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', gap: 7 }, uploadTitle: { color: C.ink, fontSize: 17, fontWeight: '900' },
  previewCard: { backgroundColor: C.white, borderRadius: 24, padding: 10, borderWidth: 1, borderColor: C.border }, sourceVideo: { height: 205, width: '100%', borderRadius: 18, backgroundColor: C.navy }, resultVideo: { height: 360, width: '100%', borderRadius: 20, backgroundColor: C.navy },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 10 }, fileName: { color: C.ink, fontWeight: '800' }, muted: { color: C.muted, fontSize: 13 }, smallButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: C.softBlue }, smallButtonText: { color: C.blue, fontWeight: '800', fontSize: 12 },
  search: { height: 46, borderRadius: 15, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, gap: 8 }, searchInput: { flex: 1, color: C.ink, fontSize: 15 }, languageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, language: { borderRadius: 16, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, paddingHorizontal: 13, paddingVertical: 10 }, languageSelected: { backgroundColor: C.softBlue, borderColor: C.blue }, languageText: { color: C.ink, fontWeight: '700', fontSize: 13 }, languageTextSelected: { color: C.blue },
  segment: { flexDirection: 'row', padding: 4, borderRadius: 18, backgroundColor: C.white, borderWidth: 1, borderColor: C.border }, segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 14 }, segmentActive: { backgroundColor: C.navy }, segmentText: { color: C.muted, fontWeight: '800', fontSize: 12 }, segmentTextActive: { color: C.white }, optionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.white, borderRadius: 18, padding: 15 }, optionTitle: { color: C.ink, fontWeight: '800' }, cost: { backgroundColor: C.softBlue, borderRadius: 18, padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, costLabel: { color: C.ink, fontSize: 15 }, costStrong: { color: C.blue, fontWeight: '900' }, cta: { height: 56, borderRadius: 28, backgroundColor: C.blue, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, ctaDisabled: { opacity: 0.45 }, ctaText: { color: C.white, fontWeight: '900', fontSize: 16 }, loading: { alignItems: 'center', gap: 4, paddingVertical: 8 }, loadingText: { color: C.muted, fontSize: 13 }, error: { backgroundColor: '#FDECEC', borderRadius: 15, padding: 13 }, errorText: { color: '#B42318', fontWeight: '700' }, result: { gap: 8 },
})
       
