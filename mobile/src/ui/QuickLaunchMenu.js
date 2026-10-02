import React, { useEffect, useRef } from 'react'
import { Animated, Easing, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { requireOptionalNativeModule } from 'expo-modules-core'
import { BRAND, C, TOOL_MEDIA } from './catalog'
import { MediaView } from './ToolMedia'

// expo-blur needs a native rebuild; fall back to a dim-only backdrop on older dev clients.
const BlurView = requireOptionalNativeModule('ExpoBlur') ? require('expo-blur').BlurView : null

export const QUICK_TOOLS = [
  { key: 'live', label: 'Live Swap', icon: 'videocam', accent: '#1E6BFF', live: true },
  { key: 'genjutsu', label: 'Genjutsu', icon: 'sparkles', accent: '#5B5BFF' },
  { key: 'photo-video', label: 'Photos en Vidéo', icon: 'film', accent: '#7B4DFF' },
  { key: 'translate', label: 'Traduction de Vidéo', icon: 'language', accent: '#3D8BFF' },
  { key: 'voice', label: 'Message Vocal', icon: 'mic', accent: '#6A55FF' },
  { key: 'verify', label: 'ChapVerify', icon: 'shield-checkmark', accent: '#8E5CFF' },
]

const ANGLES = [170, 138, 108, 72, 42, 10]
const ITEM_W = 72
const ICON = 56
const DURATION = 260
const TAB_HEIGHT = 66

export function QuickLaunchMenu({ visible, bottom, onClose, onSelect }) {
  const { width } = useWindowDimensions()
  const progress = useRef(new Animated.Value(0)).current
  const items = useRef(QUICK_TOOLS.map(() => new Animated.Value(0))).current
  const [mounted, setMounted] = React.useState(visible)
  const pending = useRef(null)

  useEffect(() => {
    if (visible) {
      setMounted(true)
      items.forEach((v) => v.setValue(0))
      Animated.parallel([
        Animated.timing(progress, { toValue: 1, duration: DURATION, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.stagger(28, items.map((v) => Animated.spring(v, { toValue: 1, speed: 22, bounciness: 7, useNativeDriver: true }))),
      ]).start()
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(progress, { toValue: 0, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        ...items.map((v) => Animated.timing(v, { toValue: 0, duration: 140, useNativeDriver: true })),
      ]).start(() => {
        setMounted(false)
        const next = pending.current
        pending.current = null
        if (next) onSelect(next)
      })
    }
  }, [visible])

  if (!mounted) return null

  const padBottom = Math.max(bottom, 12)
  const cx = width / 2
  const cy = padBottom + TAB_HEIGHT / 2
  const originY = cy + 30
  const rx = Math.min(width / 2 - ITEM_W / 2 - 4, 150)
  const ry = Math.min(rx * 1.42, 210)
  const dome = ry + 92

  const choose = (key) => {
    pending.current = key
    onClose()
  }

  const rotate = progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '135deg'] })

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={visible ? 'auto' : 'none'}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: progress }]}>
        {BlurView ? <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFill} /> : null}
        <View style={[StyleSheet.absoluteFill, styles.dim]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Fermer le menu" />
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.dome,
          {
            width: dome * 2,
            height: dome * 2,
            borderRadius: dome,
            left: cx - dome,
            bottom: cy - dome,
            opacity: progress,
            transform: [
              { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [90, 0] }) },
              { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }) },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['rgba(123,77,255,0.28)', 'rgba(30,107,255,0.10)', 'rgba(14,21,48,0)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.5 }}
          style={[StyleSheet.absoluteFill, { borderRadius: dome }]}
        />
        <View style={[styles.ring, { width: (dome - 36) * 2, height: (dome - 36) * 2, borderRadius: dome - 36 }]} />
      </Animated.View>

      <Animated.Text
        style={[styles.title, { bottom: originY + ry + 46, opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }]}
        accessibilityRole="header"
      >
        CRÉER
      </Animated.Text>

      {QUICK_TOOLS.map((tool, i) => {
        const a = (ANGLES[i] * Math.PI) / 180
        const x = cx + rx * Math.cos(a) - ITEM_W / 2
        const y = originY + ry * Math.sin(a) - ICON / 2
        const v = items[i]
        return (
          <Animated.View
            key={tool.key}
            style={[
              styles.item,
              {
                left: x,
                bottom: y - 40,
                opacity: v,
                transform: [
                  { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [cx - (x + ITEM_W / 2), 0] }) },
                  { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [y - cy, 0] }) },
                  { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
                ],
              },
            ]}
          >
            <Pressable
              onPress={() => choose(tool.key)}
              accessibilityRole="button"
              accessibilityLabel={tool.label}
              hitSlop={6}
              style={({ pressed }) => [styles.itemPress, pressed && styles.pressed]}
            >
              <View style={[styles.glow, { shadowColor: tool.accent }]}>
                <View style={[styles.iconOuter, { borderColor: `${tool.accent}66` }]}>
                  <View style={[styles.icon, styles.media]}>
                    <MediaView media={TOOL_MEDIA[tool.key]} />
                  </View>
                </View>
                {tool.live ? <View style={styles.liveDot} /> : null}
              </View>
              <Text style={styles.label} numberOfLines={2}>{tool.label}</Text>
            </Pressable>
          </Animated.View>
        )
      })}

      <View style={[styles.closeWrap, { bottom: padBottom + (TAB_HEIGHT - 50) / 2, left: cx - 25 }]}>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Fermer" hitSlop={10}>
          <LinearGradient colors={BRAND} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.close}>
            <Animated.View style={{ transform: [{ rotate }] }}>
              <Ionicons name="add" size={28} color={C.white} />
            </Animated.View>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  dim: { backgroundColor: 'rgba(8,12,30,0.52)' },
  dome: {
    position: 'absolute',
    backgroundColor: 'rgba(14,21,48,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ring: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  media: { overflow: 'hidden', backgroundColor: '#1A1F45' },
  title: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.62)',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2.4,
  },
  item: { position: 'absolute', width: ITEM_W, alignItems: 'center' },
  itemPress: { alignItems: 'center', gap: 7, width: ITEM_W },
  pressed: { opacity: 0.85, transform: [{ scale: 0.94 }] },
  glow: { shadowOpacity: 0.65, shadowRadius: 14, shadowOffset: { width: 0, height: 4 } },
  iconOuter: {
    width: ICON,
    height: ICON,
    borderRadius: ICON / 2,
    padding: 3,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  icon: { flex: 1, borderRadius: ICON / 2, alignItems: 'center', justifyContent: 'center' },
  liveDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF3B5C',
    borderWidth: 2,
    borderColor: '#0E1530',
  },
  label: { color: C.white, fontSize: 12, fontWeight: '700', textAlign: 'center', lineHeight: 15, maxWidth: ITEM_W - 6 },
  closeWrap: { position: 'absolute', width: 50, height: 50 },
  close: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.violet,
    shadowOpacity: 0.6,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
  },
})
