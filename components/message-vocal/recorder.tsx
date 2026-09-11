'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, Pause, Play, Square } from 'lucide-react'

type Phase = 'idle' | 'recording' | 'paused'

interface RecorderProps {
  onRecorded: (blob: Blob, url: string, mimeType: string) => void
  onError: (message: string) => void
  accent: string
  disabled?: boolean
}

const BAR_COUNT = 40

// Choisit un type MediaRecorder accepte par le navigateur ET par ElevenLabs.
function pickMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c
  }
  return ''
}

function fmt(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function Recorder({ onRecorded, onError, accent, disabled }: RecorderProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [levels, setLevels] = useState<number[]>(() => new Array(BAR_COUNT).fill(0.08))

  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rafRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)
  const accumRef = useRef<number>(0)

  const cleanup = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') void audioCtxRef.current.close()
    audioCtxRef.current = null
    analyserRef.current = null
  }, [])

  useEffect(() => cleanup, [cleanup])

  const drawLoop = useCallback(() => {
    const analyser = analyserRef.current
    if (!analyser) return
    const data = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(data)
    const step = Math.floor(data.length / BAR_COUNT) || 1
    const next: number[] = []
    for (let i = 0; i < BAR_COUNT; i++) {
      let sum = 0
      for (let j = 0; j < step; j++) sum += data[i * step + j] || 0
      const avg = sum / step / 255
      next.push(Math.max(0.08, Math.min(1, avg * 1.6)))
    }
    setLevels(next)
    rafRef.current = requestAnimationFrame(drawLoop)
  }, [])

  const start = useCallback(async () => {
    const mimeType = pickMimeType()
    if (!mimeType) {
      onError("L'enregistrement audio n'est pas supporté par ce navigateur.")
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { noiseSuppression: true, echoCancellation: true, autoGainControl: true },
      })
      streamRef.current = stream

      const ctx = new AudioContext()
      audioCtxRef.current = ctx
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

      const rec = new MediaRecorder(stream, { mimeType })
      chunksRef.current = []
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        cleanup()
        if (blob.size > 0) {
          const url = URL.createObjectURL(blob)
          onRecorded(blob, url, mimeType)
        }
      }
      rec.start(200)
      recorderRef.current = rec

      accumRef.current = 0
      startTimeRef.current = Date.now()
      setElapsed(0)
      timerRef.current = setInterval(() => {
        setElapsed(accumRef.current + (Date.now() - startTimeRef.current) / 1000)
      }, 200)

      setPhase('recording')
      rafRef.current = requestAnimationFrame(drawLoop)
    } catch {
      onError("Impossible d'accéder au microphone. Autorisez l'accès puis réessayez.")
      cleanup()
    }
  }, [cleanup, drawLoop, onError, onRecorded])

  const pause = useCallback(() => {
    const rec = recorderRef.current
    if (!rec || rec.state !== 'recording') return
    rec.pause()
    accumRef.current += (Date.now() - startTimeRef.current) / 1000
    if (timerRef.current) clearInterval(timerRef.current)
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    setLevels(new Array(BAR_COUNT).fill(0.08))
    setPhase('paused')
  }, [])

  const resume = useCallback(() => {
    const rec = recorderRef.current
    if (!rec || rec.state !== 'paused') return
    rec.resume()
    startTimeRef.current = Date.now()
    timerRef.current = setInterval(() => {
      setElapsed(accumRef.current + (Date.now() - startTimeRef.current) / 1000)
    }, 200)
    rafRef.current = requestAnimationFrame(drawLoop)
    setPhase('recording')
  }, [drawLoop])

  const stop = useCallback(() => {
    const rec = recorderRef.current
    if (!rec || rec.state === 'inactive') return
    rec.stop()
    recorderRef.current = null
    setPhase('idle')
    setElapsed(0)
    setLevels(new Array(BAR_COUNT).fill(0.08))
  }, [])

  if (phase === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-8 text-center">
        <button
          onClick={start}
          disabled={disabled}
          className="group relative flex h-20 w-20 items-center justify-center rounded-full text-white transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
          style={{ background: `linear-gradient(135deg, ${accent}, #8b5cf6)`, boxShadow: `0 10px 40px -10px ${accent}` }}
          aria-label="Démarrer l'enregistrement"
        >
          <span className="absolute inset-0 rounded-full opacity-60" style={{ boxShadow: `0 0 0 0 ${accent}` }} />
          <Mic className="h-8 w-8" />
        </button>
        <p className="mt-4 text-sm font-semibold text-foreground">Appuyez pour enregistrer</p>
        <p className="mt-1 text-xs text-muted-foreground">Parlez naturellement, votre façon de parler sera conservée.</p>
      </div>
    )
  }

  const isRecording = phase === 'recording'

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-4 flex items-center justify-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${isRecording ? 'animate-pulse' : ''}`} style={{ backgroundColor: isRecording ? '#ef4444' : accent }} />
        <span className="text-2xl font-bold tabular-nums text-foreground">{fmt(elapsed)}</span>
        <span className="ml-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{isRecording ? 'Enregistrement' : 'En pause'}</span>
      </div>

      {/* Waveform en direct */}
      <div className="mb-5 flex h-16 items-center justify-center gap-[3px]">
        {levels.map((lvl, i) => (
          <span
            key={i}
            className="w-1.5 rounded-full transition-[height] duration-100"
            style={{
              height: `${Math.round(lvl * 100)}%`,
              background: `linear-gradient(to top, ${accent}, #8b5cf6)`,
              opacity: isRecording ? 1 : 0.4,
            }}
          />
        ))}
      </div>

      <div className="flex items-center justify-center gap-3">
        {isRecording ? (
          <button
            onClick={pause}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-white/[0.1]"
          >
            <Pause className="h-4 w-4" /> Pause
          </button>
        ) : (
          <button
            onClick={resume}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-white/[0.1]"
          >
            <Play className="h-4 w-4" /> Reprendre
          </button>
        )}
        <button
          onClick={stop}
          className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-transform hover:scale-[1.02] active:scale-95"
          style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)', boxShadow: '0 8px 24px -10px #ef4444' }}
        >
          <Square className="h-4 w-4 fill-current" /> Arrêter
        </button>
      </div>
    </div>
  )
}
