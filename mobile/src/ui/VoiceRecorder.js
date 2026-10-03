import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import {
  AudioQuality,
  IOSOutputFormat,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio'
import { C } from './catalog'

// HeyGen cloning only accepts MP3/WAV, so iOS records 16-bit mono PCM WAV.
function wavOptions(sampleRate) {
  return {
    ...RecordingPresets.HIGH_QUALITY,
    extension: '.wav',
    sampleRate,
    numberOfChannels: 1,
    ios: {
      extension: '.wav',
      outputFormat: IOSOutputFormat.LINEARPCM,
      audioQuality: AudioQuality.MAX,
      sampleRate,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
  }
}

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

export function VoiceRecorder({ maxSeconds, minSeconds = 0, sampleRate = 44100, disabled, accent = C.blue, onRecorded }) {
  const options = useMemo(() => wavOptions(sampleRate), [sampleRate])
  const recorder = useAudioRecorder(options)
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef(null)
  const startRef = useRef(0)
  const stopRef = useRef(null)

  useEffect(() => () => timerRef.current && clearInterval(timerRef.current), [])

  const stop = async () => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
    const seconds = (Date.now() - startRef.current) / 1000
    try {
      await recorder.stop()
    } catch {}
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {})
    setRecording(false)
    if (seconds < minSeconds) {
      Alert.alert('Enregistrement trop court', `Parle au moins ${minSeconds} secondes.`)
      return
    }
    if (recorder.uri) onRecorded(recorder.uri, seconds)
  }
  stopRef.current = stop

  const start = async () => {
    const permission = await requestRecordingPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('Micro', 'Autorise ChapCam à utiliser le micro dans Réglages.')
      return
    }
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true })
      await recorder.prepareToRecordAsync()
      recorder.record()
      startRef.current = Date.now()
      setElapsed(0)
      setRecording(true)
      timerRef.current = setInterval(() => {
        const s = (Date.now() - startRef.current) / 1000
        setElapsed(s)
        if (s >= maxSeconds) stopRef.current?.()
      }, 200)
    } catch {
      Alert.alert('Micro', "Impossible de démarrer l'enregistrement.")
    }
  }

  const progress = Math.min(1, elapsed / maxSeconds)

  return (
    <View style={styles.card}>
      <Pressable
        onPress={recording ? stop : start}
        disabled={disabled}
        style={[styles.button, { backgroundColor: recording ? '#EF4444' : accent }, disabled && styles.off]}
        accessibilityRole="button"
        accessibilityLabel={recording ? "Arrêter l'enregistrement" : 'Commencer à enregistrer'}
      >
        <Ionicons name={recording ? 'stop' : 'mic'} size={30} color={C.white} />
      </Pressable>
      <Text style={styles.title}>{recording ? 'Enregistrement…' : 'Appuie pour enregistrer'}</Text>
      <Text style={styles.time}>
        {fmt(elapsed)} / {fmt(maxSeconds)}
      </Text>
      <View style={styles.bar}>
        <View style={[styles.barFill, { width: `${progress * 100}%`, backgroundColor: recording ? '#EF4444' : accent }]} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: 8, paddingVertical: 22, paddingHorizontal: 18, borderRadius: 22, backgroundColor: C.white, borderWidth: 1, borderColor: '#E5E9F4' },
  button: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center' },
  off: { opacity: 0.4 },
  title: { color: C.ink, fontSize: 15, fontWeight: '800', marginTop: 4 },
  time: { color: C.muted, fontSize: 13, fontVariant: ['tabular-nums'] },
  bar: { alignSelf: 'stretch', height: 4, borderRadius: 2, backgroundColor: '#E5E9F4', overflow: 'hidden', marginTop: 4 },
  barFill: { height: 4 },
})
