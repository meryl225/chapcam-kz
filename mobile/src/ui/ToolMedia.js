import React from 'react'
import { Image, StyleSheet, View } from 'react-native'
import { requireOptionalNativeModule } from 'expo-modules-core'
import { asset } from './catalog'

// expo-video needs a native rebuild; older dev clients fall back to the production poster.
const video = requireOptionalNativeModule('ExpoVideo') ? require('expo-video') : null

function LoopingVideo({ src, style, label }) {
  const player = video.useVideoPlayer(asset(src).uri, (p) => {
    p.loop = true
    p.muted = true
    p.play()
  })
  return (
    <video.VideoView
      player={player}
      style={style}
      contentFit="cover"
      nativeControls={false}
      allowsPictureInPicture={false}
      accessibilityLabel={label}
    />
  )
}

export function MediaView({ media, style = StyleSheet.absoluteFill, label }) {
  if (!media) return null
  if (media.type === 'video' && video) return <LoopingVideo src={media.src} style={style} label={label} />
  const still = media.type === 'image' ? media.src : media.poster
  if (still) return <Image source={asset(still)} style={style} resizeMode="cover" accessibilityLabel={label} />
  return <View style={[style, styles.empty]} />
}

const styles = StyleSheet.create({
  empty: { backgroundColor: '#1A1F45' },
})
