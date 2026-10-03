import React, { useRef } from 'react'
import { PanResponder, StyleSheet, Text, View } from 'react-native'
import { C } from './catalog'

export function ValueSlider({ label, value, min = 0, max = 1, step = 0.05, display, hint, onChange, accent = C.violet }) {
  const trackRef = useRef(null)
  const geometry = useRef({ x: 0, width: 1 })
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const update = (pageX) => {
    const { x, width } = geometry.current
    const ratio = Math.min(1, Math.max(0, (pageX - x) / width))
    const raw = min + ratio * (max - min)
    const snapped = Math.round(raw / step) * step
    onChangeRef.current(Number(Math.min(max, Math.max(min, snapped)).toFixed(3)))
  }

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (_e, g) => {
        const startX = g.x0
        trackRef.current?.measure((_x, _y, width, _h, pageX) => {
          geometry.current = { x: pageX, width: Math.max(1, width) }
          update(startX)
        })
      },
      onPanResponderMove: (_e, g) => update(g.moveX),
    }),
  ).current

  const pct = ((value - min) / (max - min)) * 100

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{display ?? `${Math.round(value * 100)}%`}</Text>
      </View>
      <View
        ref={trackRef}
        {...responder.panHandlers}
        style={styles.hit}
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ text: display ?? `${Math.round(value * 100)}%` }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => {
          const delta = e.nativeEvent.actionName === 'increment' ? step : -step
          onChange(Number(Math.min(max, Math.max(min, value + delta)).toFixed(3)))
        }}
      >
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${pct}%`, backgroundColor: accent }]} />
        </View>
        <View style={[styles.thumb, { left: `${pct}%`, borderColor: accent }]} />
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: C.ink, fontSize: 14, fontWeight: '700' },
  value: { color: C.muted, fontSize: 12, fontVariant: ['tabular-nums'] },
  hit: { height: 32, justifyContent: 'center' },
  track: { height: 6, borderRadius: 3, backgroundColor: '#E5E9F4', overflow: 'hidden' },
  fill: { height: 6 },
  thumb: { position: 'absolute', width: 22, height: 22, marginLeft: -11, borderRadius: 11, backgroundColor: C.white, borderWidth: 3 },
  hint: { color: C.muted, fontSize: 11, lineHeight: 15 },
})
