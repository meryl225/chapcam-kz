import React, { useEffect, useMemo, useRef, useState } from 'react'
import { AppState, Dimensions, Image, StyleSheet, View } from 'react-native'
import { requireOptionalNativeModule } from 'expo-modules-core'
import { asset } from './catalog'
import { setPlayerPlaying, useSafeVideoPlayer } from '../lib/useSafeVideoPlayer'
import { ChapCamLoader } from './ChapCamLoader'

// expo-video needs a native rebuild; older dev clients fall back to the production poster.
const video = requireOptionalNativeModule('ExpoVideo') ? require('expo-video') : null
const CachedImage = requireOptionalNativeModule('ExpoImage') ? require('expo-image').Image : null

const CHECK_MS = 500
const PRELOAD_MARGIN = 120
// Cards within PRELOAD_MARGIN already hold a mounted (decoder-backed) player whether playing or paused,
// so this cap only bounds simultaneous decoding work. It must cover the six-tile "Pour toi" grid, which fits
// on one screen; with 2, four tiles stayed frozen on their first frame. Far cards are still unmounted.
const MAX_PLAYING = 6

// One shared ticker measures every card in a single pass instead of one 400 ms interval per card.
const watchers = new Set()
let timerId = null
let appActive = AppState.currentState === 'active' || AppState.currentState == null

function applyMeasures(results) {
  const playing = new Set(
    results
      .filter((r) => r.area > 0)
      .sort((a, b) => b.area - a.area)
      .slice(0, MAX_PLAYING)
      .map((r) => r.watcher),
  )
  results.forEach((r) => r.watcher.update(r.near, r.keep, appActive && playing.has(r.watcher)))
}

function tick() {
  if (!appActive || watchers.size === 0) return
  const { width, height } = Dimensions.get('window')
  const list = [...watchers]
  const results = []
  let pending = list.length
  const done = () => {
    pending -= 1
    if (pending === 0) applyMeasures(results)
  }
  list.forEach((watcher) => {
    const node = watcher.ref.current
    if (!node) return done()
    node.measureInWindow((x, y, w, h) => {
      const sized = w > 0 && h > 0
      const onX = x + w > 0 && x < width
      const visW = Math.max(0, Math.min(x + w, width) - Math.max(x, 0))
      const visH = Math.max(0, Math.min(y + h, height) - Math.max(y, 0))
      results.push({
        watcher,
        near: sized && onX && y + h > -PRELOAD_MARGIN && y < height + PRELOAD_MARGIN,
        // Keep the player alive within one screen of the viewport so quick back-and-forth scrolls do not rebuild it.
        keep: sized && x + w > -width && x < width * 2 && y + h > -height && y < height * 2,
        area: sized ? visW * visH : 0,
      })
      done()
    })
  })
}

function startTicker() {
  if (timerId == null) timerId = setInterval(tick, CHECK_MS)
}

function stopTicker() {
  if (timerId != null) clearInterval(timerId)
  timerId = null
}

AppState.addEventListener('change', (state) => {
  appActive = state === 'active'
  if (appActive) {
    startTicker()
    tick()
  } else {
    stopTicker()
    watchers.forEach((w) => w.pause())
  }
})

const IDLE = { mounted: false, playing: false }

// Works inside any vertical/horizontal scroller or hidden tab without per-screen wiring.
function useViewport(ref) {
  const [state, setState] = useState(IDLE)
  useEffect(() => {
    const watcher = {
      ref,
      update: (near, keep, playing) =>
        setState((prev) => {
          const mounted = near || (prev.mounted && keep)
          return prev.mounted === mounted && prev.playing === playing ? prev : { mounted, playing }
        }),
      pause: () => setState((prev) => (prev.playing ? { ...prev, playing: false } : prev)),
    }
    watchers.add(watcher)
    if (appActive) startTicker()
    tick()
    return () => {
      watchers.delete(watcher)
      if (watchers.size === 0) stopTicker()
    }
  }, [ref])
  return state
}

// Remote demos are cached on disk by ExoPlayer/AVPlayer, so they download once instead of on every visit.
export const videoSource = (src) => (typeof src === 'string' ? { uri: asset(src).uri, useCaching: true } : src)

function LoopingVideo({ src, active, label }) {
  const source = useMemo(() => videoSource(src), [src])
  const player = useSafeVideoPlayer(video, source, (p) => {
    p.loop = true
    p.muted = true
  })
  useEffect(() => {
    setPlayerPlaying(player, active)
  }, [active, player])
  if (!player) return null
  return (
    <video.VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      // Android's default SurfaceView renders in its own window, ignores the card's overflow/borderRadius clip
      // and lags behind scrolling, so a neighbouring card's video bleeds into this one. TextureView is clipped like any view.
      surfaceType="textureView"
      nativeControls={false}
      allowsPictureInPicture={false}
      accessibilityLabel={label}
    />
  )
}

function Still({ src, label }) {
  const [ready, setReady] = useState(false)
  if (!src) return <View style={[StyleSheet.absoluteFill, styles.empty]} />
  if (CachedImage) {
    // Disk cache: an image already seen appears instantly, no loader on every screen visit.
    return (
      <>
        <View style={[StyleSheet.absoluteFill, styles.empty]} />
        <CachedImage
          source={asset(src)}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={120}
          recyclingKey={sourceKey(src)}
          accessibilityLabel={label}
        />
      </>
    )
  }
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

// A new source must get a new player instance, never reuse the previous card's player/surface.
const sourceKey = (src) => (typeof src === 'string' ? src : `asset-${String(src)}`)

function LazyVideo({ media, style, label }) {
  const ref = useRef(null)
  const { mounted, playing } = useViewport(ref)
  // Far off-screen the player is unmounted so its decoder and buffers are released; the poster stays underneath.
  return (
    <View ref={ref} style={[style, styles.clip]} collapsable={false} pointerEvents="none">
      <Still src={media.poster} label={label} />
      {mounted ? <LoopingVideo key={sourceKey(media.src)} src={media.src} active={playing} label={label} /> : null}
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
  clip: { overflow: 'hidden' },
})
