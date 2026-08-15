"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useState, useEffect, useCallback, useRef } from "react"
import { Maximize2, X, Play } from "lucide-react"

type Frame = { src: string; label: string; type?: "image" | "video" }

const frames: Frame[] = [
  { src: "/showcase/chapcam-en-action.mp4", label: "ChapCam en Live", type: "video" },
  { src: "/showcase/pa1.jpg", label: "Live Streaming" },
  { src: "/showcase/pa2.jpg", label: "Online Chat" },
  { src: "/showcase/pa3.jpg", label: "Post-Production" },
  { src: "/showcase/pa4.jpg", label: "Online Games" },
]

export function SwapDemoFrames() {
  const [index, setIndex] = useState(0)
  const [open, setOpen] = useState(false)
  // La galerie est loin sous la ligne de flottaison. On ne telecharge la
  // video lourde (~2,3 Mo) QUE lorsque la section approche de l'ecran, sinon
  // elle sature la bande passante au chargement et bloque l'affichage du haut
  // de page sur connexion mobile lente.
  const [visible, setVisible] = useState(false)
  const containerRef = useRef<HTMLButtonElement>(null)

  const current = frames[index]
  const isVideo = current.type === "video"

  // Detecte l'entree de la galerie dans le viewport (avec une marge de 300px
  // pour anticiper legerement le defilement).
  useEffect(() => {
    const el = containerRef.current
    if (!el || visible) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true)
          io.disconnect()
        }
      },
      { rootMargin: "300px" },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [visible])

  // Defilement automatique : les images defilent seules, la video passe
  // au media suivant une fois sa lecture terminee (onEnded). Ne demarre
  // qu'une fois la galerie visible pour ne rien charger inutilement.
  useEffect(() => {
    if (isVideo || !visible) return
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % frames.length)
    }, 1800)
    return () => clearInterval(interval)
  }, [isVideo, visible])

  const goNext = useCallback(() => {
    setIndex((prev) => (prev + 1) % frames.length)
  }, [])

  // Fermeture de la lightbox avec Echap
  const onKey = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") setOpen(false)
  }, [])

  useEffect(() => {
    if (!open) return
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onKey])

  return (
    <>
      {/* Rectangle anime cliquable */}
      <button
        ref={containerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Agrandir la galerie ChapCam en action"
        className="group relative block w-full overflow-hidden rounded-3xl border border-[#00ff88]/30 bg-black focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff88]"
      >
        <div className="relative aspect-video w-full">
          <AnimatePresence mode="wait">
            {isVideo && visible ? (
              <motion.video
                key={current.src}
                src={current.src}
                autoPlay
                muted
                playsInline
                preload="none"
                onEnded={goNext}
                initial={{ opacity: 0, scale: 1.04 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.6 }}
                className="absolute inset-0 h-full w-full object-cover"
                aria-label={`ChapCam en action : ${current.label}`}
              />
            ) : isVideo && !visible ? (
              // Avant l'arrivee a l'ecran : placeholder leger, aucune video
              // telechargee (les overlays LIVE/label restent visibles par-dessus).
              <div key="video-placeholder" className="absolute inset-0 bg-black" />
            ) : (
              <motion.img
                key={current.src}
                src={current.src}
                alt={`ChapCam en action : ${current.label}`}
                initial={{ opacity: 0, scale: 1.04 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.6 }}
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
          </AnimatePresence>

          {/* Ligne de scan qui balaie pendant la transformation (images uniquement) */}
          {!isVideo && (
            <motion.div
              key={`scan-${index}`}
              initial={{ top: "0%", opacity: 0 }}
              animate={{ top: ["0%", "100%"], opacity: [0, 1, 0] }}
              transition={{ duration: 1, ease: "linear" }}
              className="pointer-events-none absolute left-0 right-0 h-12 bg-gradient-to-b from-transparent via-[#00ff88]/40 to-transparent"
            />
          )}

          {/* Voile sombre en bas pour la lisibilite */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

          {/* Badge LIVE */}
          <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/55 px-3 py-1.5 backdrop-blur-sm">
            <motion.div
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="h-2 w-2 rounded-full bg-[#00ff88]"
            />
            <span className="text-xs font-bold tracking-wide text-white">EN ACTION</span>
          </div>

          {/* Indice "cliquer pour agrandir" */}
          <div className="absolute right-3 top-3 flex items-center gap-2 rounded-full border border-[#00ff88]/50 bg-[#00ff88]/20 px-3 py-1.5 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
            <Maximize2 className="h-3.5 w-3.5 text-[#00ff88]" />
            <span className="text-xs font-bold text-[#00ff88]">Agrandir</span>
          </div>

          {/* Label de l'etape courante */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
            <div className="rounded-full border border-[#00ff88]/40 bg-black/70 px-4 py-1.5 backdrop-blur-sm">
              <AnimatePresence mode="wait">
                <motion.span
                  key={current.label}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.3 }}
                  className="text-sm font-semibold text-white"
                >
                  {current.label}
                </motion.span>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Points de progression des 4 frames */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
          {frames.map((f, i) => (
            <span
              key={f.src}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-5 bg-[#00ff88]" : "w-1.5 bg-white/40"
              }`}
            />
          ))}
        </div>
      </button>

      {/* Lightbox agrandie */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="Demonstration agrandie"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fermer"
              className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>

            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-[#00ff88]/30"
            >
              <div className="relative aspect-video w-full bg-black">
                <AnimatePresence mode="wait">
                  {isVideo ? (
                    <motion.video
                      key={`big-${current.src}`}
                      src={current.src}
                      autoPlay
                      muted
                      loop
                      controls
                      playsInline
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                      className="absolute inset-0 h-full w-full object-contain"
                      aria-label={`ChapCam en action : ${current.label}`}
                    />
                  ) : (
                    <motion.img
                      key={`big-${current.src}`}
                      src={current.src}
                      alt={`ChapCam en action : ${current.label}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  )}
                </AnimatePresence>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-[#00ff88]/40 bg-black/70 px-5 py-2 backdrop-blur-sm">
                  <span className="text-base font-semibold text-white">{current.label}</span>
                </div>
              </div>
            </motion.div>

            {/* Miniatures cliquables dans la lightbox */}
            <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2">
              {frames.map((f, i) => (
                <button
                  key={f.src}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setIndex(i)
                  }}
                  aria-label={`Voir ${f.label}`}
                  className={`relative h-12 w-12 overflow-hidden rounded-lg border-2 transition-all ${
                    i === index ? "border-[#00ff88]" : "border-white/20 opacity-60 hover:opacity-100"
                  }`}
                >
                  {f.type === "video" ? (
                    <>
                      <video src={f.src} muted playsInline preload="none" className="h-full w-full object-cover" />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <Play className="h-4 w-4 fill-white text-white" />
                      </span>
                    </>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={f.src || "/placeholder.svg"} alt={f.label} className="h-full w-full object-cover" />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
