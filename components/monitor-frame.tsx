"use client"

import type { ReactNode } from "react"
import { motion } from "framer-motion"

/**
 * MonitorFrame
 * Presente n'importe quel contenu (ici l'interface ChapCam Studio) a l'interieur
 * d'un moniteur premium type Apple Studio Display / OLED ultra-fin.
 * Le contenu passe en `children` n'est JAMAIS modifie : couleurs, typographie,
 * layout, chat, icones restent identiques. On ajoute uniquement le habillage
 * (bezel, pied aluminium, reflets, lueur neon, eclairage ambiant).
 */
export function MonitorFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative w-full">
      {/* ===== Eclairage ambiant bleu / violet derriere le moniteur ===== */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
        <div className="h-[70%] w-[85%] rounded-full bg-[#00d4ff]/20 blur-[120px]" />
        <div className="absolute h-[60%] w-[60%] translate-x-1/4 rounded-full bg-[#8b5cf6]/25 blur-[120px]" />
      </div>

      {/* ===== Scene en perspective 3/4 legere ===== */}
      <div className="[perspective:2000px]">
        <motion.div
          initial={{ opacity: 0, y: 30, rotateX: 8 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="relative [transform-style:preserve-3d]"
          style={{ transform: "rotateY(-5deg) rotateX(2deg)" }}
        >
          {/* ===== Corps du moniteur (bezel ultra-fin) ===== */}
          <div className="relative rounded-[26px] bg-gradient-to-b from-[#1c1f26] via-[#0e1014] to-[#050608] p-[3px] shadow-[0_60px_120px_-30px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.06),0_0_80px_-20px_rgba(0,212,255,0.35)]">
            {/* Liseret metallique interieur */}
            <div className="rounded-[24px] bg-gradient-to-b from-[#2a2d35] to-[#0a0b0e] p-[2px]">
              {/* Zone ecran noire (bezel) */}
              <div className="relative overflow-hidden rounded-[22px] bg-black p-2 sm:p-2.5">
                {/* ===== Contenu = interface ChapCam intacte ===== */}
                <div className="relative overflow-hidden rounded-[15px]">
                  {children}

                  {/* Reflet doux vitre (n'altere pas l'UI, purement decoratif) */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 rounded-[15px] mix-blend-screen"
                    style={{
                      background:
                        "linear-gradient(125deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 18%, transparent 40%, transparent 100%)",
                    }}
                  />
                  {/* Vignettage tres subtil pour l'effet dalle */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 rounded-[15px]"
                    style={{ boxShadow: "inset 0 0 60px rgba(0,0,0,0.35)" }}
                  />
                </div>

                {/* Camera / capteur en haut du bezel */}
                <div className="absolute left-1/2 top-[6px] h-1 w-1 -translate-x-1/2 rounded-full bg-white/25 ring-1 ring-white/10" />
              </div>
            </div>

            {/* Reflet lumineux sur tout le bezel */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-[26px]"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, transparent 12%, transparent 92%, rgba(255,255,255,0.04) 100%)",
              }}
            />
          </div>

          {/* ===== Pied aluminium ===== */}
          <div className="relative mx-auto flex flex-col items-center" style={{ transform: "translateZ(-40px)" }}>
            {/* Col */}
            <div className="h-10 w-24 rounded-b-md bg-gradient-to-b from-[#3a3d44] via-[#26282e] to-[#17181c] shadow-[inset_0_2px_4px_rgba(255,255,255,0.15),inset_0_-2px_6px_rgba(0,0,0,0.6)]" />
            {/* Charniere */}
            <div className="h-2 w-32 rounded-full bg-gradient-to-b from-[#4a4d54] to-[#1a1b1f] shadow-[0_2px_6px_rgba(0,0,0,0.6)]" />
            {/* Socle */}
            <div className="mt-1 h-3 w-56 rounded-[50%] bg-gradient-to-b from-[#33363d] via-[#212227] to-[#0c0d10] shadow-[0_20px_40px_-12px_rgba(0,0,0,0.85),inset_0_2px_3px_rgba(255,255,255,0.12)]" />
          </div>
        </motion.div>
      </div>

      {/* ===== Lueur neon sous le moniteur ===== */}
      <div aria-hidden className="pointer-events-none absolute -bottom-6 left-1/2 -z-10 h-24 w-[70%] -translate-x-1/2">
        <div className="h-full w-full rounded-[50%] bg-gradient-to-r from-[#00d4ff]/40 via-[#8b5cf6]/40 to-[#e91e8c]/30 blur-[50px]" />
      </div>

      {/* ===== Fines stries de lumiere ===== */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -bottom-2 -z-10 mx-auto h-[2px] w-[55%] rounded-full bg-gradient-to-r from-transparent via-[#00d4ff]/70 to-transparent blur-[1px]"
      />
    </div>
  )
}
