'use client'

import { Video, VideoOff, AlertTriangle, Download } from 'lucide-react'
import { useVirtualCamera } from '@/hooks/use-virtual-camera'

/**
 * Indicateur visuel de l'etat de la camera virtuelle "ChapCam Camera".
 * S'affiche uniquement dans l'app de bureau (Electron). Sur le web, rien n'est rendu.
 */
export function VirtualCameraIndicator({ className = '' }: { className?: string }) {
  const { state, available } = useVirtualCamera()

  // Hors app de bureau : la camera virtuelle n'existe pas, on n'affiche rien.
  if (!available) return null

  // Cas 1 : pilote absent
  if (!state.driverInstalled) {
    return (
      <div
        className={`flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 ${className}`}
      >
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-amber-500">Pilote caméra manquant</p>
          <p className="truncate text-[11px] text-muted-foreground">
            Réinstallez ChapCam pour activer « ChapCam Camera »
          </p>
        </div>
        <Download className="ml-auto h-3.5 w-3.5 shrink-0 text-amber-500/70" />
      </div>
    )
  }

  // Cas 2 : erreur
  if (state.error) {
    return (
      <div
        className={`flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 ${className}`}
      >
        <VideoOff className="h-4 w-4 shrink-0 text-red-500" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-red-500">Caméra virtuelle en erreur</p>
          <p className="truncate text-[11px] text-muted-foreground">{state.error}</p>
        </div>
      </div>
    )
  }

  // Cas 3 : active
  if (state.running) {
    return (
      <div
        className={`flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 ${className}`}
      >
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
        </span>
        <Video className="h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-primary">ChapCam Camera active</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {state.width}×{state.height} · {state.fps} fps · visible dans OBS, Zoom, Meet…
          </p>
        </div>
      </div>
    )
  }

  // Cas 4 : pilote prêt mais caméra inactive
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border border-hairline bg-muted px-3 py-2 ${className}`}
    >
      <VideoOff className="h-4 w-4 shrink-0 text-text-faint" />
      <div className="min-w-0">
        <p className="text-xs font-semibold text-foreground">ChapCam Camera prête</p>
        <p className="truncate text-[11px] text-muted-foreground">
          Lancez la transformation pour diffuser le flux
        </p>
      </div>
    </div>
  )
}
