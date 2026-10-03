import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { C, shadow } from './catalog'
import { MediaView } from './ToolMedia'

export function ToolCard({ tool, width, onPress }) {
  const soon = Boolean(tool.comingSoon)
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={soon ? `${tool.title}. Bientôt disponible` : `${tool.title}. ${tool.copy}`}
      accessibilityState={{ disabled: soon }}
      disabled={soon}
      onPress={soon ? undefined : onPress}
      style={({ pressed }) => [styles.tool, { width, height: width * 1.02 }, pressed && !soon && styles.pressed]}
    >
      <MediaView media={tool.media} />
      <LinearGradient colors={['rgba(30,20,90,0)', 'rgba(16,14,60,0.92)']} locations={[0.35, 1]} style={StyleSheet.absoluteFill} />
      {soon ? <View style={styles.soonVeil} pointerEvents="none" /> : null}
      {soon ? (
        <View style={styles.soon}>
          <Ionicons name="time-outline" size={11} color={C.ink} />
          <Text style={styles.soonText}>Bientôt disponible</Text>
        </View>
      ) : tool.live ? (
        <View style={styles.live}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      ) : null}
      <View style={styles.footer}>
        <View style={styles.flex}>
          <Text style={styles.title} numberOfLines={1}>{tool.title}</Text>
          <Text style={styles.copy} numberOfLines={2}>{tool.copy}</Text>
        </View>
        {soon ? (
          <View style={[styles.arrow, styles.arrowOff]}><Ionicons name="lock-closed" size={12} color={C.white} /></View>
        ) : (
          <View style={styles.arrow}><Ionicons name="arrow-forward" size={13} color={C.ink} /></View>
        )}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
  tool: { borderRadius: 22, overflow: 'hidden', backgroundColor: '#1A1F45', ...shadow },
  live: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FF2D55', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.white },
  liveText: { color: C.white, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  footer: { position: 'absolute', left: 12, right: 10, bottom: 12, flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  title: { color: C.white, fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  copy: { color: 'rgba(255,255,255,0.82)', fontSize: 11, lineHeight: 14, marginTop: 2 },
  arrow: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  arrowOff: { backgroundColor: 'rgba(255,255,255,0.22)' },
  soonVeil: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(11,18,51,0.45)' },
  soon: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.white, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  soonText: { color: C.ink, fontSize: 10, fontWeight: '800' },
})
