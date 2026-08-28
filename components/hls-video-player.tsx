"use client"

import { useEffect, useRef, useState } from "react"

// Lecteur vidéo HLS signé (Cloudflare Stream), rendu dans un <video> NATIF.
//
// Pourquoi pas l'iframe cloudflarestream.com : l'iframe tierce est très souvent
// bloquée par les bloqueurs de pub, l'anti-pistage du navigateur ou le blocage
// des cookies tiers -> message « Ce contenu est bloqué ». Un <video> servi
// depuis notre propre page (même si les segments viennent du CDN Cloudflare)
// n'est pas une iframe tierce : rien à bloquer.
//
// Lecture :
//  - Safari / iOS : HLS lu NATIVEMENT (video.src = manifest.m3u8).
//  - Chrome / Firefox / Edge : hls.js (import dynamique côté client).
// Le jeton signé est dans le chemin de l'URL du manifeste, donc les
// sous-manifestes et segments (URLs relatives) héritent du jeton.

export function HlsVideoPlayer({
  src,
  poster,
  className,
}: {
  src: string
  poster?: string | null
  className?: string
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let hls: import("hls.js").default | null = null
    let cancelled = false

    // 1) Support HLS natif (Safari desktop, iOS, certains Android) : le plus fiable.
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src
      video.play().catch(() => {})
      return
    }

    // 2) Sinon hls.js (Chrome, Firefox, Edge).
    import("hls.js")
      .then(({ default: Hls }) => {
        if (cancelled) return
        if (Hls.isSupported()) {
          hls = new Hls({ enableWorker: true, lowLatencyMode: false })
          hls.loadSource(src)
          hls.attachMedia(video)
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            video.play().catch(() => {})
          })
          hls.on(Hls.Events.ERROR, (_evt, data) => {
            if (data.fatal) setFailed(true)
          })
        } else {
          // Dernier recours : tenter la lecture directe.
          video.src = src
          video.play().catch(() => setFailed(true))
        }
      })
      .catch(() => setFailed(true))

    return () => {
      cancelled = true
      if (hls) hls.destroy()
    }
  }, [src])

  if (failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black/60 p-4 text-center text-xs text-white/70">
        Lecture impossible pour le moment. Réessaie plus tard ou télécharge la vidéo.
      </div>
    )
  }

  return (
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <video
      ref={videoRef}
      poster={poster || undefined}
      controls
      playsInline
      autoPlay
      preload="metadata"
      className={className}
    />
  )
}
