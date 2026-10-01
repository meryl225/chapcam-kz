import React, { useState } from 'react'
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { BRAND, C, PAD, asset, shadow } from '../ui/catalog'

const MODES = [
  { key: 'face', label: 'Visage' },
  { key: 'body', label: 'Corps entier' },
  { key: 'voice', label: 'Voix' },
]

const FACES = [
  { key: 'a1', image: '/images/hero/avatars/a1.png' },
  { key: 'a2', image: '/images/hero/avatars/a2.png' },
  { key: 'a3', image: '/images/hero/avatars/a3.png' },
  { key: 'a4', image: '/images/hero/avatars/a4.png' },
  { key: 'a5', image: '/images/hero/avatars/a5.png' },
  { key: 'a6', image: '/images/hero/avatars/a6.png' },
]

const QUALITIES = ['HD 720p', 'HD 1080p']
const STYLES = ['Réaliste', 'Cinéma', 'Studio']

const cycle = (list, value) => list[(list.indexOf(value) + 1) % list.length]

export function LiveSwapScreen({ onBack, topInset, bottomInset }) {
  const [mode, setMode] = useState('face')
  const [face, setFace] = useState('a1')
  const [quality, setQuality] = useState('HD 1080p')
  const [style, setStyle] = useState('Réaliste')
  const [mic, setMic] = useState(true)

  const start = () => {
    Alert.alert(
      'Live Swap',
      "Les réglages sont prêts. Le flux caméra en temps réel sera branché à l'étape suivante, avec le décompte de tes minutes Live Swap.",
    )
  }

  return (
    <View style={[styles.root, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Retour" hitSlop={10} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={C.ink} />
        </Pressable>
        <View style={styles.flex}>
          <Text style={styles.title} accessibilityRole="header">Live Swap</Text>
          <Text style={styles.subtitle}>Change de visage en temps réel</Text>
        </View>
        <Pressable accessibilityLabel="Aide" hitSlop={10} style={styles.headerBtn}>
          <Ionicons name="help-circle-outline" size={24} color={C.ink} />
        </Pressable>
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.preview}>
          <Image source={asset('/swap/face-transformed.png')} style={StyleSheet.absoluteFill} accessibilityLabel="Aperçu du visage transformé" />
          <View style={styles.liveBadge}><Text style={styles.liveText}>LIVE</Text></View>
          <View style={styles.sideControls}>
            <ControlButton icon="camera-reverse-outline" label="Changer de caméra" />
            <ControlButton icon={mic ? 'mic-outline' : 'mic-off-outline'} label={mic ? 'Couper le micro' : 'Activer le micro'} onPress={() => setMic((v) => !v)} />
            <ControlButton icon="scan-outline" label="Cadrage" />
          </View>
          <View style={styles.pip}>
            <Image source={asset('/swap/face-original.png')} style={StyleSheet.absoluteFill} accessibilityLabel="Ta caméra" />
          </View>
        </View>

        <View style={styles.segment} accessibilityRole="tablist">
          {MODES.map((m) => {
            const active = mode === m.key
            return (
              <Pressable
                key={m.key}
                onPress={() => setMode(m.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                style={[styles.segmentItem, active && styles.segmentActive]}
              >
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{m.label}</Text>
              </Pressable>
            )
          })}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Choisir un visage</Text>
          <Pressable hitSlop={8} style={styles.sectionAction}>
            <Text style={styles.sectionActionText}>Voir plus</Text>
            <Ionicons name="chevron-forward" size={14} color={C.blue} />
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.faces}>
          <Pressable accessibilityRole="button" accessibilityLabel="Ajouter un visage" style={styles.addFace}>
            <Ionicons name="add" size={22} color={C.blue} />
            <Text style={styles.addFaceText}>Ajouter</Text>
          </Pressable>
          {FACES.map((f, i) => {
            const active = face === f.key
            return (
              <Pressable
                key={f.key}
                onPress={() => setFace(f.key)}
                accessibilityRole="radio"
                accessibilityLabel={`Visage ${i + 1}`}
                accessibilityState={{ selected: active }}
                style={[styles.face, active && styles.faceActive]}
              >
                <Image source={asset(f.image)} style={styles.faceImage} />
              </Pressable>
            )
          })}
        </ScrollView>

        <Text style={[styles.sectionTitle, styles.paramsTitle]}>Paramètres avancés</Text>
        <View style={styles.params}>
          <ParamCard icon="tv-outline" label="Qualité" value={quality} onPress={() => setQuality(cycle(QUALITIES, quality))} />
          <ParamCard icon="sparkles-outline" label="Style" value={style} onPress={() => setStyle(cycle(STYLES, style))} />
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(bottomInset, 16) }]}>
        <Pressable onPress={start} accessibilityRole="button" style={({ pressed }) => [pressed && styles.pressed]}>
          <LinearGradient colors={BRAND} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cta}>
            <Ionicons name="videocam" size={20} color={C.white} />
            <Text style={styles.ctaText}>Démarrer le Live Swap</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  )
}

function ControlButton({ icon, label, onPress }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={styles.control}>
      <Ionicons name={icon} size={20} color={C.white} />
    </Pressable>
  )
}

function ParamCard({ icon, label, value, onPress }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label} : ${value}. Toucher pour changer`} style={({ pressed }) => [styles.param, pressed && styles.pressed]}>
      <View style={styles.paramIcon}><Ionicons name={icon} size={18} color={C.blue} /></View>
      <View style={styles.flex}>
        <Text style={styles.paramLabel}>{label}</Text>
        <Text style={styles.paramValue} numberOfLines={1}>{value}</Text>
      </View>
      <Ionicons name="chevron-down" size={16} color={C.muted} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  pressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: PAD - 6, height: 56 },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { color: C.ink, fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  subtitle: { color: C.muted, fontSize: 12, marginTop: 1 },
  content: { paddingHorizontal: PAD, paddingTop: 4, paddingBottom: 24 },

  preview: { aspectRatio: 0.92, borderRadius: 26, overflow: 'hidden', backgroundColor: '#1A1F45', ...shadow },
  liveBadge: { position: 'absolute', top: 14, left: 14, backgroundColor: '#FF2D55', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  liveText: { color: C.white, fontSize: 12, fontWeight: '900', letterSpacing: 0.6 },
  sideControls: { position: 'absolute', top: 14, right: 14, gap: 10 },
  control: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(14,21,48,0.55)', alignItems: 'center', justifyContent: 'center' },
  pip: { position: 'absolute', right: 14, bottom: 14, width: '28%', aspectRatio: 0.8, borderRadius: 16, overflow: 'hidden', borderWidth: 2, borderColor: C.white, backgroundColor: '#1A1F45' },

  segment: { flexDirection: 'row', marginTop: 16, backgroundColor: C.white, borderRadius: 999, padding: 4, borderWidth: 1, borderColor: C.line },
  segmentItem: { flex: 1, height: 38, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  segmentActive: { backgroundColor: C.blue },
  segmentText: { color: C.ink, fontSize: 14, fontWeight: '600' },
  segmentTextActive: { color: C.white, fontWeight: '800' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 22, marginBottom: 12 },
  sectionTitle: { color: C.ink, fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  sectionActionText: { color: C.blue, fontSize: 14, fontWeight: '700' },
  bleed: { marginHorizontal: -PAD, flexGrow: 0 },
  faces: { paddingHorizontal: PAD, gap: 10 },
  addFace: { width: 64, height: 64, borderRadius: 16, backgroundColor: C.white, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center', gap: 2 },
  addFaceText: { color: C.muted, fontSize: 10, fontWeight: '600' },
  face: { width: 64, height: 64, borderRadius: 16, padding: 2, borderWidth: 2, borderColor: 'transparent' },
  faceActive: { borderColor: C.blue },
  faceImage: { flex: 1, borderRadius: 12, backgroundColor: C.line },

  paramsTitle: { marginTop: 22, marginBottom: 12 },
  params: { flexDirection: 'row', gap: 12 },
  param: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.white, borderRadius: 16, borderWidth: 1, borderColor: C.line, paddingHorizontal: 12, height: 60 },
  paramIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#E8F0FF', alignItems: 'center', justifyContent: 'center' },
  paramLabel: { color: C.ink, fontSize: 13, fontWeight: '700' },
  paramValue: { color: C.muted, fontSize: 12, marginTop: 1 },

  footer: { paddingHorizontal: PAD, paddingTop: 12, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.line },
  cta: { height: 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  ctaText: { color: C.white, fontSize: 16, fontWeight: '800' },
})
