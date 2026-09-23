"use client"

import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Check, TrendingUp, Star, Zap, Gauge, Sparkles, Timer, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StreamStudio } from "@/components/stream-studio"
import { MonitorFrame } from "@/components/monitor-frame"
import { PhoneMockup } from "@/components/phone-mockup"
import { motion } from "framer-motion"
import { useT } from "@/lib/i18n/language-provider"

const FLAGS = [
  { src: "/images/flag-cote-divoire.png", alt: "Cote d'Ivoire" },
  { src: "/images/flag-benin.png", alt: "Benin" },
  { src: "/images/flag-togo.png", alt: "Togo" },
  { src: "/images/flag-cameroun.png", alt: "Cameroun" },
]

const BADGES = [
  { label: "Temps réel", icon: Zap, color: "#00d4ff" },
  { label: "30 FPS fluide", icon: Gauge, color: "#00ff88" },
  { label: "Ultra HD 4K", icon: Sparkles, color: "#8b5cf6" },
  { label: "Faible latence", icon: Timer, color: "#f59e0b" },
  { label: "Sécurisé", icon: ShieldCheck, color: "#22c55e" },
]

const PLATFORMS = [
  { name: "WhatsApp", color: "#25D366", logo: "/logos/whatsapp.svg" },
  { name: "Discord", color: "#5865F2", logo: "/logos/discord.svg" },
  { name: "Twitch", color: "#9146FF", logo: "/logos/twitch.svg" },
  { name: "TikTok Live", color: "#ffffff", logo: "/logos/tiktok.svg" },
  { name: "YouTube", color: "#ff4d4d", logo: "/logos/youtube.svg" },
  { name: "OBS", color: "#a78bfa", logo: "/logos/obs.svg" },
  { name: "Zoom", color: "#2D8CFF", logo: "/logos/zoom.svg" },
]

export function HeroSection() {
  const t = useT()

  return (
    <section className="relative min-h-[calc(100vh-4rem)] overflow-hidden px-6 pb-16 pt-28">
      {/* Grille de fond subtile */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 35%, black, transparent)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 35%, black, transparent)",
        }}
      />

      <div className="relative mx-auto grid min-h-[calc(100vh-10rem)] max-w-7xl items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-10">
        {/* ===== Colonne copy ===== */}
        <motion.div
          initial={false}
          className="order-2 flex flex-col gap-6 lg:order-1"
        >
          {/* Eyebrow */}
          <span className="group inline-flex w-fit items-center gap-2 rounded-full border border-[#00d4ff]/50 bg-gradient-to-r from-[#00d4ff]/20 via-[#8b5cf6]/20 to-[#00d4ff]/20 px-4 py-2 text-xs font-extrabold uppercase tracking-widest text-white shadow-[0_0_24px_-4px_rgba(0,212,255,0.6)] backdrop-blur-md transition-all duration-300 hover:border-[#00d4ff] hover:shadow-[0_0_32px_-2px_rgba(0,212,255,0.85)] sm:text-sm">
            <TrendingUp className="h-4 w-4 text-[#00d4ff] transition-transform duration-300 group-hover:scale-110" />
            {t("PLUS QU'UNE APP. UNE NOUVELLE RÉALITÉ.")}
          </span>

          {/* Titre */}
          <h1 className="text-balance text-5xl font-black leading-[0.95] tracking-tight text-white sm:text-6xl xl:text-7xl">
{t("Transforme")}
            <br />
            {t("ton apparence")}
            <br />
            <span className="bg-gradient-to-r from-[#22d3ee] via-[#3b82f6] to-[#a855f7] bg-clip-text text-transparent">
              {t("avec l’IA.")}
            </span>

          </h1>

          {/* Sous-titre */}
          <p className="max-w-xl text-pretty text-lg leading-relaxed text-gray-400">
            {t(
              "Change de visage, anime tes photos et crée des vidéos incroyables en quelques secondes. Donne vie à toutes tes idées, simplement.",
            )}
          </p>

        {/* Preuves de confiance */}
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-300/80">
          {["Sans carte bancaire", "Accès immédiat", "Utilisé par +2,5M de créateurs"].map((label) => (
            <span key={label} className="inline-flex items-center gap-2">
              <Check className="h-4 w-4 text-cyan-300" />{t(label)}
            </span>
          ))}
        </div>
        {false && <div className="flex flex-wrap gap-2.5">
          {BADGES.map((b) => {
            const Icon = b.icon
            return (
              <span
                key={b.label}
                style={{ ["--accent" as string]: b.color }}
                className="group/badge inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-1.5 pl-1.5 pr-3.5 text-xs font-semibold text-gray-200 backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--accent)]/50 hover:bg-white/[0.07] hover:text-white hover:shadow-[0_8px_24px_-8px_var(--accent)]"
              >
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full transition-transform duration-300 group-hover/badge:scale-110"
                  style={{ backgroundColor: `${b.color}1f`, color: b.color }}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                {t(b.label)}
                <Check className="h-3.5 w-3.5 text-[#00ff88] opacity-80" />
              </span>
            )
          })}
        </div>}

          {/* CTA */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link href="/auth/sign-up">
              <Button className="group h-12 rounded-xl bg-gradient-to-r from-[#14b8f4] to-[#7c3aed] px-7 text-sm font-bold text-white shadow-[0_14px_34px_-14px_rgba(59,130,246,0.8)] transition-all hover:brightness-110 hover:shadow-[0_0_34px_rgba(0,212,255,0.35)]">
                {t("Commencer gratuitement")}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link href="#outils" className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-5 text-sm font-semibold text-white/85 transition hover:border-white/30 hover:bg-white/[0.08]">
              {t("Voir la démo")}
            </Link>
          </div>

          {/* Preuve sociale */}
          <div className="flex items-center gap-3 pt-1">
            <div className="flex -space-x-3">
              {["a3", "a2", "a6", "a1", "a5"].map((a) => (
                <Image
                  key={a}
                  src={`/images/hero/avatars/${a}.png`}
                  alt="Créateur inscrit"
                  width={36}
                  height={36}
                  quality={70}
                  className="h-9 w-9 rounded-full border-2 border-[#0a0e1a] object-cover"
                />
              ))}
            </div>
            <div>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-[#facc15] text-[#facc15]" />
                ))}
              </div>
              <p className="text-sm text-gray-400">
                <span className="font-bold text-white">{t("+25 000 créateurs")}</span> {t("déjà inscrits")}
              </p>
            </div>
          </div>

          {/* Fonctionne avec */}
          <div className="pt-2">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              {t("Fonctionne avec")}
            </p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
              {PLATFORMS.map((p) => (
                <span
                  key={p.name}
                  className="group inline-flex cursor-default items-center gap-2 text-sm font-bold tracking-tight opacity-80 transition-all duration-300 hover:-translate-y-0.5 hover:opacity-100"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.logo || "/placeholder.svg"}
                    alt={`Logo ${p.name}`}
                    width={20}
                    height={20}
                    loading="lazy"
                    className="h-5 w-5 object-contain transition-transform duration-300 group-hover:scale-110"
                  />
                  <span
                    className="transition-[text-shadow] duration-300 group-hover:[text-shadow:0_0_16px_currentColor]"
                    style={{ color: p.color }}
                  >
                    {p.name}
                  </span>
                </span>
              ))}
            </div>
          </div>

          {/* Disponibilite (drapeaux) */}
          <div className="flex items-center gap-2 pt-1 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2 py-1 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.5)] backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:bg-white/[0.08]">
              {FLAGS.map((f) => (
                <Image
                  key={f.alt}
                  src={f.src || "/placeholder.svg"}
                  alt={`Drapeau ${f.alt}`}
                  width={20}
                  height={14}
                  className="h-3.5 w-5 rounded-[3px] object-cover ring-1 ring-white/15 transition-transform duration-300 hover:z-10 hover:scale-125"
                />
              ))}
            </span>
            {t("Disponible en Afrique de l'Ouest & Centrale")}
          </div>
        </motion.div>

        {/* ===== Colonne studio ===== */}
        <motion.div
          initial={false}
          className="order-1 flex flex-col items-center gap-6 lg:order-2 lg:items-end"
        >
          {/* Ordinateur + smartphone : le telephone se superpose en bas a
              droite du moniteur sur desktop, et passe sous le moniteur (centre)
              sur mobile pour eviter tout debordement horizontal. */}
          <div className="relative w-full">
            <MonitorFrame>
              <StreamStudio />
            </MonitorFrame>

            <div className="mx-auto mt-8 w-[165px] sm:w-[175px] lg:absolute lg:-bottom-5 lg:right-0 lg:z-20 lg:mt-0 lg:w-[178px] xl:-right-2 xl:w-[190px]">
              <PhoneMockup />
            </div>
          </div>

          {/* Bannière partenaire ChapSim */}
          <motion.a
            href="https://chapsim.app/"
            target="_blank"
            rel="noopener noreferrer"
            initial={false}
            className="group relative block w-full max-w-xs overflow-hidden rounded-2xl border border-white/10 bg-[#0b1020] shadow-[0_20px_60px_-20px_rgba(99,102,241,0.5)] transition-all duration-300 hover:-translate-y-1 hover:border-[#6366f1]/50 hover:shadow-[0_28px_70px_-20px_rgba(99,102,241,0.7)]"
          >
            <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/80 backdrop-blur-sm">
              <Sparkles className="h-3 w-3 text-[#8b5cf6]" />
              {t("Partenaire")}
            </span>
            <Image
              src="/chapsim/banner.png"
              alt="ChapSim - Numéros virtuels, SMS OTP et proxies premium"
              width={1024}
              height={500}
              sizes="(max-width: 640px) 90vw, 320px"
              className="h-auto w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            />
            <div className="flex items-center justify-between gap-3 border-t border-white/10 bg-[#0b1020]/90 px-4 py-3 backdrop-blur-sm">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">ChapSim</p>
                <p className="truncate text-xs text-gray-400">{t("Numéros virtuels, SMS OTP & proxies premium")}</p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] px-4 py-2 text-sm font-semibold text-white shadow-[0_0_20px_-4px_rgba(139,92,246,0.7)] transition-all duration-300 group-hover:brightness-110">
                {t("Obtenir")}
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </span>
            </div>
          </motion.a>
        </motion.div>
      </div>

    </section>
  )
}
