"use client"

import Image from "next/image"
import Link from "next/link"
import { useState, useSyncExternalStore } from "react"
import { ArrowLeft, Cpu, Download, Info, Lock, MonitorSmartphone, ShieldCheck, Zap } from "lucide-react"
import { LanguageToggle } from "@/components/language-toggle"
import { HomepageFooter } from "@/components/homepage-footer"
import { DESKTOP_VERSION, desktopReleases, type DesktopRelease } from "@/lib/desktop-releases"
import { useT } from "@/lib/i18n/language-provider"

type DetectedOS = "mac" | "windows" | null

const OS_ICONS = {
  windows: "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/windows/default.svg",
  mac: "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/apple/light.svg",
} as const

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

const formatSize = (bytes: number) => `${Math.round(bytes / 1_000_000)} Mo`

const features = [
  { icon: Zap, title: "Temps réel", description: "Face swap instantané, sans latence perceptible." },
  { icon: MonitorSmartphone, title: "Caméra virtuelle", description: "Fonctionne dans Zoom, Teams, WhatsApp et OBS." },
  { icon: Lock, title: "100% privé", description: "Le traitement se fait localement sur votre machine." },
  { icon: Cpu, title: "Accéléré GPU", description: "Exploite votre carte graphique pour plus de fluidité." },
]

const installSteps = {
  windows: [
    "Ouvrez le fichier .exe téléchargé.",
    "Suivez l'assistant d'installation. Si SmartScreen s'affiche, cliquez sur « Informations complémentaires » puis « Exécuter quand même ».",
    "Lancez ChapCam depuis le menu Démarrer et choisissez « ChapCam Camera » dans votre application d'appel.",
  ],
  mac: [
    "Ouvrez le fichier .dmg téléchargé.",
    "Glissez ChapCam dans le dossier Applications.",
    "Ouvrez ChapCam et autorisez l'accès à la caméra dans Réglages Système.",
  ],
}

const requirements = {
  windows: ["Windows 11 (x64)", "8 Go de RAM recommandés", "GPU NVIDIA recommandé", "Webcam intégrée ou externe"],
  mac: ["macOS 12.3 Monterey ou plus récent", "8 Go de RAM recommandés", "Puce Apple M recommandée", "Webcam intégrée ou externe"],
}

function DownloadButton({ release, large = false }: { release: DesktopRelease; large?: boolean }) {
  const t = useT()
  if (release.status === "unavailable" || !release.url) {
    return (
      <span className="inline-flex items-center justify-center rounded-xl border border-dashed border-[#cfdeec] px-4 py-3 text-sm font-semibold text-[#7487a1]">
        {t("Bientôt disponible")}
      </span>
    )
  }
  return (
    <a
      href={release.url}
      download={release.fileName}
      style={{ color: "#ffffff" }}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-[#0ea5e9] to-[#7c3aed] font-bold shadow-[0_14px_30px_-14px_rgba(37,99,235,.8)] transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#38bdf8]/40 ${
        large ? "px-6 py-4 text-base" : "px-4 py-2.5 text-sm"
      }`}
    >
      <Download className={large ? "h-5 w-5" : "h-4 w-4"} aria-hidden="true" />
      {large ? `${t("Télécharger pour")} ${release.title}` : t("Télécharger")}
    </a>
  )
}

function AppWindowPreview() {
  return (
    <div className="relative">
      <div className="overflow-hidden rounded-[22px] border border-[#d8e8f6] bg-white shadow-[0_40px_80px_-40px_rgba(7,26,66,.55)]">
        <div className="flex items-center gap-3 border-b border-[#e3eef8] bg-[#f8fbff] px-4 py-3">
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="size-3 rounded-full bg-[#ff5f57]" />
            <span className="size-3 rounded-full bg-[#febc2e]" />
            <span className="size-3 rounded-full bg-[#28c840]" />
          </div>
          <p className="mx-auto flex items-center gap-2 text-xs font-semibold text-[#607493]">
            <Image src="/images/chapcam-logo.png" alt="" width={16} height={16} className="h-4 w-4 rounded" />
            ChapCam Desktop
          </p>
          <span className="w-12" aria-hidden="true" />
        </div>
        <div className="relative aspect-video bg-[#071a42]">
          <video
            src="/videos/live-swap-1476.mp4"
            autoPlay
            muted
            loop
            playsInline
            aria-label="Démonstration du Live Swap ChapCam"
            className="h-full w-full object-cover"
          />
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-[#071a42]/70 px-2.5 py-1 text-[11px] font-bold text-[#f8fbff] backdrop-blur">
            <span className="size-1.5 animate-pulse rounded-full bg-[#ff5f57]" />
            LIVE
          </span>
        </div>
      </div>

      <div className="absolute -bottom-5 -left-3 flex items-center gap-3 rounded-2xl border border-[#d8e8f6] bg-white px-4 py-3 shadow-[0_18px_40px_-24px_rgba(7,26,66,.6)] sm:-left-6">
        <span className="flex size-9 items-center justify-center rounded-xl bg-[#e0f2fe]">
          <MonitorSmartphone className="h-4 w-4 text-[#0369a1]" aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-bold text-[#071a42]">ChapCam Camera</p>
          <p className="text-[11px] text-[#607493]">Zoom · Teams · WhatsApp</p>
        </div>
      </div>
    </div>
  )
}

export default function DownloadPage() {
  const t = useT()
  const os = useSyncExternalStore(subscribeNoop, detectOS, () => null)
  const unavailable = useSyncExternalStore(
    subscribeNoop,
    () => new URLSearchParams(window.location.search).get("unavailable"),
    () => null,
  )
  const [guideOS, setGuideOS] = useState<"windows" | "mac" | null>(null)
  const activeGuide = guideOS ?? os ?? "windows"

  const primary =
    desktopReleases.find((r) => r.id === (os === "mac" ? "mac-arm64" : "windows-x64")) ?? desktopReleases[0]
  const others = desktopReleases.filter((r) => r.id !== primary.id)

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f4f9ff] text-[#071a42]">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(125,211,252,0.38),transparent_38%),linear-gradient(180deg,#f8fbff_0%,#e8f4ff_65%,#f8fbff_100%)]"
      >
        <div className="absolute inset-0 opacity-75 [background-image:radial-gradient(circle,rgba(14,165,233,.22)_1px,transparent_1.5px)] [background-size:42px_42px] [mask-image:linear-gradient(to_bottom,transparent,black_8%,black_92%,transparent)]" />
        <span className="absolute left-[5%] top-[14%] text-4xl font-light text-[#0ea5e9]/20">∞</span>
        <span className="absolute right-[8%] top-[48%] text-5xl font-light text-[#7c3aed]/15">∞</span>
      </div>

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <header className="flex h-[76px] items-center justify-between gap-4 border-b border-[#d8e8f6]/80">
          <Link href="/" className="flex items-center gap-2.5" aria-label="ChapCam accueil">
            <Image src="/images/chapcam-logo.png" alt="" width={38} height={38} priority className="h-9 w-9 rounded-xl object-cover shadow-sm" />
            <span className="text-lg font-bold tracking-[-.03em]">ChapCam</span>
          </Link>
          <div className="flex items-center gap-3">
            <LanguageToggle variant="light" />
            <Link
              href="/"
              className="hidden items-center gap-1.5 rounded-full border border-[#d8e8f6] bg-white px-4 py-2 text-sm font-semibold text-[#071a42] transition hover:border-[#38bdf8] sm:inline-flex"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {t("Accueil")}
            </Link>
          </div>
        </header>

        <main>
          <section className="grid items-center gap-14 py-12 lg:grid-cols-[1fr_1.1fr] lg:py-20">
            <div className="flex flex-col items-start gap-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#bae6fd] bg-white px-3 py-1 text-xs font-bold uppercase tracking-[.14em] text-[#0891b2]">
                Desktop · v{DESKTOP_VERSION}
              </span>
              <h1 style={{ color: "#071a42" }} className="text-4xl font-bold leading-[1.05] tracking-[-.045em] text-balance sm:text-5xl lg:text-6xl">
                {t("Votre webcam,")}{" "}
                <span className="bg-gradient-to-r from-[#0ea5e9] to-[#7c3aed] bg-clip-text text-transparent">
                  {t("un nouveau visage.")}
                </span>
              </h1>
              <p className="max-w-lg text-base leading-7 text-[#607493] text-pretty">
                {t("Installez ChapCam sur votre ordinateur et transformez-vous en direct pendant vos appels vidéo, réunions et lives.")}
              </p>

              {unavailable && (
                <p role="status" className="w-full rounded-xl border border-[#f59e0b]/40 bg-[#fef3c7] p-4 text-sm text-[#92400e]">
                  {t("Cette version n'est pas encore publiée. Choisissez un autre installateur ci-dessous.")}
                </p>
              )}

              <div className="flex flex-col gap-3">
                <DownloadButton release={primary} large />
                <p className="text-xs font-medium text-[#7487a1]">
                  {primary.format} · {formatSize(primary.sizeBytes)} · {t(primary.compatibility)}
                  {os && ` · ${t("détecté automatiquement")}`}
                </p>
              </div>
            </div>

            <AppWindowPreview />
          </section>

          <section aria-labelledby="installers-title" className="pt-6">
            <h2 id="installers-title" style={{ color: "#0891b2" }} className="text-sm font-bold uppercase tracking-[.14em] text-[#0891b2]">
              {t("Tous les installateurs")}
            </h2>
            <ul className="mt-4 flex flex-col divide-y divide-[#e3eef8] overflow-hidden rounded-[20px] border border-[#dbe9f4] bg-white">
              {[primary, ...others].map((release) => (
                <li key={release.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-[#e3eef8] bg-[#f4f9ff] p-2.5">
                      <img src={OS_ICONS[release.os]} alt="" className="h-full w-full object-contain" />
                    </span>
                    <div>
                      <p className="flex flex-wrap items-center gap-2 font-bold">
                        {release.title}
                        {release.signed && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#e0f2fe] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#0369a1]">
                            <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                            {t("Signé")}
                          </span>
                        )}
                      </p>
                      <p className="text-sm leading-6 text-[#607493]">{t(release.compatibility)}</p>
                      <p className="font-mono text-xs text-[#7487a1]">
                        {release.fileName} · {formatSize(release.sizeBytes)}
                      </p>
                    </div>
                  </div>
                  <DownloadButton release={release} />
                </li>
              ))}
            </ul>
            <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-[#7487a1]">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0ea5e9]" aria-hidden="true" />
              {t("Pour un Mac, choisissez Apple Silicon (puce M) ou Intel selon le menu Pomme → À propos de ce Mac.")}
            </p>
          </section>

          <section aria-labelledby="features-title" className="pt-20">
            <h2 id="features-title" className="sr-only">
              {t("Pourquoi l'application desktop")}
            </h2>
            <div className="grid gap-px overflow-hidden rounded-[20px] border border-[#dbe9f4] bg-[#dbe9f4] sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => (
                <div key={feature.title} className="flex flex-col gap-3 bg-white p-6">
                  <feature.icon className="h-5 w-5 text-[#2563eb]" aria-hidden="true" />
                  <h3 style={{ color: "#071a42" }} className="font-bold">{t(feature.title)}</h3>
                  <p className="text-sm leading-6 text-[#607493]">{t(feature.description)}</p>
                </div>
              ))}
            </div>
          </section>

          <section aria-labelledby="guide-title" className="grid gap-10 py-20 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="flex flex-col gap-5">
              <h2 id="guide-title" style={{ color: "#071a42" }} className="text-3xl font-bold tracking-[-.04em] text-balance sm:text-4xl">
                {t("Installé en trois étapes")}
              </h2>
              <div role="tablist" aria-label={t("Système d'exploitation")} className="inline-flex w-fit rounded-full border border-[#d8e8f6] bg-white p-1">
                {(["windows", "mac"] as const).map((key) => (
                  <button
                    key={key}
                    role="tab"
                    type="button"
                    aria-selected={activeGuide === key}
                    onClick={() => setGuideOS(key)}
                    style={
                      activeGuide === key
                        ? { backgroundColor: "#071a42", color: "#f8fbff" }
                        : { backgroundColor: "transparent", color: "#607493" }
                    }
                    className="rounded-full px-4 py-1.5 text-sm font-semibold transition"
                  >
                    {key === "windows" ? "Windows" : "macOS"}
                  </button>
                ))}
              </div>
              <ul className="flex flex-col gap-2 text-sm text-[#607493]">
                {requirements[activeGuide].map((req) => (
                  <li key={req} className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-[#0ea5e9]" aria-hidden="true" />
                    {t(req)}
                  </li>
                ))}
              </ul>
            </div>

            <ol role="tabpanel" className="relative flex flex-col gap-4">
              {installSteps[activeGuide].map((step, i) => (
                <li key={step} className="relative flex gap-4 rounded-[20px] border border-[#dbe9f4] bg-white p-5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0ea5e9] to-[#7c3aed] text-sm font-bold text-[#f8fbff]">
                    {i + 1}
                  </span>
                  <p className="pt-1.5 text-sm leading-6 text-[#071a42]">{t(step)}</p>
                </li>
              ))}
            </ol>
          </section>

          <p className="pb-12 text-center text-sm text-[#607493]">
            {t("Besoin d'aide ?")}{" "}
            <a href="https://t.me/chapcam1" target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb" }} className="font-semibold hover:underline">
              {t("Contactez-nous sur Telegram")}
            </a>
          </p>
        </main>
      </div>
      <HomepageFooter />
    </div>
  )
}
