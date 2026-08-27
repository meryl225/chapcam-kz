"use client"

import { useCallback, useEffect, useState } from "react"
import { Download, History, Loader2, Play, RefreshCw, Trash2, X } from "lucide-react"
import { downloadVideo } from "@/lib/download-video"

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
  // Player Cloudflare Stream signé (iframe HLS adaptatif) : lecture rapide,
  // fluide sur mobile/3G, compatible iOS. Absent si la vidéo n'est pas encore
  // dans Stream (on retombe alors sur video_url).
  player_url: string | null
  // Master Blob privé (/api/videos/file?...) : téléchargement + repli de lecture.
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
  // id de la vidéo en cours de téléchargement / suppression (pour l'état des boutons)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  // id de la vidéo dont le player Stream est monté (lecture à la demande : on ne
  // charge pas 50 players d'un coup, on ne monte l'iframe qu'au clic).
  const [playingId, setPlayingId] = useState<string | null>(null)

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

  // Enregistrement fiable (mobile + ordinateur) via le helper partagé :
  // l'attribut `download` seul est souvent ignoré sur iOS/Android.
  const handleDownload = useCallback(async (v: HistoryVideo) => {
    if (!v.video_url) return
    setDownloadingId(v.id)
    try {
      await downloadVideo(v.video_url, `chapcam-${v.tool}-${v.id.slice(0, 8)}.mp4`)
    } finally {
      setDownloadingId(null)
    }
  }, [])

  // Suppression définitive (fichier Blob + entrée d'historique) après confirmation.
  const handleDelete = useCallback(async (v: HistoryVideo) => {
    const ok = window.confirm(
      "Supprimer définitivement cette vidéo ? Cette action est irréversible.",
    )
    if (!ok) return
    setDeletingId(v.id)
    // Retrait optimiste de la liste.
    const prev = videos
    setVideos((list) => list.filter((x) => x.id !== v.id))
    try {
      const res = await fetch("/api/videos/history", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: v.id }),
      })
      if (!res.ok) throw new Error("delete failed")
    } catch {
      // En cas d'échec, on restaure la liste.
      setVideos(prev)
    } finally {
      setDeletingId(null)
    }
  }, [videos])

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
                {v.status === "completed" && (v.player_url || v.video_url) ? (
                  playingId === v.id && v.player_url ? (
                    // Player Cloudflare Stream (HLS adaptatif, iOS natif).
                    <iframe
                      src={`${v.player_url}&autoplay=true`}
                      title={v.title || "Vidéo"}
                      loading="lazy"
                      allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                      allowFullScreen
                      className="h-full w-full border-0"
                    />
                  ) : v.player_url ? (
                    // Miniature + bouton lecture : on ne monte l'iframe qu'au clic.
                    <button
                      type="button"
                      onClick={() => setPlayingId(v.id)}
                      className="group relative h-full w-full"
                      aria-label={`Lire ${v.title || "la vidéo"}`}
                    >
                      {/* Fond neutre toujours present : si la miniature echoue a
                          charger, on masque l'<img> (onError) et ce fond reste
                          visible sous le bouton lecture -> jamais d'icone "fichier
                          casse". */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] to-black/40" />
                      {v.thumbnail_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={v.thumbnail_url || "/placeholder.svg"}
                          alt=""
                          loading="lazy"
                          className="relative h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none"
                          }}
                        />
                      ) : null}
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm transition-transform group-hover:scale-110">
                          <Play className="h-6 w-6 translate-x-0.5 fill-white text-white" />
                        </span>
                      </span>
                    </button>
                  ) : (
                    // Repli : master Blob (lecture native) si pas encore dans Stream.
                    <video
                      src={v.video_url as string}
                      controls
                      playsInline
                      preload="metadata"
                      poster={v.thumbnail_url || undefined}
                      className="h-full w-full object-cover"
                    />
                  )
                ) : v.status === "failed" ? (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-center">
                    <X className="h-6 w-6 text-red-400" />
                    <span className="px-2 text-[11px] text-red-400">Échec</span>
                  </div>
                ) : v.status === "completed" && !v.player_url && !v.video_url ? (
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
                <div className="flex shrink-0 items-center gap-1">
                  {v.status === "completed" && v.video_url && (
                    <button
                      type="button"
                      onClick={() => handleDownload(v)}
                      disabled={downloadingId === v.id}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#c6f542] px-2 py-1 text-[11px] font-semibold text-black transition-colors hover:bg-[#b3e02e] disabled:opacity-60"
                      aria-label={`Enregistrer ${v.title}`}
                      title="Enregistrer sur mon appareil"
                    >
                      {downloadingId === v.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Download className="h-3 w-3" />
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(v)}
                    disabled={deletingId === v.id}
                    className="inline-flex items-center rounded-lg bg-white/10 px-2 py-1 text-white/70 transition-colors hover:bg-red-500/20 hover:text-red-400 disabled:opacity-60"
                    aria-label={`Supprimer ${v.title}`}
                    title="Supprimer cette vidéo"
                  >
                    {deletingId === v.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
