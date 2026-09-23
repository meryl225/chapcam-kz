"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ChevronRight, Play } from "lucide-react"

type CommunityVideo = {
  id: string
  src?: string
  category?: string
  views?: string
}

export const communityVideos: CommunityVideo[] = [
  { id: "community-01", src: "/community/IMG_5979.mp4", category: "Vidéos IA" },
  { id: "community-02", src: "/community/IMG_5981.mov", category: "Motion" },
  { id: "community-03", src: "/community/IMG_5982.mov", category: "Live Swap" },
  { id: "community-04", src: "/community/IMG_5983.mov", category: "Vidéos IA" },
  { id: "community-05", src: "/community/IMG_5980.mov", category: "Avant / Après" },
]

const filters = ["Pour toi", "Tendances", "Avant / Après", "Live Swap", "Motion", "Vidéos IA"]

function CommunityVideoCard({ video }: { video: CommunityVideo }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "120px" })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const element = ref.current
    if (!element || !video.src) return
    if (visible) void element.play().catch(() => undefined)
    else element.pause()
  }, [visible, video.src])

  return (
    <article className="group relative min-w-[280px] snap-start overflow-hidden rounded-[18px] border border-[#dbe9f4] bg-white shadow-[0_16px_34px_-24px_rgba(28,77,130,.55)] lg:min-w-0 lg:flex-[0_0_calc((100%-64px)/5)]">
      <div className="relative aspect-[4/3] overflow-hidden bg-[#eaf4fb]">
        {video.src ? <video ref={ref} src={visible ? video.src : undefined} muted loop playsInline preload="none" controls={false} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" aria-label={video.category ? `Création ChapCam ${video.category}` : "Création de la communauté ChapCam"} /> : <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(145deg,#eef8fd,#e4ecff)]"><span className="flex h-11 w-11 items-center justify-center rounded-full border border-[#c5dbea] bg-white/70 text-[#7f9ab6]"><Play className="h-4 w-4" /></span></div>}
        {video.category ? <span className="absolute bottom-3 left-3 rounded-full bg-[#071a42]/72 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">{video.category}</span> : null}
        {video.views ? <span className="absolute bottom-3 right-3 rounded-full bg-[#071a42]/72 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">{video.views}</span> : null}
      </div>
    </article>
  )
}

export function HomeCommunityShowcase() {
  return (
    <section aria-labelledby="community-title" className="hidden pt-20 lg:block">
      <div className="mb-5 flex items-end justify-between gap-6">
        <h2 id="community-title" className="text-3xl font-bold tracking-[-.04em] !text-[#071a42]">Créations de la communauté</h2>
        <Link href="/dashboard" className="flex items-center gap-1 text-sm font-semibold text-[#148ee0]">Voir plus <ChevronRight className="h-4 w-4" /></Link>
      </div>
      <div className="mb-6 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{filters.map((filter, index) => <button key={filter} type="button" className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-semibold ${index === 0 ? "border-[#079ded] bg-white text-[#079ded]" : "border-[#dbe9f4] bg-white/55 text-[#667a98]"}`}>{filter}</button>)}</div>
      <div className="-mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{communityVideos.map((video) => <CommunityVideoCard key={video.id} video={video} />)}</div>
    </section>
  )
}
