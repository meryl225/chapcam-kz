import React, { useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, Animated, Dimensions, Easing, Image, StyleSheet, View } from 'react-native'

// Same asset, size and background as the native launch screen (app.json → expo-splash-screen),
// so the hand-off from the static launch screen to this animated one is pixel-identical.
// chapcam-symbol.png has symmetric transparent margins (glyph centre = image centre), so centring the image centres the ∞.
const SYMBOL = require('../../assets/chapcam-symbol.png')
const LOGO_SIZE = 160
export const BOOT_BACKGROUND = '#070c18'

// Centerline of the ∞ stroke, traced from chapcam-symbol.png (512×512) and normalised to 0–1.
// Order: crossing → right loop (top, right end, bottom) → crossing → left loop (top, left end, bottom) → crossing,
// which is the continuous figure-eight circuit. `t` is the cumulative arc length, so the light moves at constant speed.
const PATH_T = [0,0.0138,0.0272,0.0395,0.0503,0.0603,0.07,0.0797,0.0893,0.099,0.1088,0.1188,0.1288,0.139,0.1493,0.1598,0.1702,0.1807,0.1912,0.2017,0.212,0.2223,0.2325,0.2426,0.2527,0.2626,0.2726,0.2825,0.2924,0.3024,0.3124,0.3224,0.3324,0.3424,0.3523,0.3622,0.3721,0.3819,0.3916,0.4012,0.4107,0.4203,0.4299,0.4397,0.4498,0.4608,0.473,0.4863,0.5005,0.5153,0.529,0.5412,0.5518,0.5617,0.5713,0.5809,0.5905,0.6002,0.61,0.62,0.6301,0.6403,0.6506,0.661,0.6714,0.6819,0.6924,0.7028,0.7132,0.7235,0.7337,0.7439,0.7538,0.7638,0.7737,0.7835,0.7934,0.8033,0.8132,0.8231,0.8329,0.8428,0.8526,0.8623,0.872,0.8817,0.8913,0.9009,0.9105,0.92,0.9296,0.9394,0.9495,0.9604,0.9727,0.9861,1]
const PATH_X = [0.5,0.5167,0.5367,0.5571,0.575,0.5908,0.6063,0.6229,0.6412,0.6606,0.681,0.7028,0.7254,0.7487,0.7721,0.7951,0.817,0.8369,0.8546,0.8697,0.8814,0.89,0.896,0.8992,0.8996,0.8975,0.8927,0.8854,0.8761,0.8639,0.8489,0.8317,0.8125,0.7919,0.7703,0.7479,0.7254,0.7033,0.682,0.6616,0.6422,0.624,0.6066,0.5897,0.5731,0.5553,0.5355,0.5161,0.5,0.4813,0.4598,0.439,0.4221,0.407,0.3915,0.3751,0.3573,0.3382,0.3177,0.296,0.2733,0.25,0.2266,0.2037,0.1819,0.162,0.1443,0.1292,0.1169,0.108,0.1026,0.1001,0.0999,0.102,0.1066,0.1139,0.1239,0.1363,0.1513,0.1686,0.1874,0.2077,0.2292,0.2511,0.2733,0.2953,0.3167,0.3371,0.3564,0.3746,0.3919,0.4085,0.4249,0.4429,0.4632,0.4831,0.5]
const PATH_Y = [0.5068,0.48,0.4569,0.4378,0.4206,0.4042,0.3884,0.3739,0.3616,0.351,0.3418,0.3354,0.3317,0.3309,0.3334,0.3394,0.349,0.3622,0.3783,0.3968,0.4175,0.4393,0.4618,0.4846,0.5075,0.5302,0.5523,0.5738,0.5945,0.6137,0.631,0.6459,0.6583,0.668,0.6748,0.6783,0.6784,0.6754,0.6696,0.6616,0.6517,0.6397,0.6264,0.6117,0.5954,0.578,0.5584,0.5351,0.5068,0.4787,0.4561,0.4374,0.4201,0.4035,0.3878,0.3733,0.3605,0.3494,0.3402,0.3335,0.33,0.3293,0.3319,0.3381,0.3479,0.3611,0.3771,0.3955,0.4158,0.4376,0.4603,0.4833,0.5061,0.5286,0.5507,0.5721,0.5923,0.6112,0.628,0.6425,0.6547,0.6644,0.6708,0.6742,0.675,0.673,0.668,0.6602,0.65,0.6381,0.6247,0.6098,0.5936,0.5763,0.5569,0.5337,0.5068]

const CIRCUIT_MS = 2600
const LIGHT_FADE_IN_MS = 320
const EXIT_FADE_MS = 220
const TRAIL_LENGTH = 12
const TRAIL = Array.from({ length: TRAIL_LENGTH }, (_, i) => ({
  lag: (i + 1) * 0.0085,
  size: 6.5 - i * 0.38,
  opacity: 0.75 * (1 - (i + 1) / (TRAIL_LENGTH + 1)),
}))
const HEAD_SIZE = 7
const HALO_SIZE = 30

const X_OUT = PATH_X.map((v) => v * LOGO_SIZE)
const Y_OUT = PATH_Y.map((v) => v * LOGO_SIZE)

function positionAt(progress, size) {
  const half = size / 2
  return [
    { translateX: progress.interpolate({ inputRange: PATH_T, outputRange: X_OUT.map((v) => v - half) }) },
    { translateY: progress.interpolate({ inputRange: PATH_T, outputRange: Y_OUT.map((v) => v - half) }) },
  ]
}

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

export function BootSplash({ exiting = false, onReady, onExited }) {
  const reduceMotion = useReduceMotion()
  const progress = useRef(new Animated.Value(0)).current
  const lightOpacity = useRef(new Animated.Value(0)).current
  const screenOpacity = useRef(new Animated.Value(1)).current
  const readySent = useRef(false)
  const containerRef = useRef(null)
  const [origin, setOrigin] = useState(null)
  const [logoLoaded, setLogoLoaded] = useState(false)
  const [screen, setScreen] = useState(() => Dimensions.get('screen'))

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ screen: next }) => setScreen(next))
    return () => sub?.remove?.()
  }, [])

  // The native launch screen centres the logo on the physical screen. Parent containers (safe areas, status/navigation
  // bars) can start below y=0, so measure where this overlay really sits and centre against the screen, not the parent.
  const measureOrigin = () => {
    containerRef.current?.measureInWindow((x, y) => {
      setOrigin({ x: Number.isFinite(x) ? x : 0, y: Number.isFinite(y) ? y : 0 })
    })
  }

  const trailProgress = useRef(TRAIL.map((d) => Animated.modulo(Animated.add(progress, 1 - d.lag), 1))).current

  useEffect(() => {
    if (reduceMotion) return undefined
    progress.setValue(0)
    const loop = Animated.loop(
      Animated.timing(progress, { toValue: 1, duration: CIRCUIT_MS, easing: Easing.linear, useNativeDriver: true }),
    )
    loop.start()
    Animated.timing(lightOpacity, { toValue: 1, duration: LIGHT_FADE_IN_MS, easing: Easing.out(Easing.quad), useNativeDriver: true }).start()
    return () => loop.stop()
  }, [reduceMotion, progress, lightOpacity])

  useEffect(() => {
    if (!exiting) return
    Animated.timing(screenOpacity, { toValue: 0, duration: EXIT_FADE_MS, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() => onExited?.())
  }, [exiting, screenOpacity, onExited])

  // Release the native splash only once the logo is drawn at its final position, so it never visibly moves.
  useEffect(() => {
    if (!logoLoaded || !origin || readySent.current) return
    readySent.current = true
    onReady?.()
  }, [logoLoaded, origin, onReady])

  const logoPosition = origin
    ? {
        left: Math.round(screen.width / 2 - origin.x - LOGO_SIZE / 2),
        top: Math.round(screen.height / 2 - origin.y - LOGO_SIZE / 2),
      }
    : styles.hidden

  return (
    <Animated.View
      ref={containerRef}
      onLayout={measureOrigin}
      collapsable={false}
      pointerEvents={exiting ? 'none' : 'auto'}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="ChapCam"
      accessibilityState={{ busy: true }}
      style={[styles.screen, { opacity: screenOpacity }]}
    >
      <View style={[styles.logoBox, logoPosition]}>
        <Image
          source={SYMBOL}
          style={styles.logo}
          resizeMode="contain"
          fadeDuration={0}
          onLoad={() => setLogoLoaded(true)}
          onError={() => setLogoLoaded(true)}
        />
        {reduceMotion ? null : (
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: lightOpacity }]}>
            {TRAIL.map((d, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.dot,
                  { width: d.size, height: d.size, borderRadius: d.size / 2, opacity: d.opacity, transform: positionAt(trailProgress[i], d.size) },
                ]}
              />
            )).reverse()}
            <Animated.View style={[styles.halo, { transform: positionAt(progress, HALO_SIZE) }]} />
            <Animated.View style={[styles.head, { transform: positionAt(progress, HEAD_SIZE) }]} />
          </Animated.View>
        )}
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  screen: { ...StyleSheet.absoluteFillObject, backgroundColor: BOOT_BACKGROUND, zIndex: 10, elevation: 10 },
  logoBox: { position: 'absolute', width: LOGO_SIZE, height: LOGO_SIZE },
  hidden: { left: 0, top: 0, opacity: 0 },
  logo: { width: LOGO_SIZE, height: LOGO_SIZE },
  dot: {
    position: 'absolute',
    left: 0,
    top: 0,
    backgroundColor: '#2f8bff',
    shadowColor: '#1f6fff',
    shadowOpacity: 0.95,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
  },
  halo: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: HALO_SIZE,
    height: HALO_SIZE,
    borderRadius: HALO_SIZE / 2,
    backgroundColor: 'rgba(47, 139, 255, 0.24)',
    shadowColor: '#2f8bff',
    shadowOpacity: 0.9,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  head: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: HEAD_SIZE,
    height: HEAD_SIZE,
    borderRadius: HEAD_SIZE / 2,
    backgroundColor: '#e6f2ff',
    shadowColor: '#4da3ff',
    shadowOpacity: 1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
})
