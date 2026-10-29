"use client"

import { motion } from "framer-motion"
import { Sparkles, User, Hand, Zap, Video, DropletOff, Smartphone, Monitor, Laptop } from "lucide-react"
import { useT } from "@/lib/i18n/language-provider"

const FEATURES = [
  { icon: Sparkles, label: "Rendu humain ultra-réaliste" },
  { icon: User, label: "Transformation visage & corps entier" },
  { icon: Hand, label: "Peut tenir et manipuler tout type d'objet en main pendant la transformation" },
  { icon: Zap, label: "Transformation en temps réel" },
  { icon: Video, label: "Une expérience plus fluide et naturelle pour vos lives, appels vidéo et créations" },
  { icon: DropletOff, label: "Sans filigrane" },
] as const

type ChapCam5BannerProps = {
  variant?: "theme" | "dark"
  className?: string
}

export function ChapCam5Banner({ variant = "theme", className = "" }: ChapCam5BannerProps) {
  const t = useT()
  const strong = variant === "dark" ? "text-white" : "text-foreground"
  const muted = variant === "dark" ? "text-gray-300" : "text-muted-foreground"

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      aria-labelledby="chapcam-5-title"
      className={`rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-6 md:p-8 ${className}`}
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
        <div className="flex flex-col gap-3 lg:max-w-sm">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-400">
            <Zap className="h-3.5 w-3.5" aria-hidden="true" />
            {t("Nouveau · Sortie le 29 octobre à 2h05")}
          </span>
          <h3 id="chapcam-5-title" className={`text-balance text-2xl font-bold md:text-3xl ${strong}`}>
            {t("ChapCam 5.0 est disponible")}
          </h3>
          <p className={`text-pretty leading-relaxed ${muted}`}>
            {t("Live Swap nouvelle génération • Rendu humain ultra-réaliste • Visage & corps entier • Temps réel • Sans filigrane")}
          </p>
          <div className={`mt-1 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm ${muted}`}>
            <span className="inline-flex items-center gap-1.5">
              <Smartphone className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              iPhone · Android
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Monitor className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              Windows
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Laptop className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              MacBook
            </span>
          </div>
        </div>

        <ul className="grid flex-1 gap-3 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
              <Icon className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-400" aria-hidden="true" />
              <span className={`text-sm leading-relaxed ${strong}`}>{t(label)}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-6 text-center text-sm font-semibold text-emerald-400 lg:text-left">
        {t("CHAPCAM 5.0 — Transformez-vous. En temps réel.")}
      </p>
    </motion.section>
  )
}
