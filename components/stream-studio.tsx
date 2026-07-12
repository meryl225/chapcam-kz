"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { Mic, Video, Radio, MessageSquare, Sparkles, Users } from "lucide-react"

// Onglets de plateformes : l'axe "gaming + creation de contenu"
const PLATFORMS = [
  { id: "gaming", label: "Gaming", accent: "#00ff88" },
  { id: "tiktok", label: "TikTok", accent: "#e91e8c" },
  { id: "youtube", label: "YouTube Live", accent: "#ff4d4d" },
  { id: "discord", label: "Discord", accent: "#8b5cf6" },
]

// Messages de chat qui defilent pour donner vie au live
const CHAT_MESSAGES = [
  { user: "Nova_TV", msg: "ce swap est incroyable 🔥", color: "#00d4ff" },
  { user: "KZ_Gamer", msg: "on voit meme pas la difference", color: "#00ff88" },
  { user: "Lena.stream", msg: "quel filtre tu utilises ??", color: "#e91e8c" },
  { user: "ProZeus", msg: "temps reel de fou", color: "#f97316" },
  { user: "MissPixel", msg: "je reste anonyme grace a ca", color: "#8b5cf6" },
]

export function StreamStudio() {
  const [platform, setPlatform] = useState(0)
  const [swapped, setSwapped] = useState(false)
  const [isSwapping, setIsSwapping] = useState(false)
  const [chatIndex, setChatIndex] = useState(0)
  const [viewers, setViewers] = useState(2847)

  const accent = PLATFORMS[platform].accent

  // Cycle du swap (real <-> avatar) avec courte phase de transition
  useEffect(() => {
    const interval = setInterval(() => {
      setIsSwapping(true)
      setTimeout(() => {
        setSwapped((s) => !s)
        setIsSwapping(false)
      }, 900)
    }, 3600)
    return () => clearInterval(interval)
  }, [])

  // Rotation des plateformes
  useEffect(() => {
    const t = setInterval(() => setPlatform((p) => (p + 1) % PLATFORMS.length), 4800)
    return () => clearInterval(t)
  }, [])

  // Chat qui defile
  useEffect(() => {
    const t = setInterval(() => setChatIndex((i) => (i + 1) % CHAT_MESSAGES.length), 2200)
    return () => clearInterval(t)
  }, [])

  // Compteur de viewers qui fluctue
  useEffect(() => {
    const t = setInterval(() => setViewers((v) => v + Math.floor(Math.random() * 21) - 8), 2000)
    return () => clearInterval(t)
  }, [])

  const visibleChat = [0, 1, 2].map((offset) => CHAT_MESSAGES[(chatIndex + offset) % CHAT_MESSAGES.length])

  return (
    <div className="relative w-full max-w-[640px]">
      {/* Halo statique (perf : pas d'animation de blur) */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-8 rounded-[40px] opacity-40 blur-3xl"
        style={{ background: `radial-gradient(circle at 50% 40%, ${accent}55, transparent 70%)` }}
      />

      {/* Fenetre du studio */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0b0f16] shadow-2xl">
        {/* Barre de titre facon OBS / navigateur */}
        <div className="flex items-center gap-2 border-b border-white/10 bg-[#0d1119] px-4 py-2.5">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          </div>
          <div className="ml-3 flex items-center gap-2 text-xs font-medium text-gray-400">
            <Sparkles className="h-3.5 w-3.5" style={{ color: accent }} />
            ChapCam Studio
          </div>
          {/* Onglets plateformes */}
          <div className="ml-auto hidden items-center gap-1 sm:flex">
            {PLATFORMS.map((p, i) => (
              <button
                key={p.id}
                onClick={() => setPlatform(i)}
                className="rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all"
                style={
                  i === platform
                    ? { background: `${p.accent}20`, color: p.accent, boxShadow: `inset 0 0 0 1px ${p.accent}60` }
                    : { color: "#6b7280" }
                }
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scene de stream */}
        <div className="relative aspect-video w-full overflow-hidden bg-black">
          {/* Fond gameplay */}
          <Image
            src="/images/hero/game-scene.png"
            alt="Scene de jeu en direct"
            fill
            className="object-cover opacity-90"
            sizes="640px"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />

          {/* Barre live (haut) */}
          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
            <div className="flex items-center gap-2">
              <span
                className="flex items-center gap-1.5 rounded-md bg-[#ff2d2d] px-2 py-1 text-[11px] font-bold text-white"
                style={{ boxShadow: "0 0 16px rgba(255,45,45,0.6)" }}
              >
                <span className="cc-blink h-1.5 w-1.5 rounded-full bg-white" />
                LIVE
              </span>
              <span className="flex items-center gap-1 rounded-md bg-black/50 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                <Users className="h-3 w-3" />
                {viewers.toLocaleString("fr-FR")}
              </span>
            </div>
            <span
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-bold backdrop-blur-sm"
              style={{ background: `${accent}22`, color: accent, boxShadow: `inset 0 0 0 1px ${accent}55` }}
            >
              <Radio className="h-3 w-3" />
              SWAP ON
            </span>
          </div>

          {/* Chat overlay (droite) */}
          <div className="absolute right-3 top-14 hidden w-40 flex-col gap-1.5 md:flex">
            <AnimatePresence mode="popLayout">
              {visibleChat.map((c, i) => (
                <motion.div
                  key={`${c.user}-${chatIndex}-${i}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1 - i * 0.25, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="rounded-lg bg-black/55 px-2.5 py-1.5 text-[10px] leading-tight backdrop-blur-sm"
                >
                  <span className="font-bold" style={{ color: c.color }}>
                    {c.user}
                  </span>{" "}
                  <span className="text-gray-200">{c.msg}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Facecam : le swap en direct */}
          <div className="absolute bottom-3 left-3 w-[42%] max-w-[220px]">
            <div
              className="relative aspect-[4/5] overflow-hidden rounded-xl border-2"
              style={{ borderColor: accent, boxShadow: `0 0 24px ${accent}55` }}
            >
              {/* Image reelle */}
              <Image
                src="/images/hero/creator-real.png"
                alt="Createur avant swap"
                fill
                className={`object-cover transition-opacity duration-500 ${swapped ? "opacity-0" : "opacity-100"}`}
                sizes="220px"
                priority
              />
              {/* Image swappee */}
              <Image
                src="/images/hero/creator-swapped.png"
                alt="Createur apres swap ChapCam"
                fill
                className={`object-cover transition-opacity duration-500 ${swapped ? "opacity-100" : "opacity-0"}`}
                sizes="220px"
              />

              {/* Ligne de scan pendant le swap */}
              <AnimatePresence>
                {isSwapping && (
                  <motion.div
                    className="absolute inset-x-0 h-8 pointer-events-none"
                    style={{
                      background: `linear-gradient(180deg, transparent, ${accent}90, transparent)`,
                    }}
                    initial={{ top: "-20%", opacity: 0 }}
                    animate={{ top: "110%", opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.9, ease: "easeInOut" }}
                  />
                )}
              </AnimatePresence>

              {/* Points de tracking facial */}
              <div className="absolute inset-0 pointer-events-none">
                {[
                  { top: "34%", left: "34%" },
                  { top: "34%", left: "66%" },
                  { top: "52%", left: "50%" },
                  { top: "68%", left: "40%" },
                  { top: "68%", left: "60%" },
                ].map((pt, i) => (
                  <span
                    key={i}
                    className="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                    style={{ top: pt.top, left: pt.left, background: accent, boxShadow: `0 0 8px ${accent}` }}
                  />
                ))}
              </div>

              {/* Etiquette cam */}
              <div className="absolute bottom-1.5 left-1.5 rounded-md bg-black/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
                Facecam
              </div>
            </div>
          </div>

          {/* Barre de controles (bas droite) */}
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <div className="flex items-end gap-0.5 rounded-lg bg-black/50 px-2 py-1.5 backdrop-blur-sm">
              {[0.4, 0.8, 0.5, 1, 0.6].map((h, i) => (
                <span
                  key={i}
                  className="cc-wave-bar w-0.5 rounded-full"
                  style={{ height: `${h * 16}px`, background: accent, animationDelay: `${i * 0.12}s` }}
                />
              ))}
            </div>
            <button className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/50 text-white backdrop-blur-sm">
              <Mic className="h-4 w-4" />
            </button>
            <button
              className="flex h-8 w-8 items-center justify-center rounded-lg text-black"
              style={{ background: accent }}
            >
              <Video className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Pied : legende */}
        <div className="flex items-center justify-between gap-3 border-t border-white/10 bg-[#0d1119] px-4 py-2.5">
          <div className="flex items-center gap-2 text-[11px] text-gray-400">
            <MessageSquare className="h-3.5 w-3.5" style={{ color: accent }} />
            Diffuse sur <span className="font-semibold text-white">{PLATFORMS[platform].label}</span>
          </div>
          <span className="text-[11px] font-medium text-gray-500">1080p · 60 FPS · &lt; 40 ms</span>
        </div>
      </div>
    </div>
  )
}
