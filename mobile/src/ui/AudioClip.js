import React, { useState } from 'react'
import { ActivityIndicator, Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio'
import { File, Paths } from 'expo-file-system'
import { C } from './catalog'

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

const safeName = (name) => (name || 'message-vocal').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'message-vocal'

// The generated audio is a cache file with a timestamp name. Copy it to a
// readable name so the file saved via the share sheet ("Enregistrer dans
// Fichiers", WhatsApp…) is recognisable.
async function shareAudio(uri, downloadName) {
  const source = new File(uri)
  if (!source.exists) throw new Error('Le fichier audio n’est plus disponible. Génère-le à nouveau.')
  const ext = uri.split('?')[0].split('.').pop()?.toLowerCase() || 'mp3'
  const target = new File(Paths.cache, `chapcam-${safeName(downloadName)}.${ext}`)
  if (target.uri !== source.uri) await source.copy(target, { overwrite: true })
  await Share.share({ url: target.uri, title: downloadName })
}

function DownloadButton({ uri, downloadName, accent }) {
  const [busy, setBusy] = useState(false)
  const onPress = async () => {
    if (busy) return
    setBusy(true)
    try {
      await shareAudio(uri, downloadName)
    } catch (e) {
      Alert.alert('Téléchargement impossible', e?.message || String(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={({ pressed }) => [styles.download, { borderColor: accent }, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel="Télécharger le message vocal"
    >
      {busy ? <ActivityIndicator size="small" color={accent} /> : <Ionicons name="download-outline" size={18} color={accent} />}
      <Text style={[styles.downloadText, { color: accent }]}>Télécharger</Text>
    </Pressable>
  )
}

function Player({ uri, label, accent, downloadName }) {
  const player = useAudioPlayer(uri)
  const status = useAudioPlayerStatus(player)
  const toggle = () => {
    if (status.playing) return player.pause()
    if (status.duration > 0 && status.currentTime >= status.duration - 0.1) player.seekTo(0)
    player.play()
  }
  const progress = status.duration > 0 ? Math.min(1, status.currentTime / status.duration) : 0
  return (
    <View style={styles.wrap}>
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
    {downloadName ? <DownloadButton uri={uri} downloadName={downloadName} accent={accent} /> : null}
    </View>
  )
}

// Pass `downloadName` to show a "Télécharger" button (generated results only).
export function AudioClip({ uri, label, accent = C.blue, downloadName }) {
  if (!uri) return null
  return <Player key={uri} uri={uri} label={label} accent={accent} downloadName={downloadName} />
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  download: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 46, borderRadius: 14, borderWidth: 1.5, backgroundColor: C.white },
  downloadText: { fontSize: 15, fontWeight: '800' },
  pressed: { opacity: 0.6 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, backgroundColor: C.white, borderWidth: 1, borderColor: '#E5E9F4' },
  play: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 6 },
  label: { color: C.ink, fontSize: 14, fontWeight: '800' },
  bar: { height: 4, borderRadius: 2, backgroundColor: '#E5E9F4', overflow: 'hidden' },
  fill: { height: 4 },
  time: { color: C.muted, fontSize: 11, fontVariant: ['tabular-nums'] },
})
