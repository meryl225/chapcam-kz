"use client"

import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { ArrowRight, Zap, ImageIcon, Film, Languages, ShieldCheck } from "lucide-react"
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
    title: "Traducteur de Video",
    description: "Traduis et double automatiquement tes videos dans plus de 190 langues, avec ta voix.",
    badge: "NOUVEAU",
    color: "#14b8a6",
    icon: Languages,
    media: "/swap/poster-video-translation.png",
    mediaType: "image",
    href: "/auth/sign-up",
  },
]

export function ToolsShowcaseSection() {
  const t = useT()
  return (
    <section id="outils" className="relative py-24 px-6 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0d1117]/60 to-transparent" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* En-tete de section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#00d4ff]/20 to-[#8b5cf6]/20 border border-[#00d4ff]/30 px-6 py-2 rounded-full mb-6">
            <span className="text-[#00d4ff] text-sm font-semibold tracking-wider uppercase">
              {t("Nos outils IA")}
            </span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-white text-balance">
            {t("Une suite complete pour")}{" "}
            <span className="bg-gradient-to-r from-[#00d4ff] to-[#8b5cf6] bg-clip-text text-transparent">
              {t("creer sans limites")}
            </span>
          </h2>
          <p className="mt-4 text-gray-400 max-w-2xl mx-auto text-pretty">
            {t("Change ton visage, anime tes photos et traduis tes videos : tout ce qu'il te faut en un seul endroit.")}
          </p>
        </motion.div>

        {/* Carte vedette ChapVerify (anti-deepfake) : pleine largeur, mise en
            avant comme nouveaute distincte des outils de creation. */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <Link
            href="/auth/sign-up"
            className="group relative block overflow-hidden rounded-3xl border border-[#dc2626]/40 bg-[#160a0d] transition-all duration-300 hover:-translate-y-1 hover:border-[#ef4444] hover:shadow-[0_20px_60px_-15px_#dc2626]"
          >
            {/* Halo + grille de scan discrete */}
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -left-16 -top-24 h-72 w-72 rounded-full bg-[#dc2626]/25 blur-3xl" />
              <div className="absolute -bottom-24 right-10 h-64 w-64 rounded-full bg-[#ef4444]/15 blur-3xl" />
              <div
                className="absolute inset-0 opacity-[0.06]"
                style={{
                  backgroundImage:
                    "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
                  backgroundSize: "40px 40px",
                }}
              />
            </div>

            <div className="relative z-10 flex flex-col items-start gap-6 p-8 md:flex-row md:items-center md:justify-between md:p-10">
              <div className="flex items-start gap-5">
                {/* Bouclier avec anneau radar anime */}
                <span className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#dc2626] text-white shadow-[0_10px_30px_-8px_#dc2626]">
                  <span className="absolute inset-0 rounded-2xl ring-2 ring-[#ef4444]/50 animate-ping [animation-duration:2.5s]" />
                  <ShieldCheck className="h-8 w-8" strokeWidth={2.2} />
                </span>

                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#dc2626]/15 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#f87171]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#ef4444]" />
                      {t("Anti-deepfake")}
                    </span>
                    <span className="rounded-full bg-[#ef4444] px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-white">
                      {t("Nouveau")}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-white md:text-3xl">
                    Chap<span className="text-[#ef4444]">Verify</span>
                  </h3>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-300 text-pretty">
                    {t(
                      "Une image, une voix ou une video te parait suspecte ? Verifie en un clic si c'est un deepfake genere par IA, avec un score de confiance.",
                    )}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {["Image", "Voix", "Video"].map((tag) => (
                      <span
                        key={tag}
                        className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-gray-300"
                      >
                        {t(tag)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <span className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#dc2626] px-6 py-3.5 text-sm font-bold text-white shadow-[0_10px_30px_-8px_#dc2626] transition-all duration-300 group-hover:bg-[#ef4444] group-hover:shadow-[0_14px_40px_-8px_#ef4444]">
                <ShieldCheck className="h-5 w-5" />
                {t("Verifier un fichier")}
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </Link>
        </motion.div>

        {/* Grille de cartes 2x2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tools.map((tool, index) => (
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
                className="group relative block aspect-[4/3] overflow-hidden rounded-3xl border border-white/10 bg-[#0d1525] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--tool)] hover:shadow-[0_20px_60px_-15px_var(--tool)]"
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
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}

                {/* Degrade sombre pour la lisibilite */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/40" />

                {/* Badge + icone en haut */}
                <div className="absolute inset-x-0 top-0 flex items-center justify-between p-5">
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-lg"
                    style={{ backgroundColor: "var(--tool)", boxShadow: "0 6px 20px -6px var(--tool)" }}
                  >
                    <tool.icon className="h-5 w-5" strokeWidth={2.4} />
                  </span>
                  <span
                    className="rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide backdrop-blur-sm"
                    style={{ color: tool.color, backgroundColor: `${tool.color}26` }}
                  >
                    {t(tool.badge)}
                  </span>
                </div>

                {/* Titre + description + CTA en bas */}
                <div className="absolute inset-x-0 bottom-0 p-6">
                  <h3 className="text-2xl font-bold text-white text-balance">{t(tool.title)}</h3>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-gray-300 text-pretty">
                    {t(tool.description)}
                  </p>
                  <span
                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold transition-colors"
                    style={{ color: tool.color }}
                  >
                    {t("Essayer maintenant")}
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
