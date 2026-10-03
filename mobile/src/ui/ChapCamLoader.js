import React, { useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, Animated, Easing, Image, StyleSheet } from 'react-native'

// Transparent export of the website's /public/chapcam-mark.png (the mark used in the web sidebar).
const MARK = require('../../assets/chapcam-mark.png')
const MARK_RATIO = 565 / 283

const SIZES = { small: 22, medium: 32, large: 48 }
const ROTATION_MS = 1400
const PULSE_MS = 900
const FADE_IN_MS = 140
const FADE_OUT_MS = 260

function useReduceMotion() {
  const [reduce, setReduce] = useState(false)
  useEffect(() => {
    let alive = true
    AccessibilityInfo.isReduceMotionEnabled?.().then((v) => alive && setReduce(!!v)).catch(() => {})
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v) => setReduce(!!v))
    return () => {
      alive = false
      sub?.remove?.()
    }
  }, [])
  return reduce
}

export function ChapCamLoader({ visible = true, size = 'medium', tone = 'brand', fill = false, style }) {
  const px = typeof size === 'number' ? size : SIZES[size] || SIZES.medium
  const reduceMotion = useReduceMotion()
  const [mounted, setMounted] = useState(visible)
  const opacity = useRef(new Animated.Value(0)).current
  const motion = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (visible) setMounted(true)
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: visible ? FADE_IN_MS : FADE_OUT_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !visible) setMounted(false)
    })
  }, [visible, opacity])

  useEffect(() => {
    if (!mounted) return undefined
    motion.setValue(0)
    const loop = reduceMotion
      ? Animated.loop(
          Animated.sequence([
            Animated.timing(motion, { toValue: 1, duration: PULSE_MS, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(motion, { toValue: 0, duration: PULSE_MS, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          ]),
        )
      : Animated.loop(Animated.timing(motion, { toValue: 1, duration: ROTATION_MS, easing: Easing.linear, useNativeDriver: true }))
    loop.start()
    return () => loop.stop()
  }, [mounted, reduceMotion, motion])

  if (!mounted) return null

  const transform = reduceMotion
    ? [{ scale: motion.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.06] }) }]
    : [{ rotate: motion.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }]
  const glyphOpacity = reduceMotion ? motion.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1] }) : 1
  const light = tone === 'light'
  const box = px * 1.4
  const markW = box
  const markH = box / MARK_RATIO

  return (
    <Animated.View
      pointerEvents="none"
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="ChapCam"
      accessibilityState={{ busy: true }}
      style={[fill ? styles.fill : styles.inline, { opacity }, style]}
    >
      <Animated.View style={[styles.glyph, { width: box, height: box, opacity: glyphOpacity, transform }]}>
        {/* A blurred copy of the mark underneath acts as its own blue/violet halo, so the glow always follows the logo shape. */}
        <Image
          source={MARK}
          blurRadius={Math.max(4, Math.round(px / 4))}
          resizeMode="contain"
          style={[styles.layer, { width: markW * 1.08, height: markH * 1.08, opacity: light ? 0.35 : 0.55 }]}
        />
        <Image
          source={MARK}
          resizeMode="contain"
          style={[styles.layer, styles.mark, light ? styles.markLight : null, { width: markW, height: markH }]}
        />
      </Animated.View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  inline: { alignItems: 'center', justifyContent: 'center' },
  glyph: { alignItems: 'center', justifyContent: 'center' },
  layer: { position: 'absolute' },
  mark: { shadowColor: '#7B4DFF', shadowOpacity: 0.45, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
  markLight: { shadowColor: '#FFFFFF', shadowOpacity: 0.3 },
})
