'use client'

import { forwardRef } from 'react'
import { Activity, Gauge, Webcam, Sparkles, Users } from 'lucide-react'
import type { LiveStatus } from '@/hooks/use-live-face-swap'

interface Props {
  status: LiveStatus
  fps: number
  latencyMs: number
  queuePosition?: number
  queueTotal?: number
  videoRef: React.RefObject<HTMLVideoElement | null>
  outputCanvasRef: React.RefObject<HTMLCanvasElement | null>
}

function latencyColor(ms: number) {
  if (ms <= 0) return 'text-gray-400'
  if (ms < 600) return 'text-[#00ff88]'
  if (ms < 1000) return 'text-yellow-400'
  return 'text-red-400'
}

export const LiveStage = forwardRef<HTMLDivElement, Props>(function LiveStage(
  { status, fps, latencyMs, queuePosition = 0, queueTotal = 0, videoRef, outputCanvasRef },
  ref,
) {
  const isLive = status === 'running'
  const isQueued = status === 'queued'
  const isPreparing = status === 'connecting' || status === 'preparing'

  return (
    <div ref={ref} className="overflow-hidden rounded-3xl border border-white/10 bg-black">
      <div className="grid grid-cols-1 md:grid-cols-2">
        {/* Camera reelle */}
        <div className="relative aspect-video border-b border-white/10 md:border-b-0 md:border-r">
          <video
            ref={videoRef}
            playsInline
            muted
            className="h-full w-full -scale-x-100 object-cover"
          />
          {status === 'idle' || status === 'stopped' ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#0a0a0a] text-gray-500">
              <Webcam className="h-10 w-10" />
              <span className="text-sm">Camera reelle</span>
            </div>
          ) : null}
          <span className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/55 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
            <Webcam className="h-3.5 w-3.5" /> Camera reelle
          </span>
        </div>

        {/* Sortie swappee */}
        <div className="relative aspect-video bg-[#0a0a0a]">
          <canvas ref={outputCanvasRef} className="h-full w-full -scale-x-100 object-cover" />
          {!isLive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-500">
              {isQueued ? (
                <>
                  <Users className="h-10 w-10 animate-pulse text-[#00ff88]/70" />
                  <span className="text-3xl font-extrabold text-[#00ff88]">
                    {queuePosition > 0 ? `#${queuePosition}` : '...'}
                  </span>
                  <span className="text-sm font-semibold text-white">File d&apos;attente GPU</span>
                  <span className="text-xs text-gray-400">
                    {queuePosition > 0
                      ? `Tu es ${queuePosition === 1 ? 'le prochain' : `en position ${queuePosition}`}${
                          queueTotal > 0 ? ` sur ${queueTotal} en attente` : ''
                        }`
                      : 'Recherche d\u2019un creneau GPU libre...'}
                  </span>
                  <span className="mt-1 text-[11px] text-gray-500">
                    Ton temps d&apos;essai ne tourne pas pendant l&apos;attente.
                  </span>
                </>
              ) : isPreparing ? (
                <>
                  <Sparkles className="h-10 w-10 animate-pulse text-[#00ff88]/60" />
                  <span className="text-sm text-[#00ff88]/80">
                    {status === 'connecting' ? 'Connexion au moteur...' : 'Preparation du visage...'}
                  </span>
                </>
              ) : (
                <>
                  <Sparkles className="h-10 w-10" />
                  <span className="text-sm">Resultat ChapCam</span>
                </>
              )}
            </div>
          )}
          <span className="absolute left-3 top-3 flex items-center gap-2 rounded-full border border-[#00ff88]/40 bg-[#00ff88]/15 px-3 py-1.5 text-xs font-bold text-[#00ff88] backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" /> ChapCam Live
          </span>
        </div>
      </div>

      {/* Barre de metriques */}
      <div className="flex items-center justify-between gap-4 border-t border-white/10 bg-[#0d0d0d] px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${isLive ? 'animate-pulse bg-[#00ff88]' : 'bg-gray-600'}`}
          />
          <span className="text-xs font-medium text-gray-300">
            {isLive
              ? 'EN DIRECT'
              : isQueued
                ? 'EN FILE D\u2019ATTENTE'
                : status === 'stopped'
                  ? 'Arrete'
                  : 'Hors ligne'}
          </span>
        </div>
        <div className="flex items-center gap-5">
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <Gauge className="h-3.5 w-3.5" />
            <span className="font-semibold text-white">{fps}</span> fps
          </span>
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <Activity className="h-3.5 w-3.5" />
            <span className={`font-semibold ${latencyColor(latencyMs)}`}>
              {latencyMs > 0 ? `${latencyMs}ms` : '--'}
            </span>{' '}
            latence
          </span>
        </div>
      </div>
    </div>
  )
})
