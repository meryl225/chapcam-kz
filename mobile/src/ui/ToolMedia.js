import React, { useEffect, useRef, useState } from 'react'
import { Dimensions, Image, StyleSheet, View } from 'react-native'
import { requireOptionalNativeModule } from 'expo-modules-core'
import { asset } from './catalog'
import { ChapCamLoader } from './ChapCamLoader'

// expo-video needs a native rebuild; older dev clients fall back to the production poster.
const video = requireOptionalNativeModule('ExpoVideo') ? require('expo-video') : null

const CHECK_MS = 400
const PRELOAD_MARGIN = 120

// Polling measureInWindow works inside any vertical/horizontal scroller or hidden tab without per-screen wiring.
function useOnScreen(ref) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    let alive = true
    const check = () => {
      ref.current?.measureInWindow((x, y, w, h) => {
        if (!alive) return
        const { width, height } = Dimensions.get('window')
        const onScreen =
          w > 0 && h > 0 &&
          y + h > -PRELOAD_MARGIN && y < height + PRELOAD_MARGIN &&
          x + w > 0 && x < width
        setVisible((prev) => (prev === onScreen ? prev : onScreen))
      })
    }
    check()
    const id = setInterval(check, CHECK_MS)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [ref])
  return visible
}

function LoopingVideo({ src, active, label }) {
  const player = video.useVideoPlayer(asset(src).uri, (p) => {
    p.loop = true
    p.muted = true
  })
  useEffect(() => {
    if (active) player.play()
    else player.pause()
  }, [active, player])
  return (
    <video.VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      nativeControls={false}
      allowsPictureInPicture={false}
      accessibilityLabel={label}
    />
  )
}

function Still({ src, label }) {
  const [ready, setReady] = useState(false)
  if (!src) return <View style={[StyleSheet.absoluteFill, styles.empty]} />
  return (
    <>
      <View style={[StyleSheet.absoluteFill, styles.empty]} />
      <Image
        source={asset(src)}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        accessibilityLabel={label}
        onLoadEnd={() => setReady(true)}
      />
      <ChapCamLoader fill size="small" visible={!ready} />
    </>
  )
}

function LazyVideo({ media, style, label }) {
  const ref = useRef(null)
  const visible = useOnScreen(ref)
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    if (visible) setLoaded(true)
  }, [visible])
  return (
    <View ref={ref} style={style} collapsable={false} pointerEvents="none">
      <Still src={media.poster} label={label} />
      {loaded ? <LoopingVideo src={media.src} active={visible} label={label} /> : null}
    </View>
  )
}

export function MediaView({ media, style = StyleSheet.absoluteFill, label }) {
  if (!media) return null
  if (media.type === 'video' && video) return <LazyVideo media={media} style={style} label={label} />
  const still = media.type === 'image' ? media.src : media.poster
  return (
    <View style={style} pointerEvents="none">
      <Still src={still} label={label} />
    </View>
  )
}

const styles = StyleSheet.create({
  empty: { backgroundColor: '#1A1F45' },
})
