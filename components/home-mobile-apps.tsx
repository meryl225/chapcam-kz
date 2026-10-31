"use client"

import Image from "next/image"
import { useT } from "@/lib/i18n/language-provider"

const GOOGLE_PLAY_ICON = "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/google-play/default.svg"
const APPLE_ICON = "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/apple/default.svg"

export function HomeMobileApps() {
  const t = useT()

  return (
    <section id="mobile" aria-labelledby="mobile-title" className="pt-10 lg:pt-14">
      <div className="flex flex-col gap-6 rounded-[1.7rem] border border-white/90 bg-white/80 p-5 shadow-[0_24px_60px_-32px_rgba(37,99,235,.55)] backdrop-blur sm:p-8 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
        <div className="flex items-start gap-4">
          <Image
            src="/images/chapcam-logo.png"
            alt=""
            width={64}
            height={64}
            className="h-14 w-14 shrink-0 rounded-2xl object-cover shadow-[0_10px_24px_-12px_rgba(7,26,66,.5)] sm:h-16 sm:w-16"
          />
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-[#92400e]">
              <span className="size-2 rounded-full bg-[#f59e0b]" aria-hidden="true" />
              {t("Bientôt sur mobile")}
            </p>
            <h2 id="mobile-title" style={{ color: "#071a42" }} className="mt-1 text-3xl font-bold tracking-[-.04em] text-balance sm:text-4xl">
              {t("ChapCam sur ton téléphone")}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#607493] text-pretty">
              {t("Live Swap, Genjutsu et tous tes outils IA bientôt dans ta poche. En attendant, utilise ChapCam directement dans ton navigateur.")}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="flex flex-col items-center gap-2">
            <span
              aria-disabled="true"
              className="flex min-w-[220px] cursor-not-allowed items-center gap-3 rounded-2xl border border-[#dbe9f4] bg-[#f4f9ff] px-5 py-3.5 text-[#7487a1]"
            >
              <img src={GOOGLE_PLAY_ICON} alt="" className="h-8 w-8 shrink-0 object-contain opacity-50" />
              <span className="flex flex-col leading-tight">
                <span className="text-[11px] font-medium">{t("Disponible sur")}</span>
                <span className="text-lg font-bold tracking-[-.01em]">Google Play</span>
              </span>
            </span>
            <span className="rounded-full bg-[#fef3c7] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#92400e]">
              {t("Bientôt")}
            </span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <span
              aria-disabled="true"
              className="flex min-w-[220px] cursor-not-allowed items-center gap-3 rounded-2xl border border-[#dbe9f4] bg-[#f4f9ff] px-5 py-3.5 text-[#7487a1]"
            >
              <img src={APPLE_ICON} alt="" className="h-8 w-8 shrink-0 object-contain opacity-50" />
              <span className="flex flex-col leading-tight">
                <span className="text-[11px] font-medium">{t("Télécharger dans")}</span>
                <span className="text-lg font-bold tracking-[-.01em]">App Store</span>
              </span>
            </span>
            <span className="rounded-full bg-[#fef3c7] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#92400e]">
              {t("Bientôt")}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
