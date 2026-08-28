"use client"

import Image from "next/image"
import type React from "react"
import {
  Menu,
  Settings,
  Eye,
  ArrowLeftRight,
  Smile,
  User,
  VenetianMask,
  Video,
  Radio,
  Sparkles,
  ImageIcon,
  Plus,
} from "lucide-react"
import { useT } from "@/lib/i18n/language-provider"

/**
 * PhoneMockup
 * Maquette d'un smartphone moderne presentant "ChapCam Mobile" : face swap en
 * temps reel avec ecran divise ORIGINAL / SWAPPE, badge LIVE, onglets et gros
 * bouton "Swap en direct". Reprend exactement la charte bleu/violet du site.
 * Purement decoratif -> aria-hidden.
 */
export function PhoneMockup() {
  const t = useT()

  return (
    <div aria-hidden className="relative select-none">
      {/* Lueur neon derriere le telephone */}
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
        <div className="h-[80%] w-[80%] rounded-full bg-[#8b5cf6]/30 blur-[70px]" />
      </div>

      {/* Corps du telephone (chassis titane) */}
      <div className="relative rounded-[2.6rem] bg-gradient-to-b from-[#2a2d35] via-[#141518] to-[#050608] p-[3px] shadow-[0_40px_90px_-25px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.06),0_0_60px_-15px_rgba(139,92,246,0.5)]">
        <div className="relative overflow-hidden rounded-[2.4rem] bg-black p-[5px]">
          {/* Ecran */}
          <div className="relative overflow-hidden rounded-[2rem] bg-[#080b16]">
            {/* Encoche / Dynamic Island */}
            <div className="absolute left-1/2 top-2 z-30 h-[22px] w-[86px] -translate-x-1/2 rounded-full bg-black" />

            {/* Barre d'etat */}
            <div className="flex items-center justify-between px-5 pt-3 pb-1 text-[10px] font-semibold text-white">
              <span>9:41</span>
              <div className="flex items-center gap-1">
                {/* signal */}
                <svg width="16" height="10" viewBox="0 0 16 10" fill="none" className="text-white">
                  <rect x="0" y="6" width="2.5" height="4" rx="0.5" fill="currentColor" />
                  <rect x="4" y="4" width="2.5" height="6" rx="0.5" fill="currentColor" />
                  <rect x="8" y="2" width="2.5" height="8" rx="0.5" fill="currentColor" />
                  <rect x="12" y="0" width="2.5" height="10" rx="0.5" fill="currentColor" />
                </svg>
                {/* wifi */}
                <svg width="14" height="10" viewBox="0 0 14 10" fill="none" className="text-white">
                  <path d="M7 8.5a1 1 0 100-2 1 1 0 000 2z" fill="currentColor" />
                  <path
                    d="M2.5 4.2a6.5 6.5 0 019 0M4.3 6a4 4 0 015.4 0"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
                {/* batterie */}
                <div className="flex h-[10px] w-[20px] items-center rounded-[3px] border border-white/60 p-[1.5px]">
                  <div className="h-full w-[80%] rounded-[1px] bg-white" />
                </div>
              </div>
            </div>

            {/* En-tete app */}
            <div className="flex items-center justify-between px-4 py-2.5">
              <Menu className="h-5 w-5 text-white/80" />
              <span className="text-sm font-bold text-white">ChapCam Mobile</span>
              <Settings className="h-5 w-5 text-white/80" />
            </div>

            {/* Ligne LIVE + spectateurs + statut */}
            <div className="flex items-center justify-between px-4 pb-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-[#ff2d3f] px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white shadow-[0_0_14px_-2px_rgba(255,45,63,0.9)]">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                  Live
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/90">
                  <Eye className="h-3 w-3" />
                  2,697
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-white/70">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00ff88]" />
                {t("Swap en direct")}
              </span>
            </div>

            {/* ===== Ecran divise ORIGINAL / SWAPPE ===== */}
            <div className="relative mx-3 overflow-hidden rounded-2xl" style={{ aspectRatio: "1 / 1" }}>
              <div className="grid h-full grid-cols-2">
                {/* Original */}
                <div className="relative overflow-hidden">
                  <Image
                    src="/images/hero/studio-before.png"
                    alt=""
                    fill
                    sizes="140px"
                    className="object-cover"
                    style={{ objectPosition: "60% 30%" }}
                  />
                  <span className="absolute left-1.5 top-1.5 rounded-md bg-black/55 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
                    Original
                  </span>
                </div>
                {/* Swappe */}
                <div className="relative overflow-hidden">
                  <Image
                    src="/images/hero/studio-after.png"
                    alt=""
                    fill
                    sizes="140px"
                    className="object-cover"
                    style={{ objectPosition: "50% 25%" }}
                  />
                  <span className="absolute right-1.5 top-1.5 rounded-md bg-[#8b5cf6]/70 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
                    Swappé
                  </span>
                </div>
              </div>

              {/* Ligne de separation lumineuse */}
              <div className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-gradient-to-b from-[#00d4ff] via-white to-[#e91e8c] shadow-[0_0_12px_rgba(255,255,255,0.8)]" />

              {/* Icone swap au centre */}
              <div className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/70 backdrop-blur-md">
                <ArrowLeftRight className="h-4 w-4 text-white" />
              </div>
            </div>

            {/* ===== Onglets ===== */}
            <div className="mx-3 mt-2.5 grid grid-cols-3 gap-1 rounded-xl bg-white/[0.05] p-1">
              {[
                { icon: Smile, label: "Visage", active: true },
                { icon: User, label: "Corps", active: false },
                { icon: VenetianMask, label: "Avatar", active: false },
              ].map((tab) => {
                const Icon = tab.icon
                return (
                  <span
                    key={tab.label}
                    className={
                      "inline-flex items-center justify-center gap-1 rounded-lg py-1.5 text-[10px] font-semibold transition-colors " +
                      (tab.active
                        ? "bg-gradient-to-r from-[#00d4ff]/25 to-[#8b5cf6]/25 text-white ring-1 ring-[#8b5cf6]/40"
                        : "text-white/55")
                    }
                  >
                    <Icon className={"h-3.5 w-3.5 " + (tab.active ? "text-[#8b5cf6]" : "")} />
                    {t(tab.label)}
                  </span>
                )
              })}
            </div>

            {/* ===== Rangee d'avatars ===== */}
            <div className="flex items-center justify-center gap-2 px-3 py-3">
              {["a1", "a2", "a3", "a4"].map((a, i) => (
                <span
                  key={a}
                  className={
                    "relative h-9 w-9 overflow-hidden rounded-full ring-2 " +
                    (i === 0 ? "ring-[#8b5cf6]" : "ring-white/15")
                  }
                >
                  <Image src={`/images/hero/avatars/${a}.png`} alt="" fill sizes="36px" className="object-cover" />
                </span>
              ))}
              <span className="flex h-9 w-9 flex-col items-center justify-center rounded-full border border-dashed border-white/25 text-white/60">
                <Plus className="h-3.5 w-3.5" />
              </span>
            </div>

            {/* ===== Bouton Swap en direct ===== */}
            <div className="px-3 pb-2">
              <span className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#00d4ff] via-[#8b5cf6] to-[#e91e8c] py-2.5 text-xs font-bold text-white shadow-[0_10px_30px_-8px_rgba(139,92,246,0.8)]">
                <Video className="h-4 w-4" />
                {t("Swap en direct")}
              </span>
            </div>

            {/* ===== Barre de navigation basse ===== */}
            <div className="mt-1 flex items-center justify-between border-t border-white/10 px-4 pb-4 pt-2.5">
              <NavItem icon={Radio} label="LIVE" active />
              <NavItem icon={Sparkles} label="Effets" />
              {/* Bouton d'enregistrement central */}
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#8b5cf6] to-[#00d4ff] p-[3px] shadow-[0_0_18px_-2px_rgba(139,92,246,0.9)]">
                <span className="h-full w-full rounded-full bg-white" />
              </span>
              <NavItem icon={ImageIcon} label="Medias" />
              <NavItem icon={Settings} label="Réglages" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function NavItem({
  icon: Icon,
  label,
  active = false,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  active?: boolean
}) {
  const t = useT()
  return (
    <span className={"flex flex-col items-center gap-0.5 " + (active ? "text-[#8b5cf6]" : "text-white/50")}>
      <Icon className="h-4 w-4" />
      <span className="text-[8px] font-medium">{t(label)}</span>
    </span>
  )
}
