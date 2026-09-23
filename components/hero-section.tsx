"use client"

import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Check, Globe2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StreamStudio } from "@/components/stream-studio"
import { MonitorFrame } from "@/components/monitor-frame"
import { PhoneMockup } from "@/components/phone-mockup"
import { motion } from "framer-motion"
import { useT } from "@/lib/i18n/language-provider"

const PLATFORMS = [
  { name: "WhatsApp", logo: "/logos/whatsapp.svg" },
  { name: "Discord", logo: "/logos/discord.svg" },
  { name: "Twitch", logo: "/logos/twitch.svg" },
  { name: "TikTok Live", logo: "/logos/tiktok.svg" },
]

const previews = [
  { src: "/images/hero/avatars/a3.png", label: "Live Swap", position: "left-0 top-24" },
  { src: "/images/hero/avatars/a2.png", label: "Photos en vidéo", position: "right-0 top-10" },
  { src: "/images/hero/avatars/a6.png", label: "Motion Control", position: "bottom-10 left-8" },
]

export function HeroSection() {
  const t = useT()

  return (
    <section className="relative overflow-hidden px-6 pb-8 pt-28">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(37,99,235,0.22),transparent_42%),radial-gradient(ellipse_at_80%_65%,rgba(124,58,237,0.2),transparent_35%)]" />
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-24 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-cyan-400/[0.06] blur-[110px]" />

      <div className="relative mx-auto max-w-7xl text-center">
        <motion.div initial={false} className="mx-auto max-w-4xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/[0.08] px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200 shadow-[0_0_28px_-8px_rgba(34,211,238,0.8)]">
            <Sparkles className="h-3.5 w-3.5" />
            {t("La création IA, sans limites")}
          </span>
          <h1 className="mt-6 text-balance text-5xl font-black leading-[0.92] tracking-[-0.05em] text-white sm:text-7xl lg:text-8xl">
            {t("Donne vie")}{" "}
            <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-violet-400 bg-clip-text text-transparent">{t("à tes idées.")}</span>
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

        <div className="relative mx-auto mt-10 max-w-5xl">
          <div aria-hidden className="absolute inset-x-16 top-10 h-72 rounded-full bg-blue-600/20 blur-[90px]" />
          {previews.map((preview) => (
            <div key={preview.label} className={`absolute z-20 hidden w-36 overflow-hidden rounded-xl border border-white/15 bg-[#0b1224]/90 text-left shadow-[0_18px_40px_-18px_rgba(34,211,238,0.7)] backdrop-blur-md sm:block ${preview.position}`}>
              <Image src={preview.src} alt={preview.label} width={144} height={96} className="h-24 w-full object-cover" />
              <div className="flex items-center gap-1.5 px-2.5 py-2 text-[10px] font-semibold text-white/85"><span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_8px_rgba(103,232,249,0.9)]" />{preview.label}</div>
            </div>
          ))}
          <div className="relative z-10 mx-auto w-full max-w-4xl rounded-[1.75rem] border border-white/15 bg-[#0a1224]/80 p-2 shadow-[0_35px_90px_-28px_rgba(37,99,235,0.8),0_0_80px_-35px_rgba(168,85,247,0.9)] backdrop-blur-xl sm:p-3">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#050b16]">
              <MonitorFrame><StreamStudio /></MonitorFrame>
            </div>
            <div className="absolute -bottom-8 right-5 w-28 sm:-bottom-12 sm:right-10 sm:w-40"><PhoneMockup /></div>
          </div>
        </div>

        <div className="mx-auto mt-16 grid max-w-4xl gap-4 border-y border-white/[0.08] bg-white/[0.02] px-4 py-4 text-left sm:grid-cols-3 sm:divide-x sm:divide-white/[0.08]">
          <div className="flex items-center gap-3 sm:px-5 sm:first:pl-0"><Check className="h-4 w-4 text-cyan-300" /><div><p className="text-sm font-semibold text-white">+25 000 créateurs</p><p className="text-xs text-slate-400">déjà inscrits</p></div></div>
          <div className="flex items-center gap-3 sm:px-5"><div className="flex -space-x-1.5">{PLATFORMS.map((platform) => <span key={platform.name} title={platform.name} className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.06]"><img src={platform.logo} alt={platform.name} width={15} height={15} className="h-4 w-4 object-contain" /></span>)}</div><p className="text-xs text-slate-400">Compatible avec tes plateformes</p></div>
          <div className="flex items-center gap-3 sm:px-5 sm:last:pr-0"><span className="flex h-8 w-8 items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-300/10 text-cyan-200"><Globe2 className="h-4 w-4" /></span><p className="text-xs text-slate-400">Disponible en Afrique de l&apos;Ouest &amp; Centrale</p></div>
        </div>
      </div>
    </section>
  )
}
