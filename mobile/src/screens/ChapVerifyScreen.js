import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'
import Constants from 'expo-constants'
import { Ionicons } from '@expo/vector-icons'
import { useVideoPlayer, VideoView } from 'expo-video'
import { supabase } from '../lib/supabase'
import { C, PAD } from '../ui/catalog'
import { ChapCamLoader } from '../ui/ChapCamLoader'
import { AudioClip } from '../ui/AudioClip'
import { friendlyError } from '../lib/api'

const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? Constants.expoConfig?.extra?.apiUrl ?? 'https://chapcam.com').replace(/\/$/, '')
// Mirrors app/dashboard/chapverify/page.tsx COST and MAX_MB.
const COST = { image: 1, audio: 1, video: 2 }
const MAX_MB = { image: 12, audio: 25, video: 60 }
const POLL_MS = 4000
const MEDIA_META = {
  image: { label: 'Image', icon: 'image-outline' },
  audio: { label: 'Audio', icon: 'musical-notes-outline' },
  video: { label: 'Vidéo', icon: 'videocam-outline' },
}
const VERDICTS = {
  fake: { icon: 'alert-circle', title: 'Deepfake détecté', subtitle: 'Ce contenu présente des signes de manipulation par IA.', color: '#DC2626', soft: '#FDECEC' },
  real: { icon: 'shield-checkmark', title: 'Authentique', subtitle: 'Aucun signe de synthèse détecté sur ce contenu.', color: '#16A34A', soft: '#E8F7EE' },
  unknown: { icon: 'help-circle', title: 'Non concluant', subtitle: "L'analyse n'a pas permis de trancher clairement.", color: '#CA8A04', soft: '#FBF4DC' },
}

const mediaFromMime = (mime = '') => (mime.startsWith('image/') ? 'image' : mime.startsWith('audio/') ? 'audio' : mime.startsWith('video/') ? 'video' : null)

async function getToken() {
  const { data } = await supabase.auth.getSession()
  return data?.session?.access_token || null
}

function VideoPreview({ uri }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = true; p.muted = true; p.play() })
  return <VideoView player={player} style={styles.media} contentFit="contain" nativeControls={false} />
}

export function ChapVerifyScreen({ onBack, topInset = 0 }) {
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState('idle')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [credits, setCredits] = useState(null)
  const [history, setHistory] = useState([])
  const pollRef = useRef(null)
  const busy = status === 'uploading' || status === 'processing'

  const call = useCallback(async (path, init = {}) => {
    const token = await getToken()
    if (!token) throw new Error('Session expirée. Reconnecte-toi.')
    const res = await fetch(`${API_URL}${path}`, { ...init, headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` } })
    const json = await res.json().catch(() => ({}))
    return { res, json }
  }, [])

  const refreshCredits = useCallback(async () => {
    try {
      const { json } = await call('/api/chapverify?info=quota')
      if (typeof json.credits === 'number') setCredits(json.credits)
    } catch {}
  }, [call])

  const refreshHistory = useCallback(async () => {
    try {
      const { json } = await call('/api/chapverify?info=history')
      if (Array.isArray(json.jobs)) setHistory(json.jobs)
    } catch {}
  }, [call])

  useEffect(() => {
    refreshCredits()
    refreshHistory()
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [refreshCredits, refreshHistory])

  const accept = (asset) => {
    const media = mediaFromMime(asset.mimeType)
    if (!media) return Alert.alert('Format non supporté', 'Envoie une image, un fichier audio ou une vidéo.')
    const size = asset.fileSize ?? asset.size
    if (size && size > MAX_MB[media] * 1024 * 1024) {
      return Alert.alert('Fichier trop volumineux', `Max ${MAX_MB[media]} Mo pour un fichier ${MEDIA_META[media].label.toLowerCase()}.`)
    }
    setFile({ uri: asset.uri, name: asset.fileName || asset.name || `chapverify-${media}`, mimeType: asset.mimeType, media })
    setResult(null); setError(''); setStatus('idle')
  }

  const pickFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) return Alert.alert('Photos', 'Autorise ChapCam à accéder à tes photos dans Réglages.')
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], allowsEditing: false, quality: 1 })
    const asset = picked.canceled ? null : picked.assets?.[0]
    if (!asset?.uri) return
    const mimeType = asset.mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg')
    accept({ ...asset, mimeType })
  }

  const pickAudio = async () => {
    const picked = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true, multiple: false })
    const asset = picked.canceled ? null : picked.assets?.[0]
    if (!asset?.uri) return
    accept({ ...asset, mimeType: asset.mimeType?.startsWith('audio/') ? asset.mimeType : 'audio/mpeg' })
  }

  const clearFile = () => { setFile(null); setResult(null); setError(''); setStatus('idle') }

  const poll = (uuid) => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const { json } = await call(`/api/chapverify?uuid=${encodeURIComponent(uuid)}`)
        if (json.status === 'completed') {
          clearInterval(pollRef.current); pollRef.current = null
          setResult({ verdict: VERDICTS[json.verdict] ? json.verdict : 'unknown', confidence: json.confidence ?? 0, media: json.media || file?.media })
          setStatus('done')
          refreshHistory()
        } else if (json.status === 'failed') {
          clearInterval(pollRef.current); pollRef.current = null
          setStatus('error')
          if (typeof json.remaining === 'number') setCredits(json.remaining)
          setError(`${json.error || "Le fichier n'a pas pu être analysé."}${json.refunded ? ' Ton crédit a été remboursé.' : ''}`)
          refreshHistory()
        }
      } catch {}
    }, POLL_MS)
  }

  const verify = async () => {
    if (!file || busy) return
    setStatus('uploading'); setResult(null); setError('')
    try {
      const form = new FormData()
      form.append('file', { uri: file.uri, name: file.name, type: file.mimeType })
      const { res, json } = await call('/api/chapverify', { method: 'POST', body: form })
      if (typeof json.remaining === 'number') setCredits(json.remaining)
      if (!res.ok) {
        setStatus('idle')
        setError(json.code === 'no_plan' ? `Aucun forfait actif. ${json.error || ''}`.trim() : json.error || "Impossible de lancer l'analyse.")
        return
      }
      setStatus('processing')
      poll(json.uuid)
    } catch (e) {
      setStatus('idle')
      setError(friendlyError(e, 'Vérifie ta connexion et réessaie.'))
    }
  }

  const cost = file ? COST[file.media] : null

  return (
    <View style={[styles.root, { paddingTop: topInset }]}>
      <View style={styles.topbar}>
        <Pressable onPress={onBack} style={styles.back} accessibilityRole="button" accessibilityLabel="Retour"><Ionicons name="chevron-back" size={25} color={C.ink} /></Pressable>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>ChapVerify</Text>
          <Text style={styles.subtitle}>Vérifie si une image, une voix ou une vidéo est un deepfake.</Text>
        </View>
        <View style={styles.creditChip}>
          <Ionicons name="flash" size={13} color={C.violet} />
          <Text style={styles.creditText}>{credits === null ? '…' : credits}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {status === 'done' && result ? (
          <VerdictPanel result={result} filename={file?.name} onReset={clearFile} />
        ) : !file ? (
          <>
            <Text style={styles.sectionLabel}>FICHIER À VÉRIFIER</Text>
            <View style={styles.pickRow}>
              <Pressable onPress={pickFromLibrary} style={styles.pickCard} accessibilityRole="button" accessibilityLabel="Choisir une image ou une vidéo">
                <View style={styles.pickIcon}><Ionicons name="images-outline" size={24} color={C.violet} /></View>
                <Text style={styles.pickTitle}>Image ou vidéo</Text>
                <Text style={styles.pickHint}>Photothèque</Text>
              </Pressable>
              <Pressable onPress={pickAudio} style={styles.pickCard} accessibilityRole="button" accessibilityLabel="Choisir un fichier audio">
                <View style={styles.pickIcon}><Ionicons name="musical-notes-outline" size={24} color={C.violet} /></View>
                <Text style={styles.pickTitle}>Audio</Text>
                <Text style={styles.pickHint}>Fichiers</Text>
              </Pressable>
            </View>
            <View style={styles.chips}>
              {Object.keys(COST).map((m) => (
                <View key={m} style={styles.chip}>
                  <Ionicons name={MEDIA_META[m].icon} size={13} color={C.muted} />
                  <Text style={styles.chipText}>{`${MEDIA_META[m].label} · ${COST[m]} crédit${COST[m] > 1 ? 's' : ''} · ${MAX_MB[m]} Mo max`}</Text>
                </View>
              ))}
            </View>
            <View style={styles.steps}>
              {[
                ['cloud-upload-outline', '1. Dépose', 'Une image, une voix ou une vidéo suspecte.'],
                ['sparkles-outline', '2. Analyse IA', 'ChapVerify détecte les artefacts de synthèse.'],
                ['shield-checkmark-outline', '3. Verdict', 'Authentique ou deepfake, avec un score de confiance.'],
              ].map(([icon, title, text]) => (
                <View key={title} style={styles.step}>
                  <Ionicons name={icon} size={19} color={C.violet} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.stepTitle}>{title}</Text>
                    <Text style={styles.stepText}>{text}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : (
          <>
            <Text style={styles.sectionLabel}>FICHIER À VÉRIFIER</Text>
            <View style={styles.previewCard}>
              {file.media === 'image' ? <Image source={{ uri: file.uri }} style={styles.media} resizeMode="contain" accessibilityLabel="Aperçu du fichier à vérifier" /> : null}
              {file.media === 'video' ? <VideoPreview uri={file.uri} /> : null}
              {file.media === 'audio' ? <View style={styles.audioWrap}><AudioClip uri={file.uri} label={file.name} accent={C.violet} /></View> : null}
              {busy ? (
                <View style={styles.overlay}>
                  <ChapCamLoader size="small" />
                  <Text style={styles.overlayTitle}>{status === 'uploading' ? 'Envoi du fichier…' : 'Analyse en cours…'}</Text>
                  <Text style={styles.overlayText}>Détection des artefacts IA</Text>
                </View>
              ) : (
                <Pressable onPress={clearFile} style={styles.remove} accessibilityRole="button" accessibilityLabel="Retirer le fichier"><Ionicons name="close" size={17} color={C.white} /></Pressable>
              )}
            </View>
            <View style={styles.fileRow}>
              <View style={styles.fileIcon}><Ionicons name={MEDIA_META[file.media].icon} size={18} color={C.violet} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                <Text style={styles.fileMeta}>{`${MEDIA_META[file.media].label} · ${cost} crédit${cost > 1 ? 's' : ''}`}</Text>
              </View>
            </View>
            {error ? <View style={styles.error}><Text style={styles.errorText}>{error}</Text></View> : null}
            <Pressable onPress={verify} disabled={busy} style={[styles.generate, busy && styles.generateDisabled]} accessibilityRole="button" accessibilityState={{ disabled: busy }}>
              <Ionicons name="shield-checkmark" size={19} color={C.white} />
              <Text style={styles.generateText}>{busy ? (status === 'uploading' ? 'Envoi…' : 'Analyse…') : 'Lancer ChapVerify'}</Text>
            </Pressable>
            <View style={styles.secure}>
              <Ionicons name="lock-closed-outline" size={12} color={C.muted} />
              <Text style={styles.secureText}>Fichier analysé de façon sécurisée, jamais partagé.</Text>
            </View>
          </>
        )}

        {history.length > 0 ? (
          <View style={styles.history}>
            <Text style={styles.sectionLabel}>VÉRIFICATIONS RÉCENTES</Text>
            {history.map((job) => <HistoryRow key={job.uuid} job={job} />)}
          </View>
        ) : null}
      </ScrollView>
    </View>
  )
}

function VerdictPanel({ result, filename, onReset }) {
  const cfg = VERDICTS[result.verdict] || VERDICTS.unknown
  const pct = Math.max(0, Math.min(100, Number(result.confidence) || 0))
  const media = MEDIA_META[result.media] || MEDIA_META.image
  return (
    <View style={styles.verdict}>
      <View style={[styles.verdictIcon, { backgroundColor: cfg.soft }]}><Ionicons name={cfg.icon} size={40} color={cfg.color} /></View>
      <View style={[styles.mediaTag, { backgroundColor: cfg.soft }]}><Text style={[styles.mediaTagText, { color: cfg.color }]}>{media.label}</Text></View>
      <Text style={styles.verdictTitle}>{cfg.title}</Text>
      <Text style={styles.verdictSubtitle}>{cfg.subtitle}</Text>
      {result.verdict !== 'unknown' ? (
        <View style={styles.confidence}>
          <View style={styles.confidenceHead}>
            <Text style={styles.confidenceLabel}>CONFIANCE</Text>
            <Text style={[styles.confidenceValue, { color: cfg.color }]}>{`${pct}%`}</Text>
          </View>
          <View style={styles.track}><View style={[styles.fill, { width: `${pct}%`, backgroundColor: cfg.color }]} /></View>
        </View>
      ) : null}
      {filename ? <Text style={styles.fileMeta} numberOfLines={1}>{filename}</Text> : null}
      <Pressable onPress={onReset} style={styles.resetButton} accessibilityRole="button">
        <Ionicons name="shield-checkmark-outline" size={17} color={C.violet} />
        <Text style={styles.resetText}>Vérifier un autre fichier</Text>
      </Pressable>
    </View>
  )
}

function HistoryRow({ job }) {
  const media = MEDIA_META[job.media] || MEDIA_META.image
  const label = job.status === 'failed' ? 'Échec' : job.status === 'processing' ? 'En cours' : job.verdict === 'fake' ? 'Deepfake' : job.verdict === 'real' ? 'Authentique' : 'Non concluant'
  const color = job.status === 'completed' && job.verdict === 'fake' ? VERDICTS.fake.color : job.status === 'completed' && job.verdict === 'real' ? VERDICTS.real.color : C.muted
  return (
    <View style={styles.historyRow}>
      <View style={styles.historyIcon}><Ionicons name={media.icon} size={16} color={C.muted} /></View>
      <Text style={styles.historyName} numberOfLines={1}>{job.filename || media.label}</Text>
      {job.status === 'completed' && typeof job.confidence === 'number' ? <Text style={styles.historyPct}>{`${job.confidence}%`}</Text> : null}
      <Text style={[styles.historyVerdict, { color }]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  topbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: PAD, paddingVertical: 16, gap: 10, borderBottomWidth: 1, borderBottomColor: '#E7EAF3' },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white },
  titleWrap: { flex: 1 },
  title: { color: C.ink, fontSize: 21, fontWeight: '900' },
  subtitle: { color: C.muted, fontSize: 12, marginTop: 3 },
  creditChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 30, borderRadius: 15, backgroundColor: '#F0EBFF' },
  creditText: { color: C.violet, fontWeight: '900', fontSize: 13, fontVariant: ['tabular-nums'] },
  content: { padding: PAD, gap: 12, paddingBottom: 40 },
  sectionLabel: { color: C.muted, fontSize: 11, fontWeight: '900', letterSpacing: 1, marginTop: 8 },
  pickRow: { flexDirection: 'row', gap: 10 },
  pickCard: { flex: 1, minHeight: 150, borderRadius: 24, backgroundColor: C.white, borderWidth: 1, borderColor: '#E2E6F1', alignItems: 'center', justifyContent: 'center', gap: 4, padding: 12 },
  pickIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#F0EBFF', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  pickTitle: { color: C.ink, fontSize: 16, fontWeight: '900' },
  pickHint: { color: C.muted, fontSize: 12 },
  chips: { gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipText: { color: C.muted, fontSize: 12, fontWeight: '700' },
  steps: { backgroundColor: C.white, borderRadius: 22, padding: 16, gap: 14, marginTop: 6, borderWidth: 1, borderColor: '#E2E6F1' },
  step: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  stepTitle: { color: C.ink, fontWeight: '900', fontSize: 14 },
  stepText: { color: C.muted, fontSize: 13, lineHeight: 19, marginTop: 2 },
  previewCard: { height: 260, borderRadius: 24, backgroundColor: C.navy, overflow: 'hidden', justifyContent: 'center' },
  media: { ...StyleSheet.absoluteFillObject },
  audioWrap: { padding: 16 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(11,18,51,0.78)', alignItems: 'center', justifyContent: 'center', gap: 6 },
  overlayTitle: { color: C.white, fontWeight: '900', fontSize: 15 },
  overlayText: { color: 'rgba(255,255,255,0.65)', fontSize: 12 },
  remove: { position: 'absolute', right: 12, top: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(11,18,51,0.8)', alignItems: 'center', justifyContent: 'center' },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.white, borderRadius: 18, padding: 12 },
  fileIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F0EBFF', alignItems: 'center', justifyContent: 'center' },
  fileName: { color: C.ink, fontWeight: '800', fontSize: 14 },
  fileMeta: { color: C.muted, fontSize: 12, marginTop: 2 },
  error: { backgroundColor: '#FDECEC', borderRadius: 15, padding: 13 },
  errorText: { color: '#B42318', fontWeight: '700' },
  generate: { height: 58, borderRadius: 29, backgroundColor: C.violet, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  generateDisabled: { opacity: 0.55 },
  generateText: { color: C.white, fontSize: 17, fontWeight: '900' },
  secure: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  secureText: { color: C.muted, fontSize: 11 },
  verdict: { backgroundColor: C.white, borderRadius: 26, padding: 22, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#E2E6F1' },
  verdictIcon: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  mediaTag: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  mediaTagText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase' },
  verdictTitle: { color: C.ink, fontSize: 26, fontWeight: '900' },
  verdictSubtitle: { color: C.muted, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  confidence: { alignSelf: 'stretch', gap: 6, marginTop: 6 },
  confidenceHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  confidenceLabel: { color: C.muted, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  confidenceValue: { fontSize: 22, fontWeight: '900', fontVariant: ['tabular-nums'] },
  track: { height: 10, borderRadius: 5, backgroundColor: '#EEF0F6', overflow: 'hidden' },
  fill: { height: 10, borderRadius: 5 },
  resetButton: { marginTop: 10, height: 48, paddingHorizontal: 20, borderRadius: 24, backgroundColor: '#F0EBFF', flexDirection: 'row', alignItems: 'center', gap: 8 },
  resetText: { color: C.violet, fontWeight: '900', fontSize: 14 },
  history: { gap: 8, marginTop: 8 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.white, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10 },
  historyIcon: { width: 32, height: 32, borderRadius: 9, backgroundColor: '#F2F4F9', alignItems: 'center', justifyContent: 'center' },
  historyName: { flex: 1, color: C.ink, fontSize: 13 },
  historyPct: { color: C.muted, fontSize: 12, fontVariant: ['tabular-nums'] },
  historyVerdict: { fontSize: 11, fontWeight: '900', letterSpacing: 0.6, textTransform: 'uppercase' },
})
