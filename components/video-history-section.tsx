"use client"

import { useCallback, useEffect, useState } from "react"
import { Download, History, Loader2, Play, RefreshCw, X } from "lucide-react"

// Section "Mes vidéos" : historique PERMANENT des vidéos générées par un outil,
// re-hébergées dans le Blob privé côté serveur (les liens fournisseurs expirent).
// Réutilisable sur chaque page d'outil via la prop `tool`.

type VideoTool = "photo_video" | "motion" | "translation"

interface HistoryVideo {
  id: string
  tool: VideoTool
  title: string
  status: "processing" | "completed" | "failed"
  created_at: string
  thumbnail_url: string | null
  // URL servie par notre route privée (/api/videos/file?...), déjà prête.
  video_url: string | null
}

// Compteur externe (change de valeur) pour forcer un rafraîchissement depuis la
// page parente quand une nouvelle génération vient de se terminer.
export function VideoHistorySection({
  tool,
  refreshKey = 0,
}: {
  tool: VideoTool
  refreshKey?: number
}) {
  const [videos, setVideos] = useState<HistoryVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [reloading, setReloading] = useState(false)

  const load = useCallback(
    async (silent = false) => {
      if (silent) setReloading(true)
      try {
        const res = await fetch(`/api/videos/history?tool=${tool}`)
        const json = await res.json()
        if (res.ok && Array.isArray(json.videos)) setVideos(json.videos)
      } catch {
        // historique optionnel : on n'interrompt pas la page en cas d'erreur
      } finally {
        setLoading(false)
        setReloading(false)
      }
    },
    [tool],
  )

  useEffect(() => {
    load()
  }, [load])

  // Rechargement déclenché par la page parente (nouvelle vidéo terminée).
  useEffect(() => {
    if (refreshKey > 0) load(true)
  }, [refreshKey, load])

  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return ""
    }
  }

  return (
    <section aria-labelledby="mes-videos-title" className="mt-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2
          id="mes-videos-title"
          className="inline-flex items-center gap-2 text-lg font-bold text-white"
        >
          <History className="h-5 w-5 text-[#c6f542]" />
          Mes vidéos
        </h2>
        <button
          type="button"
          onClick={() => load(true)}
          disabled={reloading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20 disabled:opacity-50"
        >
          {reloading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Actualiser
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] py-14">
          <Loader2 className="h-6 w-6 animate-spin text-[#c6f542]" />
        </div>
      ) : videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] py-14 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/5">
            <Play className="h-6 w-6 text-white/30" />
          </div>
          <p className="text-sm text-white/50">Tes vidéos générées apparaîtront ici</p>
          <p className="mt-1 text-xs text-white/30">
            Elles restent accessibles en permanence sur ton compte
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {videos.map((v) => (
            <div
              key={v.id}
              className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]"
            >
              <div className="relative aspect-[9/16] w-full bg-black/40">
                {v.status === "completed" && v.video_url ? (
                  <video
                    src={v.video_url}
                    controls
                    playsInline
                    preload="metadata"
                    poster={v.thumbnail_url || undefined}
                    className="h-full w-full object-cover"
                  />
                ) : v.status === "failed" ? (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-center">
                    <X className="h-6 w-6 text-red-400" />
                    <span className="px-2 text-[11px] text-red-400">Échec</span>
                  </div>
                ) : v.status === "completed" && !v.video_url ? (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-2 text-center">
                    <X className="h-5 w-5 text-white/30" />
                    <span className="text-[10px] text-white/40">Vidéo expirée</span>
                  </div>
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-[#c6f542]" />
                    <span className="px-2 text-[11px] text-white/50">Génération...</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 p-2">
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-medium text-white/80" title={v.title}>
                    {v.title || "Vidéo"}
                  </p>
                  <p className="text-[10px] text-white/40">{fmtDate(v.created_at)}</p>
                </div>
                {v.status === "completed" && v.video_url && (
                  <a
                    href={v.video_url}
                    download
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-white/20"
                    aria-label={`Télécharger ${v.title}`}
                  >
                    <Download className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
