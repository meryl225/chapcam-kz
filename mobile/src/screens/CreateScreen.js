import React from 'react'
import { Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { BRAND, C, GAP, PAD, TOOLS, asset, shadow } from '../ui/catalog'

const INK_DEEP = '#0B1233'
const R_CARD = 22
const R_HERO = 26

const toolFromCatalog = (key) => TOOLS.find((t) => t.key === key)

const CREATION_TOOLS = [
  { key: 'photo-video', title: 'Photos en Vidéo', copy: 'Anime ta photo en vidéo', image: toolFromCatalog('photo-video').image },
  { key: 'genjutsu', title: 'Genjutsu', copy: 'Anime tes images', image: toolFromCatalog('genjutsu').image },
  { key: 'motion', title: 'Motion', copy: 'Anime ta photo en 3D', image: toolFromCatalog('motion').image },
  { key: 'translate', title: 'Traduction de Vidéo', copy: '190+ langues', image: toolFromCatalog('translate').image },
  { key: 'voice', title: 'Message Vocal', copy: 'Change ta voix ou crée-la', image: toolFromCatalog('voice').image },
  { key: 'verify', title: 'ChapVerify', copy: 'Détecte les deepfakes', image: toolFromCatalog('verify').image },
]

const QUICK_START = [
  { key: 'live', label: 'Live Swap', icon: 'videocam', colors: ['#FF3B6B', '#FF7A45'] },
  { key: 'photo-video', label: 'Photos en Vidéo', icon: 'film', colors: [C.violet, '#B06BFF'] },
  { key: 'translate', label: 'Traduction de Vidéo', icon: 'language', colors: [C.blue, '#3FA2FF'] },
]

export function CreateScreen({ onOpenTool }) {
  const { width } = useWindowDimensions()
  const colW = (width - PAD * 2 - GAP) / 2
  const live = toolFromCatalog('live')

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.title} accessibilityRole="header">Créer</Text>
      <Text style={styles.subtitle}>Choisis ton outil et commence à créer.</Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Lancer Live Swap, change de visage en temps réel"
        onPress={() => onOpenTool('live')}
        style={({ pressed }) => [styles.featured, { height: Math.round(Math.min((width - PAD * 2) * 0.86, 340)) }, pressed && styles.pressed]}
      >
        <Image source={asset(live.image)} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <LinearGradient
          colors={['rgba(11,18,51,0)', 'rgba(11,18,51,0.4)', 'rgba(11,18,51,0.92)']}
          locations={[0.3, 0.6, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveBadgeText}>En direct</Text>
        </View>
        <View style={styles.featuredBody}>
          <View style={styles.flex}>
            <Text style={styles.featuredTitle}>Live Swap</Text>
            <Text style={styles.featuredCopy}>Change de visage en temps réel</Text>
          </View>
          <LinearGradient colors={BRAND} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.launch}>
            <Text style={styles.launchText}>Lancer</Text>
            <Ionicons name="arrow-forward" size={15} color={C.white} />
          </LinearGradient>
        </View>
      </Pressable>

      <Text style={styles.sectionTitle} accessibilityRole="header">Commencer rapidement</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.quickRow}>
        {QUICK_START.map((q) => (
          <Pressable
            key={q.key}
            accessibilityRole="button"
            accessibilityLabel={q.label}
            onPress={() => onOpenTool(q.key)}
            style={({ pressed }) => [styles.quick, pressed && styles.pressed]}
          >
            <LinearGradient colors={q.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.quickIcon}>
              <Ionicons name={q.icon} size={15} color={C.white} />
            </LinearGradient>
            <Text style={styles.quickLabel} numberOfLines={1}>{q.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={styles.sectionTitle} accessibilityRole="header">Outils de création</Text>
      <View style={styles.grid}>
        {CREATION_TOOLS.map((tool) => (
          <Pressable
            key={tool.key}
            accessibilityRole="button"
            accessibilityLabel={`${tool.title}, ${tool.copy}`}
            onPress={() => onOpenTool(tool.key)}
            style={({ pressed }) => [styles.tool, { width: colW, height: Math.round(colW * 1.18) }, pressed && styles.pressed]}
          >
            <Image source={asset(tool.image)} style={StyleSheet.absoluteFill} resizeMode="cover" />
            <LinearGradient colors={['rgba(11,18,51,0)', 'rgba(11,18,51,0.9)']} locations={[0.4, 1]} style={StyleSheet.absoluteFill} />
            <View style={styles.toolBody}>
              <View style={styles.flex}>
                <Text style={styles.toolTitle} numberOfLines={1}>{tool.title}</Text>
                <Text style={styles.toolCopy} numberOfLines={1}>{tool.copy}</Text>
              </View>
              <View style={styles.toolGo}>
                <Ionicons name="arrow-forward" size={12} color={C.ink} />
              </View>
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  content: { paddingHorizontal: PAD, paddingTop: 8, paddingBottom: 120 },
  title: { color: C.ink, fontSize: 30, fontWeight: '900', letterSpacing: -0.8, marginTop: 8 },
  subtitle: { color: C.muted, fontSize: 14, lineHeight: 20, marginTop: 4 },

  featured: { marginTop: 18, borderRadius: R_HERO, overflow: 'hidden', backgroundColor: INK_DEEP, justifyContent: 'flex-end', ...shadow, shadowOpacity: 0.22 },
  liveBadge: { position: 'absolute', top: 14, left: 14, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 26, borderRadius: 13, backgroundColor: 'rgba(11,18,51,0.45)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF3B6B' },
  liveBadgeText: { color: C.white, fontSize: 11, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' },
  featuredBody: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, padding: 18 },
  featuredTitle: { color: C.white, fontSize: 28, lineHeight: 32, fontWeight: '900', letterSpacing: -0.8 },
  featuredCopy: { color: 'rgba(255,255,255,0.82)', fontSize: 14, lineHeight: 20, marginTop: 2 },
  launch: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 44, paddingHorizontal: 18, borderRadius: 22 },
  launchText: { color: C.white, fontSize: 14, fontWeight: '800' },

  sectionTitle: { color: C.ink, fontSize: 19, fontWeight: '800', letterSpacing: -0.4, marginTop: 24, marginBottom: 12 },

  bleed: { marginHorizontal: -PAD, flexGrow: 0 },
  quickRow: { paddingHorizontal: PAD, gap: 8 },
  quick: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingLeft: 6, paddingRight: 14, borderRadius: 22, backgroundColor: C.white, borderWidth: 1, borderColor: C.line, ...shadow, shadowOpacity: 0.05 },
  quickIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { color: C.ink, fontSize: 14, fontWeight: '700' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  tool: { borderRadius: R_CARD, overflow: 'hidden', backgroundColor: INK_DEEP, justifyContent: 'flex-end', borderWidth: 1, borderColor: C.line, ...shadow, shadowOpacity: 0.1 },
  toolBody: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 12 },
  toolTitle: { color: C.white, fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  toolCopy: { color: 'rgba(255,255,255,0.78)', fontSize: 12, marginTop: 2 },
  toolGo: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
})
