"use client"

import { useEffect, useRef, useState } from "react"
import { Play } from "lucide-react"

type CreatorVideo = {
  id: string
  src?: string
  label?: string
  views?: string
}

export const creatorVideos: CreatorVideo[] = Array.from({ length: 12 }, (_, index) => ({
  id: `creator-video-${index + 1}`,
}))

function CreatorVideoCard({ video }: { video: CreatorVideo }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const element = videoRef.current
    if (!element) return
    const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), { rootMargin: "120px" })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const element = videoRef.current
    if (!element || !video.src) return
    if (isVisible) void element.play().catch(() => undefined)
    else element.pause()
  }, [isVisible, video.src])

  return (
    <article className="group relative min-w-[156px] snap-start overflow-hidden rounded-[18px] border border-[#d9e8f5] bg-[#eaf4fb] shadow-[0_12px_28px_-20px_rgba(30,83,132,.55)] lg:min-w-0 lg:w-[calc((100%-80px)/6)] lg:flex-[0_0_calc((100%-80px)/6)]">
      <div className="relative aspect-[9/16] overflow-hidden bg-[linear-gradient(145deg,#e9f5fb,#dcecff)]">
        {video.src ? (
          <video ref={videoRef} src={video.src} autoPlay={isVisible} muted loop playsInline preload="none" controls={false} className="absolute inset-0 h-full w-full object-cover" aria-label={video.label ?? "Vidéo créateur ChapCam"} />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center text-[#8aa1b9]">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#b9d3e7] bg-white/60"><Play className="h-4 w-4" /></span>
            <span className="px-4 text-[10px] font-semibold uppercase tracking-[.14em]">Vidéo créateur</span>
          </div>
        )}
        {video.views ? <span className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-[#071a42]/70 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm"><Play className="h-2.5 w-2.5 fill-current" />{video.views}</span> : null}
      </div>
    </article>
  )
}

export function CreatorVideoStrip() {
  return (
    <section aria-label="Vidéos de créateurs ChapCam" className="hidden border-b border-[#dcebf6] pb-7 pt-5 lg:block">
      <div className="-mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {creatorVideos.map((video) => <CreatorVideoCard key={video.id} video={video} />)}
      </div>
    </section>
  )
}
