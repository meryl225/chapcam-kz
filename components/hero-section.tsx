"use client"

import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Zap, Shield, Monitor, MessageCircle, Gamepad2, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StreamStudio } from "@/components/stream-studio"
import { motion } from "framer-motion"

const FLAGS = [
  { src: "/images/flag-cote-divoire.png", alt: "Cote d'Ivoire" },
  { src: "/images/flag-benin.png", alt: "Benin" },
  { src: "/images/flag-togo.png", alt: "Togo" },
  { src: "/images/flag-cameroun.png", alt: "Cameroun" },
]

const PLATFORMS = ["Twitch", "YouTube", "TikTok", "OBS", "Discord", "Zoom"]

const TRUST = [
  { icon: Zap, label: "Temps reel", color: "#fbbf24" },
  { icon: Shield, label: "100% anonyme", color: "#00ff88" },
  { icon: Monitor, label: "1080p / 4K", color: "#00d4ff" },
]

export function HeroSection() {
  return (
    <section className="relative min-h-screen overflow-hidden px-6 pt-28 pb-16">
      {/* Grille de fond subtile */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 40%, black, transparent)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 40%, black, transparent)",
        }}
      />

      <div className="relative mx-auto grid min-h-[calc(100vh-11rem)] max-w-7xl items-center gap-12 lg:grid-cols-2">
        {/* ===== Colonne copy ===== */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="order-2 flex flex-col gap-7 lg:order-1"
        >
          {/* Eyebrow */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary">
              <Gamepad2 className="h-4 w-4" />
              La cam des createurs &amp; streamers
            </span>
            {/* Drapeaux disponibilite */}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
              {FLAGS.map((f) => (
                <Image
                  key={f.alt}
                  src={f.src || "/placeholder.svg"}
                  alt={`Drapeau ${f.alt}`}
                  width={22}
                  height={15}
                  style={{ height: "auto" }}
                  className="w-[22px] rounded-[3px] object-cover ring-1 ring-white/15"
                />
              ))}
            </span>
          </div>

          {/* Titre */}
          <h1 className="text-balance text-5xl font-black leading-[0.98] tracking-tight text-white lg:text-6xl xl:text-7xl">
            Change de visage
            <br />
            et de corps,{" "}
            <span className="bg-gradient-to-r from-[#00ff88] via-[#00d4ff] to-[#8b5cf6] bg-clip-text text-transparent">
              en temps reel.
            </span>
          </h1>

          {/* Sous-titre */}
          <p className="max-w-xl text-pretty text-lg leading-relaxed text-gray-400">
            L&apos;IA qui transforme ton apparence en direct pour tes streams gaming, tes videos
            TikTok &amp; YouTube, tes lives et tes appels. Cree du contenu sans jamais montrer ton
            vrai visage.
          </p>

          {/* Plateformes compatibles */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Compatible</span>
            {PLATFORMS.map((p) => (
              <span
                key={p}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-gray-300"
              >
                {p}
              </span>
            ))}
          </div>

          {/* CTA */}
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/auth/sign-up">
              <Button className="group h-14 rounded-full bg-primary px-8 text-base font-bold text-black transition-all hover:brightness-110 hover:shadow-[0_0_40px_rgba(0,255,136,0.5)]">
                Commencer maintenant
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <a href="https://wa.me/2250555560189" target="_blank" rel="noopener noreferrer">
              <Button
                variant="outline"
                className="h-14 rounded-full border-white/15 bg-white/5 px-6 text-base font-semibold text-white hover:bg-white/10"
              >
                <MessageCircle className="mr-2 h-5 w-5 text-[#25D366]" />
                Parler a un expert
              </Button>
            </a>
          </div>

          {/* Trust row */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-1">
            {TRUST.map((t) => (
              <div key={t.label} className="flex items-center gap-2 text-sm font-medium text-gray-400">
                <t.icon className="h-4 w-4" style={{ color: t.color }} />
                {t.label}
              </div>
            ))}
          </div>

          {/* Lien ChapSim compact */}
          <Link
            href="/chapsim"
            className="group inline-flex w-fit items-center gap-2 rounded-full border border-[#7c3aed]/40 bg-[#7c3aed]/10 px-3 py-1.5 text-xs font-semibold text-[#c4b5fd] transition-all hover:border-[#a78bfa]/70"
          >
            <span className="rounded-full bg-[#7c3aed]/30 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
              Nouveau
            </span>
            ChapSim — numeros virtuels, SMS OTP &amp; proxies
            <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
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
