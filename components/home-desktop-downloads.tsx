"use client"

import Image from "next/image"
import { useSyncExternalStore } from "react"
import { Download, FlaskConical, Info, ShieldCheck } from "lucide-react"
import { DESKTOP_VERSION, desktopReleases, type DesktopRelease } from "@/lib/desktop-releases"
import { useT } from "@/lib/i18n/language-provider"

const OS_ICONS = {
  windows: "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/windows/default.svg",
  mac: "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/apple/light.svg",
} as const

type DetectedOS = "mac" | "windows" | null

const subscribeNoop = () => () => {}

function detectOS(): DetectedOS {
  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ??
    navigator.userAgent
  if (/iphone|ipad|android/i.test(navigator.userAgent)) return null
  if (/mac/i.test(platform)) return "mac"
  if (/win/i.test(platform)) return "windows"
  return null
}

function formatSize(bytes: number) {
  return `${Math.round(bytes / 1_000_000)} Mo`
}

function ReleaseCard({ release, recommended }: { release: DesktopRelease; recommended: boolean }) {
  const t = useT()
  const available = release.status !== "unavailable" && release.url

  return (
    <article
      className={`relative flex flex-col gap-5 rounded-[20px] border bg-white p-5 shadow-[0_14px_32px_-24px_rgba(28,77,130,.6)] sm:p-6 ${
        recommended ? "border-[#38bdf8] ring-4 ring-[#38bdf8]/15" : "border-[#dbe9f4]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#e3eef8] bg-[#f4f9ff] p-2.5">
          <img src={OS_ICONS[release.os]} alt="" className="h-full w-full object-contain" />
        </span>
        <div className="flex flex-wrap justify-end gap-1.5">
          {recommended && (
            <span className="rounded-full bg-[#e0f2fe] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#0369a1]">
              {t("Recommandé pour vous")}
            </span>
          )}
          {release.status === "test" && (
            <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-[#fef3c7] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#92400e]">
              <FlaskConical className="h-3 w-3" aria-hidden="true" />
              {t("Version de test")}
            </span>
          )}
        </div>
      </div>

      <div>
        <h3 style={{ color: "#071a42" }} className="text-lg font-bold tracking-[-.02em]">{release.title}</h3>
        <p className="mt-1 text-sm leading-6 text-[#536783]">{t(release.compatibility)}</p>
        <p className="mt-2 text-xs font-medium text-[#7487a1]">
          {t("Installateur")} {release.format} · v{DESKTOP_VERSION} · {formatSize(release.sizeBytes)}
        </p>
      </div>

      {release.os === "windows" && !release.signed && (
        <p className="flex gap-2 text-xs leading-5 text-[#536783]">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#0ea5e9]" aria-hidden="true" />
          <span>
            {t("Si Windows affiche un message SmartScreen, cliquez sur « Informations complémentaires » puis « Exécuter quand même ».")}
          </span>
        </p>
      )}
      {release.os === "mac" && release.signed && (
        <p className="flex gap-2 text-xs leading-5 text-[#536783]">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#0ea5e9]" aria-hidden="true" />
          <span>{t("Signé et notarisé par Apple.")}</span>
        </p>
      )}

      <div className="mt-auto">
        {available ? (
          <a
            href={release.url!}
            download={release.fileName}
            style={{ color: "#ffffff" }}
            className="flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-[#0ea5e9] to-[#7c3aed] px-4 py-3 text-sm font-bold shadow-[0_12px_26px_-12px_rgba(37,99,235,.75)] transition hover:-translate-y-0.5"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            {t("Télécharger")}
            <span className="sr-only">
              {release.title} {release.status === "test" ? `(${t("version de test")})` : ""}
            </span>
          </a>
        ) : (
          <p className="rounded-xl border border-dashed border-[#cfdeec] px-4 py-3 text-center text-sm font-semibold text-[#7487a1]">
            {t("Bientôt disponible")}
          </p>
        )}
      </div>
    </article>
  )
}

export function HomeDesktopDownloads() {
  const t = useT()
  const os = useSyncExternalStore(subscribeNoop, detectOS, () => null)
  const recommendedId = os === "windows" ? "windows-x64" : os === "mac" ? "mac-arm64" : null

  return (
    <section id="desktop" aria-labelledby="desktop-title" className="pt-16 lg:pt-24">
      <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-4">
          <Image
            src="/images/chapcam-desktop-icon.png"
            alt="ChapCam"
            width={64}
            height={64}
            className="h-14 w-14 shrink-0 rounded-2xl shadow-[0_10px_24px_-12px_rgba(7,26,66,.5)] sm:h-16 sm:w-16"
          />
          <div>
            <p className="text-xs font-bold uppercase tracking-[.14em] text-[#0891b2]">{t("Chapcam pour ordinateur")}</p>
            <h2 id="desktop-title" style={{ color: "#071a42" }} className="mt-1 text-3xl font-bold tracking-[-.04em] text-balance sm:text-4xl">
              Chapcam Desktop
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#607493] text-pretty">
              {t("Transformez votre caméra en temps réel. Utilisez Chapcam dans vos appels vidéo, réunions et créations de contenu.")}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {desktopReleases.map((release) => (
          <ReleaseCard key={release.id} release={release} recommended={release.id === recommendedId} />
        ))}
      </div>

      <p className="mt-4 text-center text-xs leading-5 text-[#7487a1] text-pretty">
        {t("Pour un Mac, choisissez Apple Silicon (puce M) ou Intel selon le menu Pomme → À propos de ce Mac.")}
      </p>
    </section>
  )
}
