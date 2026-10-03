import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio'
import { C } from './catalog'

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

function Player({ uri, label, accent }) {
  const player = useAudioPlayer(uri)
  const status = useAudioPlayerStatus(player)
  const toggle = () => {
    if (status.playing) return player.pause()
    if (status.duration > 0 && status.currentTime >= status.duration - 0.1) player.seekTo(0)
    player.play()
  }
  const progress = status.duration > 0 ? Math.min(1, status.currentTime / status.duration) : 0
  return (
    <View style={styles.card}>
      <Pressable onPress={toggle} style={[styles.play, { backgroundColor: accent }]} accessibilityRole="button" accessibilityLabel={status.playing ? 'Pause' : 'Écouter'}>
        <Ionicons name={status.playing ? 'pause' : 'play'} size={20} color={C.white} />
      </Pressable>
      <View style={styles.body}>
        <Text style={styles.label} numberOfLines={1}>{label}</Text>
        <View style={styles.bar}><View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: accent }]} /></View>
        <Text style={styles.time}>{status.duration > 0 ? `${fmt(status.currentTime)} / ${fmt(status.duration)}` : 'Prêt à écouter'}</Text>
      </View>
      <Pressable onPress={() => player.seekTo(0)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Revenir au début">
        <Ionicons name="refresh" size={19} color={C.muted} />
      </Pressable>
    </View>
  )
}

export function AudioClip({ uri, label, accent = C.blue }) {
  if (!uri) return null
  return <Player key={uri} uri={uri} label={label} accent={accent} />
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, backgroundColor: C.white, borderWidth: 1, borderColor: '#E5E9F4' },
  play: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 6 },
  label: { color: C.ink, fontSize: 14, fontWeight: '800' },
  bar: { height: 4, borderRadius: 2, backgroundColor: '#E5E9F4', overflow: 'hidden' },
  fill: { height: 4 },
  time: { color: C.muted, fontSize: 11, fontVariant: ['tabular-nums'] },
})
