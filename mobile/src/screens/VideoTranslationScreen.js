import React, { useEffect, useRef, useState } from 'react'
import { Alert, LayoutAnimation, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Text } from '../i18n/Text'
import * as ImagePicker from 'expo-image-picker'
import { requestLibraryAccess, launchLibrary } from '../lib/mediaAccess'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useVideoPlayer, VideoView } from 'expo-video'
import { supabase } from '../lib/supabase'
import { BRAND, C, PAD } from '../ui/catalog'
import { ChapCamLoader } from '../ui/ChapCamLoader'
import { API_URL, friendlyError } from '../lib/api'
import { AiBadge, ReportAbuseButton, RightsConsent } from '../ui/Safety'
import { LanguagePickerSheet } from '../ui/LanguagePickerSheet'
import { describeLanguage } from '../lib/translationLanguages'
import { callPlayer } from '../lib/useSafeVideoPlayer'
import { getLocale } from '../i18n'

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
  (translationJetons(MAX_SECONDS, mode) / MAX_SECONDS).toLocaleString(getLocale(), { maximumFractionDigits: 1 })

const MODES = [
  { id: 'speed', label: 'Rapide' },
  { id: 'precision', label: 'Précision' },
]

function ResultPreview({ uri }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = false })
  return <VideoView player={player} style={styles.resultVideo} nativeControls contentFit="contain" allowsFullscreen />
}

function SourceVideoCard({ video, onChoose, onRemove, disabled }) {
  const player = useVideoPlayer(video?.uri ?? null, (p) => { p.loop = false })
  if (!video) {
    return (
      <Pressable onPress={onChoose} disabled={disabled} style={styles.upload} accessibilityRole="button" accessibilityLabel="Choisir une vidéo">
        <View style={styles.uploadIcon}><Ionicons name="cloud-upload-outline" size={24} color={C.violet} /></View>
        <View style={styles.uploadText}>
          <Text style={styles.uploadTitle}>Choisir une vidéo</Text>
          <Text style={styles.muted}>MP4, MOV ou WebM · 60 s · 60 Mo max</Text>
        </View>
        <Ionicons name="add-circle" size={26} color={C.violet} />
      </Pressable>
    )
  }
  const play = () => {
    if (player.playing) callPlayer(player, 'pause')
    else callPlayer(player, 'play')
  }
  return (
    <View style={styles.card}>
      <VideoView player={player} style={styles.sourceVideo} nativeControls contentFit="contain" allowsFullscreen />
      <View style={styles.fileRow}>
        <View style={styles.fileInfo}>
          <Text style={styles.fileName} numberOfLines={1}>{video.fileName || 'Vidéo sélectionnée'}</Text>
          {video.duration ? <Text style={styles.muted}>{`${Math.round(video.duration / 1000)} s`}</Text> : null}
        </View>
        <Pressable onPress={play} style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Lire la vidéo">
          <Ionicons name="play" size={16} color={C.violet} />
        </Pressable>
        <Pressable onPress={onChoose} disabled={disabled} style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Remplacer la vidéo">
          <Ionicons name="swap-horizontal" size={17} color={C.violet} />
        </Pressable>
        <Pressable onPress={onRemove} disabled={disabled} style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Supprimer la vidéo">
          <Ionicons name="trash-outline" size={16} color={C.muted} />
        </Pressable>
      </View>
    </View>
  )
}

export function VideoTranslationScreen({ onBack }) {
  const insets = useSafeAreaInsets()
  const [video, setVideo] = useState(null)
  const [languages, setLanguages] = useState([])
  const [languagesFailed, setLanguagesFailed] = useState(false)
  const [language, setLanguage] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [mode, setMode] = useState('speed')
  const [caption, setCaption] = useState(false)
  const [credits, setCredits] = useState(null)
  const [status, setStatus] = useState('idle')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const pollRef = useRef(null)
  const [rightsOk, setRightsOk] = useState(false)
  const busy = status === 'uploading' || status === 'processing'
  const videoSeconds = video?.duration ? video.duration / 1000 : null
  const cost = translationJetons(videoSeconds ?? MAX_SECONDS, mode)
  const selectedLanguage = language ? describeLanguage(language) : null
  const canSubmit = Boolean(video?.uri && language && rightsOk && !busy)

  const mountedRef = useRef(true)
  useEffect(() => () => { mountedRef.current = false; if (pollRef.current) clearInterval(pollRef.current) }, [])

  const loadInfo = async () => {
    setLanguagesFailed(false)
    try {
      const { data } = await supabase.auth.getSession()
      const token = data?.session?.access_token
      if (!token) throw new Error('no session')
      const headers = { Authorization: `Bearer ${token}` }
      const [languageRes, quotaRes] = await Promise.all([
        fetch(`${API_URL}/api/heygen/video-translation?info=languages`, { headers }),
        fetch(`${API_URL}/api/heygen/video-translation?info=quota`, { headers }),
      ])
      const languageJson = await languageRes.json().catch(() => ({}))
      const quotaJson = await quotaRes.json().catch(() => ({}))
      if (!mountedRef.current) return
      if (quotaRes.ok && typeof quotaJson.remaining === 'number') setCredits(quotaJson.remaining)
      if (languageRes.ok && Array.isArray(languageJson.languages) && languageJson.languages.length) setLanguages(languageJson.languages)
      else setLanguagesFailed(true)
    } catch {
      if (mountedRef.current) setLanguagesFailed(true)
    }
  }
  useEffect(() => { loadInfo() }, [])

  const chooseVideo = async () => {
    const permission = await requestLibraryAccess()
    if (!permission.granted) {
      return Alert.alert(
        'Accès aux vidéos',
        'Pour choisir une vidéo, tu peux autoriser l’accès à tes vidéos dans les Réglages.',
        [{ text: 'Annuler', style: 'cancel' }, { text: 'Ouvrir les Réglages', onPress: () => Linking.openSettings() }],
      )
    }
    const picked = await launchLibrary({ mediaTypes: ['videos'], allowsEditing: false })
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
      return Alert.alert('Solde insuffisant', `Cette traduction coûte ${cost.toLocaleString(getLocale())} Jetons. Recharge tes Jetons.`)
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

  const toggleAdvanced = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setAdvancedOpen((open) => !open)
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={onBack} style={styles.back} accessibilityRole="button" accessibilityLabel="Retour"><Ionicons name="chevron-back" size={24} color={C.ink} /></Pressable>
        <View style={styles.heading}>
          <Text style={styles.title}>Traduction de Vidéo</Text>
          <Text style={styles.subtitle}>Traduis une vidéo dans une autre langue</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 32 + insets.bottom }]} keyboardShouldPersistTaps="handled">
        <Text style={styles.section}>1 · Vidéo source</Text>
        <SourceVideoCard video={video} onChoose={chooseVideo} onRemove={() => { setVideo(null); setResult(null) }} disabled={busy} />

        <Text style={styles.section}>2 · Langue cible</Text>
        <Pressable onPress={() => setPickerOpen(true)} disabled={busy} style={[styles.languageCard, selectedLanguage && styles.languageCardActive]} accessibilityRole="button" accessibilityLabel={selectedLanguage ? `Langue cible : ${selectedLanguage.label}. Modifier` : 'Choisir une langue'}>
          <View style={styles.globe}><Ionicons name="globe-outline" size={22} color={C.violet} /></View>
          <View style={styles.languageText}>
            <Text style={styles.languageCaption}>Langue cible</Text>
            <Text style={[styles.languageValue, !selectedLanguage && styles.languagePlaceholder]} numberOfLines={1}>
              {selectedLanguage ? selectedLanguage.language : 'Choisir une langue'}
            </Text>
            {selectedLanguage && selectedLanguage.variant !== 'Standard' ? <Text style={styles.muted} numberOfLines={1}>{selectedLanguage.variant}</Text> : null}
          </View>
          {languages.length ? <Ionicons name="chevron-down" size={20} color={C.muted} /> : languagesFailed ? null : <Text style={styles.muted}>Chargement…</Text>}
        </Pressable>
        {languagesFailed && !languages.length ? (
          <Pressable onPress={loadInfo} style={styles.retry} accessibilityRole="button">
            <Ionicons name="refresh" size={16} color={C.violet} />
            <Text style={styles.retryText}>Langues indisponibles · Réessayer</Text>
          </Pressable>
        ) : null}

        <View style={styles.advanced}>
          <Pressable onPress={toggleAdvanced} style={styles.advancedHeader} accessibilityRole="button" accessibilityState={{ expanded: advancedOpen }}>
            <Ionicons name="options-outline" size={20} color={C.violet} />
            <Text style={styles.advancedTitle}>Réglages avancés</Text>
            <Text style={styles.advancedSummary} numberOfLines={1}>{`${MODES.find((m) => m.id === mode).label}${caption ? ' · Sous-titres' : ''}`}</Text>
            <Ionicons name={advancedOpen ? 'chevron-up' : 'chevron-down'} size={18} color={C.muted} />
          </Pressable>
          {advancedOpen ? (
            <View style={styles.advancedBody}>
              <Text style={styles.optionLabel}>Mode de traduction</Text>
              <View style={styles.segment}>
                {MODES.map((m) => (
                  <Pressable key={m.id} onPress={() => setMode(m.id)} disabled={busy} style={[styles.segmentItem, mode === m.id && styles.segmentActive]} accessibilityRole="button" accessibilityState={{ selected: mode === m.id }}>
                    <Text style={[styles.segmentText, mode === m.id && styles.segmentTextActive]}>{m.label}</Text>
                    <Text style={[styles.segmentMeta, mode === m.id && styles.segmentMetaActive]}>{`${perSecondLabel(m.id)} J/s`}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable onPress={() => setCaption(!caption)} disabled={busy} style={styles.optionRow} accessibilityRole="checkbox" accessibilityState={{ checked: caption }}>
                <Ionicons name={caption ? 'checkbox' : 'square-outline'} size={22} color={caption ? C.violet : C.muted} />
                <View style={styles.fileInfo}>
                  <Text style={styles.optionTitle}>Sous-titres</Text>
                  <Text style={styles.muted}>Ajouter des sous-titres à la vidéo traduite</Text>
                </View>
              </Pressable>
            </View>
          ) : null}
        </View>

        {error ? <View style={styles.error}><Text style={styles.errorText}>{error}</Text></View> : null}
        <RightsConsent checked={rightsOk} onChange={setRightsOk} disabled={busy} />

        {busy ? (
          <View style={styles.loading}><ChapCamLoader size="small" /><Text style={styles.loadingText}>{status === 'uploading' ? 'Envoi de la vidéo…' : 'Traduction en cours'}</Text></View>
        ) : (
          <Pressable disabled={!canSubmit} onPress={translate} style={[styles.ctaWrap, !canSubmit && styles.ctaDisabled]} accessibilityRole="button" accessibilityState={{ disabled: !canSubmit }}>
            <LinearGradient colors={BRAND} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
              <Ionicons name="language" size={20} color={C.white} />
              <Text style={styles.ctaText}>Traduire la vidéo</Text>
              <Ionicons name="arrow-forward" size={18} color={C.white} />
              <View style={styles.costPill}><Text style={styles.costPillText}>{`${videoSeconds === null ? '≤ ' : ''}${cost.toLocaleString(getLocale())} J`}</Text></View>
            </LinearGradient>
          </Pressable>
        )}
        <Text style={styles.footnote}>
          {videoSeconds === null ? 'Coût maximal pour 60 s, calculé selon la durée réelle de ta vidéo.' : `Coût calculé pour ${Math.ceil(videoSeconds)} s de vidéo.`}
          {credits !== null ? ` ${credits.toLocaleString(getLocale())} Jetons disponibles.` : ''}
        </Text>

        {result ? <View style={styles.result}><Text style={styles.section}>Vidéo traduite</Text><AiBadge /><ResultPreview uri={result} />{Platform.OS !== 'ios' ? <ReportAbuseButton contentUrl={result} context="Traduction de Vidéo" /> : null}</View> : null}
      </ScrollView>

      <LanguagePickerSheet visible={pickerOpen} languages={languages} failed={languagesFailed} onRetry={loadInfo} selected={language} onSelect={setLanguage} onClose={() => setPickerOpen(false)} />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  topBar: { paddingHorizontal: PAD, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  back: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  heading: { flex: 1 }, title: { color: C.ink, fontSize: 21, fontWeight: '900' }, subtitle: { color: C.muted, fontSize: 13, marginTop: 3 },
  content: { padding: PAD, gap: 12 },
  section: { color: C.muted, fontSize: 12, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 6 },
  muted: { color: C.muted, fontSize: 13 },
  card: { backgroundColor: C.white, borderRadius: 22, padding: 10, borderWidth: 1, borderColor: C.border },
  upload: { minHeight: 84, borderRadius: 22, backgroundColor: C.white, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#CFC4FF', flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16 },
  uploadIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#F1ECFF', alignItems: 'center', justifyContent: 'center' },
  uploadText: { flex: 1, gap: 3 }, uploadTitle: { color: C.ink, fontSize: 16, fontWeight: '900' },
  sourceVideo: { height: 200, width: '100%', borderRadius: 16, backgroundColor: C.navy },
  resultVideo: { height: 360, width: '100%', borderRadius: 20, backgroundColor: C.navy },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, paddingHorizontal: 4 },
  fileInfo: { flex: 1, gap: 2 }, fileName: { color: C.ink, fontWeight: '800' },
  iconButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1ECFF', alignItems: 'center', justifyContent: 'center' },
  languageCard: { minHeight: 72, borderRadius: 20, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14 },
  languageCardActive: { borderColor: C.violet },
  globe: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#F1ECFF', alignItems: 'center', justifyContent: 'center' },
  languageText: { flex: 1, gap: 1 },
  languageCaption: { color: C.muted, fontSize: 12, fontWeight: '700' },
  languageValue: { color: C.ink, fontSize: 16, fontWeight: '900' },
  languagePlaceholder: { color: C.violet },
  retry: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44 },
  retryText: { color: C.violet, fontSize: 13, fontWeight: '800' },
  advanced: { backgroundColor: C.white, borderRadius: 20, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  advancedHeader: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
  advancedTitle: { color: C.ink, fontSize: 15, fontWeight: '900' },
  advancedSummary: { flex: 1, textAlign: 'right', color: C.muted, fontSize: 12, fontWeight: '700' },
  advancedBody: { paddingHorizontal: 14, paddingBottom: 14, gap: 10 },
  optionLabel: { color: C.ink, fontSize: 13, fontWeight: '800' },
  segment: { flexDirection: 'row', padding: 4, borderRadius: 16, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 12, gap: 1 },
  segmentActive: { backgroundColor: C.white, borderWidth: 1, borderColor: C.violet },
  segmentText: { color: C.muted, fontWeight: '800', fontSize: 13 }, segmentTextActive: { color: C.violet },
  segmentMeta: { color: C.muted, fontSize: 11 }, segmentMetaActive: { color: C.ink },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.bg, borderRadius: 14, padding: 12 },
  optionTitle: { color: C.ink, fontWeight: '800' },
  ctaWrap: { borderRadius: 30, overflow: 'hidden', marginTop: 4 },
  cta: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16 },
  ctaDisabled: { opacity: 0.45 },
  ctaText: { color: C.white, fontWeight: '900', fontSize: 16 },
  costPill: { position: 'absolute', right: 14, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.22)' },
  costPillText: { color: C.white, fontWeight: '900', fontSize: 12 },
  footnote: { color: C.muted, fontSize: 12, textAlign: 'center', lineHeight: 18 },
  loading: { alignItems: 'center', gap: 4, paddingVertical: 8 }, loadingText: { color: C.muted, fontSize: 13 },
  error: { backgroundColor: '#FDECEC', borderRadius: 15, padding: 13 }, errorText: { color: '#B42318', fontWeight: '700' },
  result: { gap: 8 },
})
