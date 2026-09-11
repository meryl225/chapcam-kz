'use client'

import { useEffect, useRef, useState } from 'react'
import { Play, Pause, Download } from 'lucide-react'

// Hauteurs de barres deterministes (pas de Math.random au rendu -> pas de
// mismatch d'hydratation). Motif pseudo-aleatoire mais stable.
const BAR_HEIGHTS = Array.from({ length: 44 }, (_, i) => {
  const v = Math.abs(Math.sin(i * 1.7) * 0.6 + Math.cos(i * 0.9) * 0.4)
  return 0.25 + (v % 1) * 0.75
})

function fmt(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) sec = 0
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

interface AudioPlayerProps {
  src: string
  label: string
  accent: string
  onDownload?: () => void
  downloadLabel?: string
}

export function AudioPlayer({ src, label, accent, onDownload, downloadLabel = 'Télécharger MP3' }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)

  // Reinitialise la lecture quand la source change (nouvelle generation).
  useEffect(() => {
    setPlaying(false)
    setCurrent(0)
    setDuration(0)
  }, [src])

  const progress = duration > 0 ? current / duration : 0

  const toggle = () => {
    const a = audioRef.current
    if (!a) return
    if (a.paused) {
      void a.play()
    } else {
      a.pause()
    }
  }

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current
    if (!a || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    a.currentTime = ratio * duration
    setCurrent(a.currentTime)
  }

  return (
    <div
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
      style={{ boxShadow: `inset 0 0 0 1px ${accent}22` }}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: accent, boxShadow: `0 0 10px ${accent}` }} />
          {label}
        </span>
        {onDownload && (
          <button
            onClick={onDownload}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-white/[0.08]"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{downloadLabel}</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          aria-label={playing ? 'Pause' : 'Écouter'}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition-transform hover:scale-105 active:scale-95"
          style={{ background: `linear-gradient(135deg, ${accent}, #8b5cf6)`, boxShadow: `0 6px 20px -6px ${accent}` }}
        >
          {playing ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
        </button>

        <div className="min-w-0 flex-1">
          {/* Waveform cliquable pour se deplacer dans la lecture. */}
          <div
            className="flex h-10 cursor-pointer items-center gap-[2px]"
            onClick={seek}
            role="slider"
            aria-label="Progression de la lecture"
            aria-valuenow={Math.round(progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            tabIndex={0}
          >
            {BAR_HEIGHTS.map((h, i) => {
              const filled = i / BAR_HEIGHTS.length <= progress
              return (
                <span
                  key={i}
                  className="flex-1 rounded-full transition-colors"
                  style={{
                    height: `${Math.round(h * 100)}%`,
                    backgroundColor: filled ? accent : 'rgba(255,255,255,0.14)',
                    boxShadow: filled ? `0 0 6px ${accent}66` : 'none',
                  }}
                />
              )
            })}
          </div>
          <div className="mt-1 flex justify-between text-[11px] font-medium tabular-nums text-muted-foreground">
            <span>{fmt(current)}</span>
            <span>{fmt(duration)}</span>
          </div>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration
          if (Number.isFinite(d)) setDuration(d)
        }}
        onDurationChange={(e) => {
          const d = e.currentTarget.duration
          if (Number.isFinite(d)) setDuration(d)
        }}
        className="hidden"
      />
    </div>
  )
}
