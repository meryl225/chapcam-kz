import React, { useState } from 'react'
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { useVideoPlayer, VideoView } from 'expo-video'
import { C, PAD } from '../ui/catalog'
import { ChapCamLoader } from '../ui/ChapCamLoader'
import { useJetonsBalance } from '../lib/useJetonsBalance'

const MAX_NOTE = 300
// Mirrors lib/resemble.ts CHAPVERIFY_COST.
const CHAPVERIFY_COST = { image: 1, video: 2 }
const MEDIA_TYPES = [
  { key: 'image', label: 'Image', icon: 'image-outline' },
  { key: 'video', label: 'Vidéo', icon: 'videocam-outline' },
]

function VideoPreview({ uri }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = true; p.muted = true; p.play() })
  return <VideoView player={player} style={styles.media} contentFit="cover" nativeControls={false} />
}

export function ChapVerifyScreen({ onBack, topInset = 0 }) {
  const [mediaType, setMediaType] = useState('image')
  const [file, setFile] = useState(null)
  const [note, setNote] = useState('')
  const balance = useJetonsBalance()
  const cost = CHAPVERIFY_COST[mediaType]

  const pick = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) return Alert.alert('Photos', 'Autorise ChapCam à accéder à tes photos dans Réglages.')
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: [mediaType === 'video' ? 'videos' : 'images'], allowsEditing: false, quality: 0.9 })
    const asset = result.canceled ? null : result.assets?.[0]
    if (asset?.uri) setFile({ ...asset, kind: mediaType })
  }

  const selectType = (key) => {
    setMediaType(key)
    if (file && file.kind !== key) setFile(null)
  }

  const onAnalyze = () => {
    Alert.alert('ChapVerify', 'L’analyse ChapVerify sera connectée à l’API ChapCam dans la prochaine étape.')
  }

  return (
    <View style={[styles.root, { paddingTop: topInset }]}>
      <View style={styles.topbar}>
        <Pressable onPress={onBack} style={styles.back} accessibilityRole="button" accessibilityLabel="Retour"><Ionicons name="chevron-back" size={25} color={C.ink} /></Pressable>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>ChapVerify</Text>
          <Text style={styles.subtitle}>Détecte si une image ou une vidéo a été générée par IA.</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionLabel}>TYPE DE MÉDIA</Text>
        <View style={styles.segment}>
          {MEDIA_TYPES.map((t) => (
            <Pressable key={t.key} onPress={() => selectType(t.key)} style={[styles.segmentItem, mediaType === t.key && styles.segmentActive]} accessibilityRole="button" accessibilityState={{ selected: mediaType === t.key }}>
              <Ionicons name={t.icon} size={16} color={mediaType === t.key ? C.white : C.violet} />
              <Text style={[styles.segmentText, mediaType === t.key && styles.segmentTextActive]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>FICHIER À VÉRIFIER</Text>
        <Pressable onPress={pick} style={styles.upload} accessibilityRole="button" accessibilityLabel="Choisir un fichier à vérifier">
          {file ? (
            file.kind === 'video' ? <VideoPreview uri={file.uri} /> : <Image source={{ uri: file.uri }} style={styles.media} resizeMode="cover" />
          ) : (
            <>
              <View style={styles.uploadIcon}><Ionicons name="shield-checkmark-outline" size={26} color={C.violet} /></View>
              <Text style={styles.uploadTitle}>{mediaType === 'video' ? 'Choisir une vidéo' : 'Choisir une image'}</Text>
              <Text style={styles.uploadHint}>{mediaType === 'video' ? 'Jusqu’à 60 Mo · 8 premières secondes analysées' : 'Jusqu’à 12 Mo'}</Text>
            </>
          )}
          {file ? (
            <Pressable onPress={() => setFile(null)} style={styles.remove} accessibilityRole="button" accessibilityLabel="Retirer le fichier">
              <Ionicons name="close" size={17} color={C.white} />
            </Pressable>
          ) : null}
        </Pressable>

        <Text style={styles.sectionLabel}>CONTEXTE (OPTIONNEL)</Text>
        <View style={styles.promptCard}>
          <TextInput value={note} onChangeText={setNote} multiline maxLength={MAX_NOTE} placeholder="D’où vient ce média ? Qu’est-ce qui te semble suspect ?" placeholderTextColor={C.muted} style={styles.input} textAlignVertical="top" />
          <Text style={styles.counter}>{note.length}/{MAX_NOTE}</Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.costRow}>
            <View>
              <Text style={styles.costLabel}>Coût</Text>
              <Text style={styles.costValue}>{`${cost} ${cost > 1 ? 'Jetons' : 'Jeton'}`}</Text>
            </View>
            <View style={styles.balanceBox}>
              <Text style={styles.costLabel}>Ton solde</Text>
              {balance.loading ? (
                <ChapCamLoader size="small" />
              ) : balance.jetons !== null ? (
                <Text style={styles.balanceValue}>{`${balance.jetons.toLocaleString('fr-FR')} Jetons`}</Text>
              ) : (
                <Pressable onPress={balance.reload} accessibilityRole="button"><Text style={styles.balanceError}>Indisponible · Réessayer</Text></Pressable>
              )}
            </View>
          </View>
          <Pressable onPress={onAnalyze} disabled={!file} style={[styles.generate, !file && styles.generateDisabled]} accessibilityRole="button" accessibilityState={{ disabled: !file }}>
            <Text style={styles.generateText}>Analyser</Text>
            <Ionicons name="arrow-forward" size={19} color={C.white} />
          </Pressable>
        </View>
      </ScrollView>
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
  content: { padding: PAD, gap: 12, paddingBottom: 36 },
  sectionLabel: { color: C.muted, fontSize: 11, fontWeight: '900', letterSpacing: 1, marginTop: 10 },
  segment: { flexDirection: 'row', gap: 8 },
  segmentItem: { flex: 1, height: 46, borderRadius: 23, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: C.white, borderWidth: 1, borderColor: '#E2E6F1' },
  segmentActive: { backgroundColor: C.violet, borderColor: C.violet },
  segmentText: { color: C.ink, fontSize: 14, fontWeight: '800' },
  segmentTextActive: { color: C.white },
  upload: { height: 245, borderRadius: 24, backgroundColor: C.white, borderWidth: 1, borderColor: '#E2E6F1', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  uploadIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#F0EBFF', alignItems: 'center', justifyContent: 'center' },
  uploadTitle: { color: C.ink, fontSize: 18, fontWeight: '900', marginTop: 10 },
  uploadHint: { color: C.muted, fontSize: 13, marginTop: 5 },
  media: { ...StyleSheet.absoluteFillObject },
  remove: { position: 'absolute', right: 12, top: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(11,18,51,0.8)', alignItems: 'center', justifyContent: 'center' },
  promptCard: { minHeight: 130, backgroundColor: C.white, borderRadius: 24, borderWidth: 1, borderColor: '#E2E6F1', padding: 16 },
  input: { flex: 1, minHeight: 85, color: C.ink, fontSize: 16, lineHeight: 24 },
  counter: { color: C.muted, fontSize: 11, textAlign: 'right' },
  footer: { marginTop: 10, gap: 12 },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 },
  costLabel: { color: C.muted, fontSize: 11, fontWeight: '900', letterSpacing: 0.6, textTransform: 'uppercase' },
  costValue: { color: C.ink, fontSize: 20, fontWeight: '900', marginTop: 3 },
  balanceBox: { alignItems: 'flex-end', gap: 3 },
  balanceValue: { color: C.blue, fontSize: 15, fontWeight: '900', fontVariant: ['tabular-nums'] },
  balanceError: { color: '#B42318', fontSize: 13, fontWeight: '800' },
  generate: { height: 58, borderRadius: 29, backgroundColor: C.blue, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  generateDisabled: { opacity: 0.45 },
  generateText: { color: C.white, fontSize: 17, fontWeight: '900' },
})
