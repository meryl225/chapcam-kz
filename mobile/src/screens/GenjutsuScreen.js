import React, { useState } from 'react'
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { useVideoPlayer, VideoView } from 'expo-video'
import { C, PAD } from '../ui/catalog'
import { ChapCamLoader } from '../ui/ChapCamLoader'
import { useJetonsBalance } from '../lib/useJetonsBalance'

const MAX_PROMPT = 500
const DURATIONS = [5, 10, 15, 20, 25, 30]
const QUALITIES = ['720p']
// Mirrors lib/tool-costs.ts + app/dashboard/genjutsu: ceil(0.2708333333 * 2 * 60 * seconds).
const GENJUTSU_PROVIDER_COST_PER_SECOND_USD = 0.2708333333
const GENJUTSU_MARGIN_MULTIPLIER = 2
const JETONS_PER_USD = 60
const genjutsuCost = (seconds) => Math.ceil(GENJUTSU_PROVIDER_COST_PER_SECOND_USD * GENJUTSU_MARGIN_MULTIPLIER * JETONS_PER_USD * seconds)

async function pickMedia(mediaTypes) {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!permission.granted) {
    Alert.alert('Photos', 'Autorise ChapCam à accéder à tes photos dans Réglages.')
    return null
  }
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes, allowsEditing: false, quality: 0.9 })
  return result.canceled ? null : result.assets?.[0] ?? null
}

function VideoPreview({ uri }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = true; p.muted = true; p.play() })
  return <VideoView player={player} style={styles.media} contentFit="cover" nativeControls={false} />
}

function UploadCard({ label, hint, icon, item, onPick, onClear }) {
  return (
    <Pressable onPress={onPick} style={styles.upload} accessibilityRole="button" accessibilityLabel={label}>
      {item ? (
        item.type === 'video' ? <VideoPreview uri={item.uri} /> : <Image source={{ uri: item.uri }} style={styles.media} resizeMode="cover" />
      ) : (
        <>
          <View style={styles.uploadIcon}><Ionicons name={icon} size={24} color={C.violet} /></View>
          <Text style={styles.uploadTitle}>{label}</Text>
          <Text style={styles.uploadHint}>{hint}</Text>
        </>
      )}
      {item ? (
        <Pressable onPress={onClear} style={styles.remove} accessibilityRole="button" accessibilityLabel={`Retirer : ${label}`}>
          <Ionicons name="close" size={17} color={C.white} />
        </Pressable>
      ) : null}
    </Pressable>
  )
}

export function GenjutsuScreen({ onBack, topInset = 0 }) {
  const [image, setImage] = useState(null)
  const [reference, setReference] = useState(null)
  const [prompt, setPrompt] = useState('')
  const [quality, setQuality] = useState('720p')
  const [duration, setDuration] = useState(10)
  const [enhance, setEnhance] = useState(false)
  const balance = useJetonsBalance()

  const cost = genjutsuCost(duration)
  const ready = !!image?.uri && !!reference?.uri

  const onGenerate = () => {
    Alert.alert('Genjutsu', 'La génération Genjutsu sera connectée à l’API ChapCam dans la prochaine étape.')
  }

  return (
    <KeyboardAvoidingView style={[styles.root, { paddingTop: topInset }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.topbar}>
        <Pressable onPress={onBack} style={styles.back} accessibilityRole="button" accessibilityLabel="Retour"><Ionicons name="chevron-back" size={25} color={C.ink} /></Pressable>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>Genjutsu</Text>
          <Text style={styles.subtitle}>Transfère un mouvement vidéo sur ton image.</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionLabel}>IMAGE ET MOUVEMENT</Text>
        <View style={styles.uploadRow}>
          <UploadCard label="Ton image" hint="Visage net, bien éclairé" icon="image-outline" item={image} onPick={async () => { const a = await pickMedia(['images']); if (a) setImage(a) }} onClear={() => setImage(null)} />
          <UploadCard label="Vidéo de référence" hint="4 à 30 secondes" icon="videocam-outline" item={reference} onPick={async () => { const a = await pickMedia(['videos']); if (a) setReference({ ...a, type: 'video' }) }} onClear={() => setReference(null)} />
        </View>

        <Text style={styles.sectionLabel}>PROMPT</Text>
        <View style={styles.promptCard}>
          <TextInput value={prompt} onChangeText={setPrompt} multiline maxLength={MAX_PROMPT} placeholder="Décris le mouvement, l’ambiance ou le style souhaité..." placeholderTextColor={C.muted} style={styles.input} textAlignVertical="top" />
          <Text style={styles.counter}>{prompt.length}/{MAX_PROMPT}</Text>
        </View>

        <Text style={styles.sectionLabel}>PARAMÈTRES</Text>
        <View style={styles.settings}>
          <View style={styles.settingRow}>
            <View style={styles.flex}>
              <Text style={styles.settingTitle}>Amélioration intelligente</Text>
              <Text style={styles.settingHint}>Optimise automatiquement la description du mouvement.</Text>
            </View>
            <Switch value={enhance} onValueChange={setEnhance} trackColor={{ true: C.violet, false: C.line }} accessibilityLabel="Amélioration intelligente" />
          </View>
          <View style={styles.divider} />
          <Text style={styles.settingTitle}>Qualité de sortie</Text>
          <View style={styles.chips}>
            {QUALITIES.map((q) => (
              <Pressable key={q} onPress={() => setQuality(q)} style={[styles.chip, quality === q && styles.chipActive]} accessibilityRole="button" accessibilityState={{ selected: quality === q }}>
                <Text style={[styles.chipText, quality === q && styles.chipTextActive]}>{q}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.divider} />
          <Text style={styles.settingTitle}>Durée de la vidéo</Text>
          <View style={styles.chips}>
            {DURATIONS.map((d) => (
              <Pressable key={d} onPress={() => setDuration(d)} style={[styles.chip, duration === d && styles.chipActive]} accessibilityRole="button" accessibilityState={{ selected: duration === d }}>
                <Text style={[styles.chipText, duration === d && styles.chipTextActive]}>{`${d} s`}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.costRow}>
            <View>
              <Text style={styles.costLabel}>Coût</Text>
              <Text style={styles.costValue}>{`${cost.toLocaleString('fr-FR')} Jetons`}</Text>
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
          <Pressable onPress={onGenerate} disabled={!ready} style={[styles.generate, !ready && styles.generateDisabled]} accessibilityRole="button" accessibilityState={{ disabled: !ready }}>
            <Text style={styles.generateText}>Générer</Text>
            <Ionicons name="arrow-forward" size={19} color={C.white} />
          </Pressable>
          {!ready ? <Text style={styles.footHint}>Ajoute une image et une vidéo de référence pour continuer.</Text> : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  topbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: PAD, paddingVertical: 16, gap: 10, borderBottomWidth: 1, borderBottomColor: '#E7EAF3' },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white },
  titleWrap: { flex: 1 },
  title: { color: C.ink, fontSize: 21, fontWeight: '900' },
  subtitle: { color: C.muted, fontSize: 12, marginTop: 3 },
  content: { padding: PAD, gap: 12, paddingBottom: 36 },
  sectionLabel: { color: C.muted, fontSize: 11, fontWeight: '900', letterSpacing: 1, marginTop: 10 },
  uploadRow: { flexDirection: 'row', gap: 12 },
  upload: { flex: 1, height: 210, borderRadius: 24, backgroundColor: C.white, borderWidth: 1, borderColor: '#E2E6F1', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 12 },
  uploadIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F0EBFF', alignItems: 'center', justifyContent: 'center' },
  uploadTitle: { color: C.ink, fontSize: 15, fontWeight: '900', marginTop: 10, textAlign: 'center' },
  uploadHint: { color: C.muted, fontSize: 12, marginTop: 4, textAlign: 'center' },
  media: { ...StyleSheet.absoluteFillObject },
  remove: { position: 'absolute', right: 10, top: 10, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(11,18,51,0.8)', alignItems: 'center', justifyContent: 'center' },
  promptCard: { minHeight: 170, backgroundColor: C.white, borderRadius: 24, borderWidth: 1, borderColor: '#E2E6F1', padding: 16 },
  input: { flex: 1, minHeight: 125, color: C.ink, fontSize: 16, lineHeight: 24 },
  counter: { color: C.muted, fontSize: 11, textAlign: 'right' },
  settings: { backgroundColor: C.white, borderRadius: 24, borderWidth: 1, borderColor: '#E2E6F1', padding: 16, gap: 10 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingTitle: { color: C.ink, fontSize: 14, fontWeight: '800' },
  settingHint: { color: C.muted, fontSize: 12, marginTop: 3, lineHeight: 17 },
  divider: { height: 1, backgroundColor: C.line, marginVertical: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 16, backgroundColor: C.bg, borderWidth: 1, borderColor: '#E2E6F1' },
  chipActive: { backgroundColor: C.violet, borderColor: C.violet },
  chipText: { color: C.ink, fontSize: 13, fontWeight: '800' },
  chipTextActive: { color: C.white },
  footer: { marginTop: 10, gap: 12 },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 },
  costLabel: { color: C.muted, fontSize: 11, fontWeight: '900', letterSpacing: 0.6, textTransform: 'uppercase' },
  costValue: { color: C.ink, fontSize: 20, fontWeight: '900', marginTop: 3, fontVariant: ['tabular-nums'] },
  balanceBox: { alignItems: 'flex-end', gap: 3 },
  balanceValue: { color: C.blue, fontSize: 15, fontWeight: '900', fontVariant: ['tabular-nums'] },
  balanceError: { color: '#B42318', fontSize: 13, fontWeight: '800' },
  generate: { height: 58, borderRadius: 29, backgroundColor: C.blue, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  generateDisabled: { opacity: 0.45 },
  generateText: { color: C.white, fontSize: 17, fontWeight: '900' },
  footHint: { color: C.muted, fontSize: 12, textAlign: 'center' },
})
