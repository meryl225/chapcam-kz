"use client"

import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Play, Check, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StreamStudio } from "@/components/stream-studio"
import { motion } from "framer-motion"

const FLAGS = [
  { src: "/images/flag-cote-divoire.png", alt: "Cote d'Ivoire" },
  { src: "/images/flag-benin.png", alt: "Benin" },
  { src: "/images/flag-togo.png", alt: "Togo" },
  { src: "/images/flag-cameroun.png", alt: "Cameroun" },
]

const BADGES = ["Temps réel", "30 FPS fluide", "Ultra HD 4K", "Faible latence", "Sécurisé"]

const PLATFORMS = [
  { name: "WhatsApp", color: "#25D366" },
  { name: "Discord", color: "#5865F2" },
  { name: "Twitch", color: "#9146FF" },
  { name: "TikTok Live", color: "#ffffff" },
  { name: "YouTube", color: "#ff4d4d" },
  { name: "OBS", color: "#a78bfa" },
  { name: "Zoom", color: "#2D8CFF" },
]

export function HeroSection() {
  return (
    <section className="relative min-h-screen overflow-hidden px-6 pt-28 pb-20">
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

      <div className="relative mx-auto grid min-h-[calc(100vh-12rem)] max-w-7xl items-center gap-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.12fr)] lg:gap-8">
        {/* ===== Colonne copy ===== */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="order-2 flex flex-col gap-6 lg:order-1"
        >
          {/* Eyebrow */}
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-widest text-gray-300 backdrop-blur-sm">
            <TrendingUp className="h-3.5 w-3.5 text-[#00d4ff]" />
            N°1 des outils de transformation en direct
          </span>

          {/* Titre */}
          <h1 className="text-balance text-5xl font-black leading-[0.95] tracking-tight text-white sm:text-6xl xl:text-7xl">
            La caméra IA
            <br />
            des{" "}
            <span className="bg-gradient-to-r from-[#00d4ff] to-[#8b5cf6] bg-clip-text text-transparent">
              créateurs
            </span>
            <br />
            &amp;{" "}
            <span className="bg-gradient-to-r from-[#8b5cf6] to-[#e91e8c] bg-clip-text text-transparent">
              gamers.
            </span>
          </h1>

          {/* Sous-titre */}
          <p className="max-w-xl text-pretty text-lg leading-relaxed text-gray-400">
            Change de visage et de corps en temps réel pour tes streams, vidéos, appels et réseaux
            sociaux. Garde tes mouvements. Reste toi, deviens quelqu&apos;un d&apos;autre.
          </p>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            {BADGES.map((b) => (
              <span
                key={b}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-300"
              >
                <Check className="h-3.5 w-3.5 text-[#00ff88]" />
                {b}
              </span>
            ))}
          </div>

          {/* CTA */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link href="/auth/sign-up">
              <Button className="group h-14 rounded-2xl bg-gradient-to-r from-[#00d4ff] to-[#8b5cf6] px-8 text-base font-bold text-white transition-all hover:brightness-110 hover:shadow-[0_0_40px_rgba(0,212,255,0.4)]">
                Commencer gratuitement
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link href="#in-action">
              <Button
                variant="outline"
                className="h-14 rounded-2xl border-white/15 bg-white/5 px-6 text-base font-semibold text-white hover:bg-white/10"
              >
                <span className="mr-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/10">
                  <Play className="h-3.5 w-3.5 fill-current" />
                </span>
                Voir la démo
              </Button>
            </Link>
          </div>

          {/* Fonctionne avec */}
          <div className="pt-2">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Fonctionne avec
            </p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
              {PLATFORMS.map((p) => (
                <span
                  key={p.name}
                  className="text-sm font-bold tracking-tight transition-opacity hover:opacity-100"
                  style={{ color: p.color, opacity: 0.75 }}
                >
                  {p.name}
                </span>
              ))}
            </div>
          </div>

          {/* Disponibilite (drapeaux) */}
          <div className="flex items-center gap-2 pt-1 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2 py-1">
              {FLAGS.map((f) => (
                <Image
                  key={f.alt}
                  src={f.src || "/placeholder.svg"}
                  alt={`Drapeau ${f.alt}`}
                  width={20}
                  height={14}
                  style={{ height: "auto" }}
                  className="w-5 rounded-[3px] object-cover ring-1 ring-white/15"
                />
              ))}
            </span>
            Disponible en Afrique de l&apos;Ouest &amp; Centrale
          </div>
        </motion.div>

        {/* ===== Colonne studio ===== */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="order-1 flex justify-center lg:order-2 lg:justify-end"
        >
          <StreamStudio />
        </motion.div>
      </div>
    </section>
  )
}
