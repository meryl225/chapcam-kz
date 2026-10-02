import React, { useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { C } from './catalog'

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

  return (
    <Animated.View
      pointerEvents="none"
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="ChapCam"
      accessibilityState={{ busy: true }}
      style={[fill ? styles.fill : styles.inline, { opacity }, style]}
    >
      <Animated.View style={[styles.glyph, { width: px * 1.4, height: px * 1.4, opacity: glyphOpacity, transform }]}>
        {/* Violet glyph offset beneath the blue one gives the blue-to-violet brand sheen without a native mask module. */}
        {!light ? <Ionicons name="infinite" size={px} color={C.violet} style={[styles.layer, styles.under]} /> : null}
        <Ionicons name="infinite" size={px} color={light ? C.white : C.blue} style={[styles.layer, light ? styles.lightGlow : styles.glow]} />
      </Animated.View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  inline: { alignItems: 'center', justifyContent: 'center' },
  glyph: { alignItems: 'center', justifyContent: 'center' },
  layer: { position: 'absolute' },
  under: { transform: [{ translateX: 1.5 }, { translateY: 1 }], opacity: 0.85 },
  glow: { textShadowColor: 'rgba(123,77,255,0.55)', textShadowRadius: 10, textShadowOffset: { width: 0, height: 0 } },
  lightGlow: { textShadowColor: 'rgba(255,255,255,0.35)', textShadowRadius: 8, textShadowOffset: { width: 0, height: 0 } },
})
