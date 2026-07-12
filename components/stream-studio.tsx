"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { Mic, Video, Monitor, Camera, Circle, Settings, Sliders, Volume2, TrendingUp } from "lucide-react"

const AVATARS = [
  { src: "/images/hero/avatars/a1.png" },
  { src: "/images/hero/avatars/a2.png" },
  { src: "/images/hero/avatars/a3.png" },
  { src: "/images/hero/avatars/a4.png" },
  { src: "/images/hero/avatars/a5.png" },
  { src: "/images/hero/avatars/a6.png" },
  ]

const SLIDERS = [
  { label: "Similarité", value: 85 },
  { label: "Expression", value: 90 },
  { label: "Éclairage", value: 80 },
  { label: "Netteté", value: 70 },
]

const CHAT = [
  { user: "LilaStream", msg: "Incroyable !!", color: "#00d4ff" },
  { user: "NeoKiller", msg: "Wshh c'est trop réel", color: "#00ff88" },
  { user: "GameMaster", msg: "La qualité est insane !", color: "#e91e8c" },
  { user: "ShadowZ", msg: "Tu utilises quel setup ?", color: "#f97316" },
  { user: "CyberVibes", msg: "ChapCam best tool", color: "#8b5cf6" },
  { user: "PixelQueen", msg: "on dirait un vrai jeu", color: "#00d4ff" },
]

export function StreamStudio() {
  const [viewers, setViewers] = useState(2543)
  const [divider, setDivider] = useState(52)
  const [tab, setTab] = useState<"visage" | "corps">("visage")
  const [chatIndex, setChatIndex] = useState(0)

  // Compteur de spectateurs qui fluctue
  useEffect(() => {
    const t = setInterval(() => setViewers((v) => Math.max(2400, v + Math.floor(Math.random() * 25) - 10)), 2200)
    return () => clearInterval(t)
  }, [])

  // Balayage lent du separateur avant/apres (transform-based, leger)
  useEffect(() => {
    const positions = [52, 40, 58, 46, 62, 50]
    let i = 0
    const t = setInterval(() => {
      i = (i + 1) % positions.length
      setDivider(positions[i])
    }, 2600)
    return () => clearInterval(t)
  }, [])

  // Chat qui defile
  useEffect(() => {
    const t = setInterval(() => setChatIndex((i) => (i + 1) % CHAT.length), 2400)
    return () => clearInterval(t)
  }, [])

  const visibleChat = [0, 1, 2, 3, 4].map((o) => CHAT[(chatIndex + o) % CHAT.length])

  return (
    <div className="relative w-full max-w-[720px]">
      {/* Halo statique */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-10 rounded-[48px] opacity-40 blur-3xl"
        style={{ background: "radial-gradient(circle at 60% 40%, rgba(0,212,255,0.35), rgba(139,92,246,0.25) 45%, transparent 72%)" }}
      />

      <div className="relative flex gap-3">
        {/* ===== Fenetre principale du studio ===== */}
        <div className="group/window relative min-w-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-[#0b0f16]/95 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.04),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl transition-shadow duration-500 hover:shadow-[0_36px_100px_-24px_rgba(0,0,0,0.9),0_0_50px_-12px_rgba(0,212,255,0.35),0_0_0_1px_rgba(255,255,255,0.06),inset_0_1px_0_rgba(255,255,255,0.08)]">
          {/* Barre de titre */}
          <div className="flex items-center gap-2 border-b border-white/[0.08] bg-[#0d1220] px-3 py-2.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-[#00d4ff] to-[#8b5cf6]">
              <span className="h-2 w-2 rounded-full bg-white" />
            </span>
            <span className="text-xs font-bold text-white">
              ChapCam <span className="font-medium text-gray-400">Studio</span>
            </span>
            <span className="cc-blink ml-1.5 flex items-center gap-1 rounded bg-[#ff2d2d] px-1.5 py-0.5 text-[9px] font-bold text-white">
              LIVE
            </span>
            <span className="flex items-center gap-1 text-[10px] font-semibold text-gray-300">
              <span className="h-1 w-1 rounded-full bg-gray-500" />
              {viewers.toLocaleString("en-US")}
            </span>

            <div className="ml-auto flex items-center gap-1.5">
              <span className="hidden rounded bg-white/5 px-1.5 py-0.5 text-[9px] font-medium text-gray-400 sm:inline">
                1080P
              </span>
              <span className="hidden rounded bg-white/5 px-1.5 py-0.5 text-[9px] font-medium text-gray-400 sm:inline">
                30 FPS
              </span>
              <Settings className="h-3.5 w-3.5 text-gray-500" />
              <Sliders className="h-3.5 w-3.5 text-gray-500" />
              <span className="cc-blink h-2.5 w-2.5 rounded-full bg-[#ff2d2d]" />
            </div>
          </div>

          {/* Corps : video split + panneau controle */}
          <div className="flex">
            {/* Zone video AVANT / APRES */}
            <div className="relative min-w-0 flex-1">
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-black">
                {/* APRES (fond, pleine largeur) */}
                <Image
                  src="/images/hero/studio-after.png"
                  alt="Apres transformation ChapCam"
                  fill
                  className="object-cover"
                  sizes="480px"
                  priority
                />
                {/* AVANT (par-dessus, clippe a gauche du separateur) */}
                <div
                  className="absolute inset-0 transition-[clip-path] duration-1000 ease-in-out"
                  style={{ clipPath: `inset(0 ${100 - divider}% 0 0)` }}
                >
                  <Image
                    src="/images/hero/studio-before.png"
                    alt="Avant transformation"
                    fill
                    className="object-cover"
                    sizes="480px"
                    priority
                  />
                </div>

                {/* Etiquettes */}
                <span className="absolute left-2.5 top-2.5 rounded-md border border-white/15 bg-black/55 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
                  Avant
                </span>
                <span className="absolute right-2.5 top-2.5 rounded-md border border-[#00d4ff]/40 bg-[#00d4ff]/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#00d4ff] backdrop-blur-sm">
                  Après
                </span>

                {/* Separateur + poignee */}
                <div
                  className="absolute inset-y-0 z-10 w-0.5 bg-white/80 transition-[left] duration-1000 ease-in-out"
                  style={{ left: `${divider}%`, boxShadow: "0 0 14px rgba(255,255,255,0.6)" }}
                >
                  <span className="absolute top-1/2 left-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/60 bg-black/70 backdrop-blur-sm">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-white">
                      <path d="M9 6L4 12l5 6M15 6l5 6-5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </div>

                {/* Mini controles overlay bas gauche */}
                <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5">
                  {[Camera, Monitor].map((Icon, i) => (
                    <span key={i} className="flex h-6 w-6 items-center justify-center rounded-md border border-white/10 bg-black/55 backdrop-blur-md transition-all duration-200 hover:scale-110 hover:border-white/25 hover:bg-black/70">
                      <Icon className="h-3 w-3 text-white/80" />
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Panneau de controle */}
            <div className="hidden w-[190px] shrink-0 flex-col gap-3 border-l border-white/[0.08] bg-[#0a0e18] p-3 md:flex">
              {/* Onglets */}
              <div className="flex gap-1 rounded-lg bg-white/5 p-0.5">
                {(["visage", "corps"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`flex-1 rounded-md py-1 text-[10px] font-bold uppercase tracking-wide transition-all ${
                      tab === t ? "bg-gradient-to-r from-[#00d4ff] to-[#8b5cf6] text-white" : "text-gray-400"
                    }`}
                  >
                    {t === "visage" ? "Visage" : "Corps"}
                  </button>
                ))}
              </div>

              {/* Selection avatar */}
              <div>
                <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-gray-500">Sélection d&apos;avatar</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {AVATARS.map((a, i) => (
                    <button
                      key={i}
                      className={`relative aspect-square overflow-hidden rounded-lg transition-all duration-300 hover:z-10 hover:scale-[1.08] hover:ring-2 hover:ring-[#00d4ff]/70 ${
                        i === 0 ? "ring-2 ring-[#00d4ff] shadow-[0_0_16px_-2px_rgba(0,212,255,0.6)]" : "ring-1 ring-white/10"
                      }`}
                    >
                      <Image src={a.src} alt={`Avatar ${i + 1}`} fill className="object-cover" sizes="52px" />
                      {i === 0 && (
                        <span className="absolute bottom-0.5 right-0.5 h-2 w-2 rounded-full bg-[#00d4ff] ring-2 ring-[#0b0f16]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sliders */}
              <div className="flex flex-col gap-2">
                {SLIDERS.map((s) => (
                  <div key={s.label}>
                    <div className="mb-1 flex items-center justify-between text-[9px]">
                      <span className="font-medium text-gray-400">{s.label}</span>
                      <span className="font-bold text-white">{s.value}%</span>
                    </div>
                    <div className="relative h-1 rounded-full bg-white/10">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#00d4ff] to-[#8b5cf6]"
                        style={{ width: `${s.value}%` }}
                      />
                      <span
                        className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow"
                        style={{ left: `${s.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Bouton appliquer */}
              <button className="mt-auto rounded-lg bg-gradient-to-r from-[#00d4ff] to-[#8b5cf6] py-2 text-[11px] font-bold text-white shadow-[0_6px_20px_-6px_rgba(0,212,255,0.6)] transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_10px_28px_-6px_rgba(139,92,246,0.7)] active:translate-y-0">
                Appliquer en direct
              </button>
            </div>
          </div>

          {/* Barre de controles bas */}
          <div className="flex items-center gap-2 border-t border-white/[0.08] bg-[#0d1220] px-3 py-2">
            <button className="flex h-7 w-7 items-center justify-center rounded-md bg-white/5 text-gray-300 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/10 hover:text-white hover:shadow-[0_4px_12px_-4px_rgba(0,212,255,0.4)]">
              <Mic className="h-3.5 w-3.5" />
            </button>
            <button className="flex h-7 w-7 items-center justify-center rounded-md bg-white/5 text-gray-300 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/10 hover:text-white hover:shadow-[0_4px_12px_-4px_rgba(0,212,255,0.4)]">
              <Video className="h-3.5 w-3.5" />
            </button>
            <button className="flex h-7 w-7 items-center justify-center rounded-md bg-white/5 text-gray-300 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/10 hover:text-white hover:shadow-[0_4px_12px_-4px_rgba(0,212,255,0.4)]">
              <Monitor className="h-3.5 w-3.5" />
            </button>
            <button className="flex h-7 w-7 items-center justify-center rounded-md bg-white/5 text-gray-300 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/10 hover:text-white hover:shadow-[0_4px_12px_-4px_rgba(0,212,255,0.4)]">
              <Camera className="h-3.5 w-3.5" />
            </button>
            <button className="flex h-7 w-7 items-center justify-center rounded-md bg-white/5 text-[#ff2d2d] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#ff2d2d]/15 hover:shadow-[0_4px_12px_-4px_rgba(255,45,45,0.5)]">
              <Circle className="h-3.5 w-3.5 fill-current" />
            </button>

            {/* Meter audio */}
            <div className="ml-auto flex items-center gap-1.5">
              <Volume2 className="h-3.5 w-3.5 text-gray-500" />
              <div className="flex items-end gap-0.5">
                {[0.5, 0.9, 0.6, 1, 0.7, 0.4, 0.8].map((h, i) => (
                  <span
                    key={i}
                    className="cc-wave-bar w-0.5 rounded-full bg-gradient-to-t from-[#00ff88] to-[#00d4ff]"
                    style={{ height: `${h * 14}px`, animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Carte spectateurs flottante */}
          <div className="absolute -bottom-5 right-3 hidden items-center gap-3 rounded-xl border border-white/10 bg-[#0d1220]/80 px-3 py-2 shadow-[0_20px_50px_-16px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.05),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-[#00ff88]/30 hover:shadow-[0_24px_60px_-16px_rgba(0,0,0,0.95),0_0_30px_-8px_rgba(0,255,136,0.4)] sm:flex">
            <div>
              <p className="text-[8px] font-bold uppercase tracking-wider text-gray-500">Spectateurs</p>
              <p className="text-lg font-black leading-none text-white">{viewers.toLocaleString("en-US")}</p>
              <p className="flex items-center gap-0.5 text-[9px] font-semibold text-[#00ff88]">
                <TrendingUp className="h-2.5 w-2.5" />
                +12.5% aujourd&apos;hui
              </p>
            </div>
            <svg width="52" height="28" viewBox="0 0 52 28" fill="none" className="text-[#00ff88]">
              <path d="M1 22 L10 16 L18 19 L26 9 L34 13 L42 5 L51 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* ===== Panneau chat ===== */}
        <div className="hidden w-[168px] shrink-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b0f16]/90 shadow-[0_30px_80px_-24px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl xl:flex">
          <div className="border-b border-white/[0.08] px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white">Chat en direct</p>
          </div>
          <div className="flex flex-1 flex-col gap-2.5 p-3">
            <AnimatePresence mode="popLayout">
              {visibleChat.map((c, i) => (
                <motion.div
                  key={`${c.user}-${chatIndex}-${i}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35 }}
                  className="flex gap-2 rounded-md px-1 py-0.5 transition-colors duration-200 hover:bg-white/[0.06]"
                >
                  <span
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[8px] font-bold text-white shadow-[0_0_10px_-2px_currentColor]"
                    style={{ background: c.color }}
                  >
                    {c.user[0]}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[9px] font-bold" style={{ color: c.color }}>
                      {c.user}
                    </p>
                    <p className="text-[9px] leading-tight text-gray-300">{c.msg}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <div className="px-3 pb-2">
            <div className="rounded-lg bg-white/5 px-2.5 py-1.5 text-[9px] text-gray-500">Envoyer un message…</div>
          </div>
          <div className="border-t border-white/[0.08] px-3 py-2.5">
            <p className="mb-1.5 text-[8px] font-bold uppercase tracking-wider text-gray-500">En live sur</p>
            <div className="flex items-center gap-2 text-[10px] font-bold">
              <span className="text-[#9146FF]">Twitch</span>
              <span className="text-[#ff4d4d]">YT</span>
              <span className="text-white">TikTok</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
