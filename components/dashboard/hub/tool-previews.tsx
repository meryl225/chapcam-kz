import Image from 'next/image'
import { Mic, Play, Radio, ArrowRight, Monitor, Cpu, Zap } from 'lucide-react'

/* ---------- ESIM ChapCam : 1000+ apps au-dessus d'un téléphone ---------- */
export function EsimPreview() {
  return (
    <div className="relative aspect-[785/346] w-full overflow-hidden rounded-xl border border-hairline bg-[#1d4ed8]">
      <Image
        src="/images/esim-apps.png"
        alt="Plus de 1000 applications supportées par les numéros eSIM ChapCam"
        fill
        sizes="260px"
        className="object-cover object-top"
      />
    </div>
  )
}

/* ---------- Live Swap : visage original -> IA -> visage transforme ---------- */
export function LiveSwapPreview() {
  return (
    <div className="flex items-center justify-center gap-2 rounded-xl border border-hairline bg-black/30 p-3">
      <div className="relative h-20 w-20 overflow-hidden rounded-lg">
        <Image
          src="/swap/face-original.png"
          alt="Visage original"
          fill
          sizes="80px"
          className="object-cover"
        />
        <span className="absolute bottom-0 left-0 right-0 bg-black/60 py-0.5 text-center text-[9px] font-semibold text-foreground">
          Original
        </span>
      </div>

      <div className="flex flex-col items-center gap-1">
        <div className="cc-flow h-0.5 w-8 rounded-full bg-gradient-to-r from-transparent via-primary to-transparent" />
        <span className="text-[9px] font-bold text-primary">IA</span>
        <div className="cc-flow h-0.5 w-8 rounded-full bg-gradient-to-r from-transparent via-primary to-transparent" />
      </div>

      <div className="relative h-20 w-20 overflow-hidden rounded-lg ring-2 ring-primary/50">
        <Image
          src="/swap/face-transformed.png"
          alt="Visage transformé"
          fill
          sizes="80px"
          className="object-cover"
        />
        <span className="absolute bottom-0 left-0 right-0 bg-primary/80 py-0.5 text-center text-[9px] font-semibold text-black">
          ChapCam
        </span>
      </div>
    </div>
  )
}

/* ---------- Live Pro : mini interface de stream type OBS/Twitch ---------- */
export function LiveProPreview() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-hairline bg-black/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1 rounded bg-red-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
          <span className="cc-blink h-1.5 w-1.5 rounded-full bg-white" />
          LIVE
        </span>
        <Radio className="h-3.5 w-3.5 text-violet-400" />
      </div>
      <div className="flex gap-2">
        <div className="flex h-16 flex-1 items-center justify-center rounded-md bg-gradient-to-br from-violet-900/50 to-violet-600/20">
          <Play className="h-5 w-5 text-violet-300" fill="currentColor" />
        </div>
        <div className="h-16 w-12 rounded-md border border-violet-500/40 bg-violet-500/10" />
      </div>
      <div className="mt-2 flex gap-1">
        <div className="h-1.5 flex-1 rounded-full bg-violet-500/60" />
        <div className="h-1.5 w-6 rounded-full bg-white/20" />
      </div>
    </div>
  )
}

/* ---------- Voice Changer : onde audio animee + micro ---------- */
export function VoiceChangerPreview() {
  const bars = [0, 0.15, 0.3, 0.1, 0.45, 0.25, 0.05, 0.35, 0.2, 0.4, 0.12, 0.3]
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-hairline bg-black/30 p-3">
      <div className="flex h-12 flex-1 items-center gap-[3px]">
        {bars.map((delay, i) => (
          <span
            key={i}
            className="cc-wave-bar w-full rounded-full bg-cyan-400"
            style={{ height: '100%', animationDelay: `${delay}s` }}
          />
        ))}
      </div>
      <div className="cc-pulse flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 ring-2 ring-cyan-400/40">
        <Mic className="h-5 w-5 text-cyan-300" />
      </div>
    </div>
  )
}

/* ---------- Voice Translator : micro central + langues + fleches ---------- */
export function VoiceTranslatorPreview() {
  return (
    <div className="flex items-center justify-center gap-2 rounded-xl border border-hairline bg-black/30 p-3">
      <span className="rounded-md bg-blue-500/15 px-2 py-1 text-[10px] font-bold text-blue-300">FR</span>
      <ArrowRight className="h-3 w-3 text-text-faint" />
      <div className="cc-pulse flex h-11 w-11 items-center justify-center rounded-full bg-blue-500/20 ring-2 ring-blue-400/40">
        <Mic className="h-5 w-5 text-blue-300" />
      </div>
      <ArrowRight className="h-3 w-3 text-text-faint" />
      <div className="flex flex-col gap-1">
        <span className="rounded-md bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold text-blue-300">EN</span>
        <span className="rounded-md bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold text-blue-300">ES</span>
      </div>
    </div>
  )
}

/* ---------- Photo -> Video ---------- */
export function PhotoVideoPreview() {
  return (
    <div className="flex items-center justify-center gap-2 rounded-xl border border-hairline bg-black/30 p-3">
      <div className="relative h-20 w-20 overflow-hidden rounded-lg">
        <Image src="/swap/face-original.png" alt="Photo" fill sizes="80px" className="object-cover grayscale" />
        <span className="absolute bottom-0 left-0 right-0 bg-black/60 py-0.5 text-center text-[9px] font-semibold text-foreground">
          Photo
        </span>
      </div>
      <div className="flex flex-col items-center gap-1">
        <div className="cc-flow h-0.5 w-8 rounded-full bg-gradient-to-r from-transparent via-orange-400 to-transparent" />
        <span className="text-[9px] font-bold text-orange-400">IA</span>
      </div>
      <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg ring-2 ring-orange-400/50">
        <Image src="/swap/face-transformed.png" alt="Vidéo" fill sizes="80px" className="object-cover" />
        <div className="cc-pulse relative flex h-7 w-7 items-center justify-center rounded-full bg-black/50">
          <Play className="h-3.5 w-3.5 text-foreground" fill="currentColor" />
        </div>
        <span className="absolute bottom-0 left-0 right-0 bg-orange-500/80 py-0.5 text-center text-[9px] font-semibold text-black">
          Vidéo
        </span>
      </div>
    </div>
  )
}

/* ---------- Traduction Video : miniature + sous-titre Hello->Bonjour ---------- */
export function VideoTranslationPreview() {
  const bars = [0.1, 0.3, 0.2, 0.4, 0.15, 0.35, 0.25]
  return (
    <div className="rounded-xl border border-hairline bg-black/30 p-3">
      <div className="relative mb-2 flex h-12 items-end justify-center overflow-hidden rounded-md bg-gradient-to-br from-blue-900/50 to-blue-600/20 pb-1">
        <Play className="absolute top-1/2 left-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-blue-200" fill="currentColor" />
        <div className="z-10 flex h-6 items-center gap-[3px]">
          {bars.map((d, i) => (
            <span key={i} className="cc-wave-bar w-1 rounded-full bg-blue-300" style={{ height: '100%', animationDelay: `${d}s` }} />
          ))}
        </div>
      </div>
      <div className="flex items-center justify-center gap-2 text-[11px] font-semibold">
        <span className="rounded bg-muted px-2 py-0.5 text-muted-foreground">Hello</span>
        <ArrowRight className="h-3 w-3 text-blue-400" />
        <span className="rounded bg-blue-500/20 px-2 py-0.5 text-blue-200">Bonjour</span>
      </div>
    </div>
  )
}

/* ---------- ChapCam PC : app de bureau "mode gamer" ---------- */
export function DesktopPCPreview() {
  return (
    <div className="rounded-xl border border-hairline bg-black/30 p-3">
      <div className="flex items-center gap-3">
        {/* Mini "ecran" PC */}
        <div className="relative flex h-16 w-24 shrink-0 flex-col overflow-hidden rounded-md border border-primary/30 bg-gradient-to-br from-primary/15 to-black/40">
          <div className="flex items-center gap-1 border-b border-primary/20 bg-black/40 px-1.5 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-primary/70" />
            <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
          </div>
          <div className="flex flex-1 items-center justify-center">
            <Monitor className="h-6 w-6 text-primary" />
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-1.5">
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-primary">
            <Zap className="h-3.5 w-3.5" fill="currentColor" />
            60 FPS · GPU local
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Cpu className="h-3 w-3 text-primary/70" />
            Windows · sans latence cloud
          </span>
          <div className="mt-0.5 flex gap-1">
            <span className="h-1.5 flex-1 rounded-full bg-primary/60" />
            <span className="h-1.5 w-4 rounded-full bg-white/15" />
          </div>
        </div>
      </div>
    </div>
  )
}
