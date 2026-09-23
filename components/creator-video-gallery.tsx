"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowRight, Play } from "lucide-react"

const CREATOR_VIDEOS = [
  { src: "/showcase/chapcam-en-action.mp4", title: "ChapCam en action", views: "1,2M vues", accent: "from-cyan-400/70" },
  { src: "/videos/motion-control-demo.mp4", title: "Motion Control", views: "842K vues", accent: "from-violet-400/70" },
  { src: "/swap/live-swap-demo.mp4", title: "Live Swap", views: "2,1M vues", accent: "from-blue-400/70" },
  { src: "/videos/genjutsu-demo.mov", title: "Genjutsu", views: "1,4M vues", accent: "from-fuchsia-400/70" },
  { src: "/videos/chapcam-demo.mp4", title: "Studio ChapCam", views: "980K vues", accent: "from-cyan-300/70" },
  { src: "/videos/chapcam-3-topup.mov", title: "Création IA", views: "1,6M vues", accent: "from-indigo-400/70" },
]

function CreatorVideoCard({ video }: { video: (typeof CREATOR_VIDEOS)[number] }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "160px" })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const element = ref.current
    if (!element) return
    if (visible) void element.play().catch(() => {})
    else element.pause()
  }, [visible])

  return (
    <article className="group relative min-w-[300px] snap-start overflow-hidden rounded-2xl border border-white/10 bg-[#0b1222] shadow-[0_20px_50px_-28px_rgba(59,130,246,0.8)] transition duration-300 hover:-translate-y-1 hover:border-cyan-300/30 lg:min-w-[330px]">
      <div className="relative aspect-[4/3] overflow-hidden">
        <video ref={ref} src={visible ? video.src : undefined} muted loop playsInline preload="none" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" aria-label={video.title} />
        <div className={`absolute inset-0 bg-gradient-to-t ${video.accent} via-transparent to-transparent opacity-40`} />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/35 px-2.5 py-1 text-[10px] font-semibold text-white/85 backdrop-blur-md"><Play className="h-3 w-3 fill-current" /> {video.views}</span>
      </div>
      <div className="flex items-center justify-between gap-3 px-4 py-3.5"><h3 className="text-sm font-semibold text-white">{video.title}</h3><span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.9)]" /></div>
    </article>
  )
}

export function CreatorVideoGallery() {
  return (
    <section className="hidden overflow-hidden px-6 py-20 lg:block">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-end justify-between gap-6">
          <div><p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Communauté ChapCam</p><h2 className="text-4xl font-black tracking-tight text-white">Créé par une communauté qui bouge.</h2><p className="mt-2 text-sm text-slate-400">Des idées, des visages et des histoires en mouvement.</p></div>
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 transition hover:text-white">Voir la communauté <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="-mx-6 flex snap-x gap-4 overflow-x-auto px-6 pb-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CREATOR_VIDEOS.map((video) => <CreatorVideoCard key={video.src} video={video} />)}
        </div>
      </div>
    </section>
  )
}
