import React, { memo, useCallback, useMemo, useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { requireOptionalNativeModule } from 'expo-modules-core'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { C, CREATOR_VIDEOS, GAP, PAD, asset } from '../ui/catalog'
import { MediaView } from '../ui/ToolMedia'

const videoModule = requireOptionalNativeModule('ExpoVideo') ? require('expo-video') : null
const INK_DEEP = '#0B1233'
const R_CARD = 22

export function InspirationScreen({ onBack }) {
  const { width } = useWindowDimensions()
  const colW = useMemo(() => (width - PAD * 2 - GAP) / 2, [width])
  const [playing, setPlaying] = useState(null)
  const closePlayer = useCallback(() => setPlaying(null), [])

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retour à l’accueil"
          hitSlop={10}
          onPress={onBack}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <Ionicons name="chevron-back" size={22} color={C.ink} />
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">Idées à recréer</Text>
        <View style={styles.backSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.feed}>
          {CREATOR_VIDEOS.map((item, index) => (
            <InspirationTile key={item.key} item={item} index={index} width={colW} onPress={setPlaying} />
          ))}
        </View>
      </ScrollView>

      <Modal visible={Boolean(playing)} animationType="fade" presentationStyle="fullScreen" onRequestClose={closePlayer}>
        {playing ? <FullscreenPlayer media={playing.media} onClose={closePlayer} /> : null}
      </Modal>
    </View>
  )
}

const InspirationTile = memo(function InspirationTile({ item, index, width, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Lire la vidéo d’inspiration ${index + 1}`}
      onPress={() => onPress(item)}
      style={({ pressed }) => [styles.tile, { width, height: Math.round(width * 1.28) }, pressed && styles.pressed]}
    >
      <MediaView media={item.media} />
    </Pressable>
  )
})

function FullscreenPlayer({ media, onClose }) {
  const insets = useSafeAreaInsets()
  const canPlay = media?.type === 'video' && videoModule
  return (
    <View style={styles.player}>
      {canPlay ? (
        <PlayerVideo src={media.src} />
      ) : media?.poster || media?.src ? (
        <Image source={asset(media.poster || media.src)} style={StyleSheet.absoluteFill} contentFit="contain" />
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Fermer la vidéo"
        hitSlop={10}
        onPress={onClose}
        style={({ pressed }) => [styles.close, { top: insets.top + 10 }, pressed && styles.pressed]}
      >
        <Ionicons name="close" size={22} color={C.white} />
      </Pressable>
    </View>
  )
}

function PlayerVideo({ src }) {
  const source = useMemo(() => (typeof src === 'string' ? asset(src).uri : src), [src])
  const player = videoModule.useVideoPlayer(source, (p) => {
    p.loop = true
    p.play()
  })
  return (
    <videoModule.VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="contain"
      nativeControls
      allowsPictureInPicture={false}
    />
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: PAD, height: 56 },
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.white, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  backSpacer: { width: 36 },
  title: { color: C.ink, fontSize: 19, fontWeight: '900', letterSpacing: -0.5 },
  content: { paddingTop: 8, paddingBottom: 120 },
  feed: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP, paddingHorizontal: PAD },
  tile: { borderRadius: R_CARD, overflow: 'hidden', backgroundColor: INK_DEEP },
  player: { flex: 1, backgroundColor: '#000' },
  close: { position: 'absolute', right: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(11,18,51,0.6)', alignItems: 'center', justifyContent: 'center' },
})
