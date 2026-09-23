"use client"

import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { ArrowRight, Zap, ImageIcon, Film, Languages, ShieldCheck, Mic } from "lucide-react"
import { useEffect, useRef } from "react"
import { useT } from "@/lib/i18n/language-provider"

/**
 * Video de demonstration qui ne se telecharge PAS a l'ouverture de la homepage.
 * - preload="none" : aucun octet de la video n'est charge tant qu'elle n'est
 *   pas proche de l'ecran.
 * - IntersectionObserver : on ne declenche le chargement + la lecture que
 *   lorsqu'elle entre dans le viewport, et on met en pause quand elle en sort.
 * Le rendu visuel est identique (elle joue en boucle, muette, quand visible),
 * mais on evite de telecharger la video avant que l'utilisateur y arrive.
 */
function InViewVideo({ src, label, className }: { src: string; label: string; className?: string }) {
  const ref = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            // Charge puis lance la lecture uniquement une fois visible.
            el.play().catch(() => {})
          } else {
            el.pause()
          }
        }
      },
      { rootMargin: "200px" }, // demarre juste avant l'entree a l'ecran
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <video
      ref={ref}
      src={src}
      muted
      loop
      playsInline
      preload="none"
      aria-label={label}
      className={className}
    />
  )
}

type Tool = {
  title: string
  description: string
  badge: string
  color: string
  icon: React.ElementType
  media: string
  mediaType: "video" | "image"
  href: string
}

const tools: Tool[] = [
  {
    title: "Live Swap",
    description: "Change de visage en temps reel dans tous tes appels et streams, en gardant tes mouvements.",
    badge: "TEMPS REEL",
    color: "#3b82f6",
    icon: Zap,
    media: "/swap/live-swap-demo.mp4",
    mediaType: "video",
    href: "/auth/sign-up",
  },
  {
    title: "Photos en Video",
    description: "Anime n'importe quelle photo et transforme-la en video vivante en quelques secondes.",
    badge: "NOUVEAU",
    color: "#22c55e",
    icon: ImageIcon,
    media: "/swap/poster-photo-video.png",
    mediaType: "image",
    href: "/auth/sign-up",
  },
  {
    title: "Motion Control",
    description: "Donne vie a tes images avec des mouvements de camera realistes et fluides pilotes par l'IA.",
    badge: "NOUVEAU",
    color: "#6366f1",
    icon: Film,
    media: "/swap/poster-motion.png",
    mediaType: "image",
    href: "/auth/sign-up",
  },
  {
    title: "Message Vocal",
    description: "Change ta voix ou genere un message vocal a partir d'un texte, avec des voix ultra realistes.",
    badge: "NOUVEAU",
    color: "#00d4ff",
    icon: Mic,
    media: "/swap/poster-message-vocal.png",
    mediaType: "image",
    href: "/auth/sign-up",
  },
  {
    title: "Traducteur de Video",
    description: "Traduis et double automatiquement tes videos dans plus de 190 langues, avec ta voix.",
    badge: "NOUVEAU",
    color: "#14b8a6",
    icon: Languages,
    media: "/swap/poster-video-translation.png",
    mediaType: "image",
    href: "/auth/sign-up",
  },
  {
    title: "ChapVerify",
    description: "Verifie en un clic si une image, une voix ou une video a ete generee par IA, avec un score de confiance.",
    badge: "ANTI-DEEPFAKE",
    color: "#ef4444",
    icon: ShieldCheck,
    media: "/swap/poster-chapverify.png",
    mediaType: "image",
    href: "/auth/sign-up",
  },
]

export function ToolsShowcaseSection() {
  const t = useT()
  return (
    <section id="outils" className="relative overflow-hidden px-6 py-20">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0d1117]/60 to-transparent" />

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* En-tete de section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-8 flex flex-col gap-3 text-left sm:flex-row sm:items-end sm:justify-between"
        >
<div>
            <h2 className="text-3xl font-bold text-white text-balance md:text-4xl">{t("Des outils puissants")}</h2>
            <p className="mt-2 max-w-xl text-sm text-slate-400 text-pretty">{t("Tout ce dont tu as besoin pour créer sans limites.")}</p>
          </div>
          <Link href="/dashboard" className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-cyan-300 transition hover:text-white">
            {t("Voir tous les outils")} <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>

        {/* Aperçu des quatre outils principaux */}
        <div id="tous-les-outils" className="-mx-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 pb-3 md:mx-0 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:px-0 xl:grid-cols-4">
          {tools.slice(0, 4).map((tool, index) => (
            <motion.div
              key={tool.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Link
                href={tool.href}
                style={{ ["--tool" as string]: tool.color }}
                className="group relative block aspect-[4/4.8] min-w-[78vw] snap-start overflow-hidden rounded-2xl border border-white/10 bg-[#0d1525] transition-all duration-300 hover:-translate-y-1 hover:border-white/25 hover:shadow-[0_18px_45px_-20px_var(--tool)] sm:min-w-[46vw] md:min-w-0"
              >
                {/* Media plein cadre */}
                {tool.mediaType === "video" ? (
                  <InViewVideo
                    src={tool.media}
                    label={`Demonstration ${tool.title}`}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <Image
                    src={tool.media || "/placeholder.svg"}
                    alt={`Apercu ${tool.title}`}
                    fill
                    sizes="(max-width: 768px) 78vw, (max-width: 1280px) 50vw, 25vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}

                {/* Degrade sombre pour la lisibilite */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/40" />

                {/* Badge + icone en haut */}
                <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-lg"
                    style={{ backgroundColor: "var(--tool)", boxShadow: "0 6px 20px -6px var(--tool)" }}
                  >
                    <tool.icon className="h-5 w-5" strokeWidth={2.4} />
                  </span>
                  <span className="sr-only">{t(tool.badge)}</span>
                </div>

                {/* Titre + description + CTA en bas */}
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <h3 className="text-xl font-bold text-white text-balance">{t(tool.title)}</h3>
                  <p className="mt-2 line-clamp-2 max-w-md text-xs leading-relaxed text-gray-300 text-pretty">
                    {t(tool.description)}
                  </p>
                  <span
                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold transition-colors"
                    style={{ color: tool.color }}
                  >
                    <span className="sr-only">{t("Ouvrir")}</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
