"use client"

import Link from "next/link"
import { ArrowRight, Check, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { useT } from "@/lib/i18n/language-provider"

const creatorVideos = [
  { src: "/videos/motion-control-demo.mp4", label: "Motion Control", position: "-left-5 top-16 w-36" },
  { src: "/swap/live-swap-demo.mp4", label: "Live Swap", position: "-right-4 top-5 w-40" },
  { src: "/videos/genjutsu-demo.mov", label: "Genjutsu", position: "-left-8 bottom-8 w-40" },
  { src: "/showcase/chapcam-en-action.mp4", label: "Créateurs ChapCam", position: "-right-8 bottom-16 w-36" },
]

export function HeroSection() {
  const t = useT()

  return (
    <section className="relative overflow-hidden px-6 pb-8 pt-28">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(37,99,235,0.22),transparent_42%),radial-gradient(ellipse_at_80%_65%,rgba(124,58,237,0.2),transparent_35%)]" />
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-24 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-cyan-400/[0.06] blur-[110px]" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 text-left lg:grid-cols-[0.82fr_1.18fr] lg:gap-6">
        <motion.div initial={false} className="relative z-20 max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/[0.08] px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200 shadow-[0_0_28px_-8px_rgba(34,211,238,0.8)]">
            <Sparkles className="h-3.5 w-3.5" />
            {t("La création IA, sans limites")}
          </span>
          <h1 className="mt-6 max-w-xl text-balance text-5xl font-black leading-[0.94] tracking-[-0.05em] text-white sm:text-6xl lg:text-7xl">
            {t("Crée sans")}
            <br />{" "}
            <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-violet-400 bg-clip-text text-transparent">{t("limites.")}</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-7 text-slate-300 sm:text-lg">
            {t("Transforme ton apparence, tes photos et ta voix avec les outils IA créatifs de ChapCam.")}
          </p>
          <Link href="/auth/sign-up" className="mt-7 inline-flex">
            <Button className="group h-12 rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-600 px-7 text-sm font-bold text-white shadow-[0_18px_42px_-14px_rgba(59,130,246,0.9)] transition hover:-translate-y-0.5 hover:brightness-110">
              {t("Commencer gratuitement")}
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </motion.div>

        <div className="relative mx-auto mt-12 h-[500px] w-full max-w-3xl lg:mt-0">
          <div aria-hidden className="absolute left-1/2 top-1/2 h-80 w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/25 blur-[100px]" />
          {creatorVideos.map((video) => (
            <div key={video.label} className={`absolute z-20 hidden overflow-hidden rounded-2xl border border-cyan-200/20 bg-[#0b1224]/90 p-1.5 shadow-[0_20px_50px_-18px_rgba(34,211,238,0.75)] backdrop-blur-md lg:block ${video.position}`}>
              <video src={video.src} autoPlay muted loop playsInline preload="metadata" className="h-28 w-full rounded-xl object-cover" aria-label={video.label} />
              <div className="flex items-center justify-between gap-3 px-2 py-1.5 text-[10px] font-semibold text-white/80"><span className="truncate">{video.label}</span><span className="flex items-center gap-1 text-cyan-200"><span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />Live</span></div>
            </div>
          ))}
          <div className="absolute left-1/2 top-1/2 z-10 w-[82%] -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border border-white/15 bg-[#0a1224]/80 p-2 shadow-[0_35px_90px_-28px_rgba(37,99,235,0.85),0_0_80px_-35px_rgba(168,85,247,0.95)] backdrop-blur-xl">
            <div className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#050b16]">
              <video src="/videos/chapcam-demo.mp4" autoPlay muted loop playsInline preload="metadata" className="aspect-video w-full object-cover" aria-label="Démonstration ChapCam" />
              <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/15 bg-black/45 px-3 py-1.5 text-[10px] font-semibold text-white/85 backdrop-blur-md"><span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.9)]" />Créateurs ChapCam</div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-300/75 lg:col-span-2">
          <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-cyan-300" />Sans carte bancaire</span>
          <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-cyan-300" />Accès immédiat</span>
          <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-cyan-300" />Outils IA créatifs</span>
        </div>
      </div>
    </section>
  )
}
