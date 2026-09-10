"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  Upload,
  X,
  Loader2,
  ImageIcon,
  Video,
  AudioLines,
  Sparkles,
  History,
  Lock,
  Zap,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

type Media = "image" | "audio" | "video"
type Status = "idle" | "uploading" | "processing" | "done" | "error"
type Verdict = "fake" | "real" | "unknown"

interface HistoryJob {
  uuid: string
  media: Media
  cost: number
  status: "processing" | "completed" | "failed"
  verdict: Verdict | null
  confidence: number | null
  filename: string | null
  created_at: string
}

const COST: Record<Media, number> = { image: 1, audio: 1, video: 2 }

const MAX_MB: Record<Media, number> = { image: 12, audio: 25, video: 60 }

function mediaFromFile(f: File): Media | null {
  if (f.type.startsWith("image/")) return "image"
  if (f.type.startsWith("audio/")) return "audio"
  if (f.type.startsWith("video/")) return "video"
  return null
}

const MEDIA_META: Record<Media, { icon: typeof ImageIcon; label: string }> = {
  image: { icon: ImageIcon, label: "Image" },
  audio: { icon: AudioLines, label: "Audio" },
  video: { icon: Video, label: "Vidéo" },
}

export default function ChapVerifyPage() {
  const { toast } = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [media, setMedia] = useState<Media | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>("idle")
  const [result, setResult] = useState<{ verdict: Verdict; confidence: number; media: Media } | null>(null)
  const [credits, setCredits] = useState<number | null>(null)
  const [history, setHistory] = useState<HistoryJob[]>([])
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refreshCredits = useCallback(async () => {
    try {
      const res = await fetch("/api/chapverify?info=quota")
      const json = await res.json()
      if (typeof json.credits === "number") setCredits(json.credits)
    } catch {
      /* optionnel */
    }
  }, [])

  const refreshHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/chapverify?info=history")
      const json = await res.json()
      if (Array.isArray(json.jobs)) setHistory(json.jobs)
    } catch {
      /* optionnel */
    }
  }, [])

  useEffect(() => {
    refreshCredits()
    refreshHistory()
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [refreshCredits, refreshHistory])

  const clearFile = useCallback(() => {
    setFile(null)
    setMedia(null)
    setResult(null)
    setStatus("idle")
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }, [])

  const onSelect = useCallback(
    (f: File | undefined) => {
      if (!f) return
      const m = mediaFromFile(f)
      if (!m) {
        toast({
          title: "Format non supporté",
          description: "Envoie une image, un fichier audio ou une vidéo.",
          variant: "destructive",
        })
        return
      }
      if (f.size > MAX_MB[m] * 1024 * 1024) {
        toast({
          title: "Fichier trop volumineux",
          description: `Max ${MAX_MB[m]} Mo pour un fichier ${MEDIA_META[m].label.toLowerCase()}.`,
          variant: "destructive",
        })
        return
      }
      setResult(null)
      setStatus("idle")
      setFile(f)
      setMedia(m)
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return URL.createObjectURL(f)
      })
    },
    [toast],
  )

  const pollResult = useCallback(
    (uuid: string) => {
      if (pollRef.current) clearInterval(pollRef.current)
      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/chapverify?uuid=${encodeURIComponent(uuid)}`)
          const json = await res.json()
          if (json.status === "completed") {
            if (pollRef.current) clearInterval(pollRef.current)
            setResult({ verdict: json.verdict as Verdict, confidence: json.confidence ?? 0, media: json.media })
            setStatus("done")
            refreshHistory()
          } else if (json.status === "failed") {
            if (pollRef.current) clearInterval(pollRef.current)
            setStatus("error")
            if (typeof json.remaining === "number") setCredits(json.remaining)
            toast({
              title: "Analyse échouée",
              description:
                (json.error || "Le fichier n'a pas pu être analysé.") +
                (json.refunded ? " Ton crédit a été remboursé." : ""),
              variant: "destructive",
            })
            refreshHistory()
          }
        } catch {
          /* retry au prochain tick */
        }
      }, 4000)
    },
    [refreshHistory, toast],
  )

  const verify = useCallback(async () => {
    if (!file || !media) return
    setStatus("uploading")
    setResult(null)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/chapverify", { method: "POST", body: fd })
      const json = await res.json()
      if (!res.ok) {
        setStatus("idle")
        if (typeof json.remaining === "number") setCredits(json.remaining)
        toast({
          title: json.code === "no_plan" ? "Aucun forfait actif" : "Impossible de lancer l'analyse",
          description: json.error || "Réessaie dans un instant.",
          variant: "destructive",
        })
        return
      }
      if (typeof json.remaining === "number") setCredits(json.remaining)
      setStatus("processing")
      pollResult(json.uuid)
    } catch {
      setStatus("idle")
      toast({ title: "Erreur réseau", description: "Vérifie ta connexion et réessaie.", variant: "destructive" })
    }
  }, [file, media, pollResult, toast])

  const busy = status === "uploading" || status === "processing"

  return (
    <div className="min-h-screen bg-[#0a0505] text-white">
      {/* Halo rouge d'ambiance */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(60% 40% at 50% 0%, rgba(220,38,38,0.18), transparent 70%), radial-gradient(40% 30% at 100% 100%, rgba(220,38,38,0.08), transparent 70%)",
        }}
      />

      <div className="relative z-[1] mx-auto max-w-3xl px-4 py-8 md:py-12">
        {/* Hero */}
        <header className="mb-8 text-center">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-red-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
            Anti-Deepfake
          </span>
          <h1 className="flex items-center justify-center gap-3 text-4xl font-extrabold tracking-tight md:text-5xl">
            <ShieldCheck className="h-9 w-9 text-red-500 md:h-11 md:w-11" strokeWidth={2.5} />
            <span>
              Chap<span className="text-red-500">Verify</span>
            </span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-pretty text-sm leading-relaxed text-white/60 md:text-base">
            Vérifie si une image, une voix ou une vidéo est un deepfake généré par IA. Analyse
            professionnelle propulsée par la détection Resemble.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-white/50">
            <Zap className="h-3.5 w-3.5 text-red-400" />
            {credits === null ? (
              <span className="h-3 w-24 animate-pulse rounded bg-white/10" />
            ) : (
              <span>
                <span className="text-red-300">{credits}</span> crédits disponibles
              </span>
            )}
          </div>
        </header>

        {/* Carte principale */}
        <div className="rounded-3xl border border-red-500/20 bg-white/[0.03] p-4 shadow-[0_20px_80px_-20px_rgba(220,38,38,0.35)] backdrop-blur-xl md:p-6">
          {status === "done" && result ? (
            <VerdictPanel result={result} filename={file?.name} onReset={clearFile} />
          ) : (
            <>
              {/* Zone de dépôt */}
              <input
                ref={inputRef}
                type="file"
                accept="image/*,audio/*,video/*"
                className="hidden"
                onChange={(e) => onSelect(e.target.files?.[0])}
              />

              {!file ? (
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragOver(true)
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setDragOver(false)
                    onSelect(e.dataTransfer.files?.[0])
                  }}
                  className={`flex w-full flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-10 text-center transition-all md:p-14 ${
                    dragOver
                      ? "border-red-500 bg-red-500/10"
                      : "border-white/15 bg-white/[0.02] hover:border-red-500/50 hover:bg-red-500/[0.04]"
                  }`}
                >
                  <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/15 text-red-400">
                    <Upload className="h-8 w-8" strokeWidth={2} />
                  </span>
                  <span className="space-y-1">
                    <span className="block text-base font-bold">Dépose un fichier à vérifier</span>
                    <span className="block text-sm text-white/50">ou clique pour parcourir</span>
                  </span>
                  <span className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-medium text-white/40">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1">
                      <ImageIcon className="h-3 w-3" /> Image · 1 crédit
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1">
                      <AudioLines className="h-3 w-3" /> Audio · 1 crédit
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1">
                      <Video className="h-3 w-3" /> Vidéo · 2 crédits
                    </span>
                  </span>
                </button>
              ) : (
                <div className="space-y-4">
                  {/* Aperçu */}
                  <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                    {!busy && (
                      <button
                        type="button"
                        onClick={clearFile}
                        className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white/80 backdrop-blur transition-colors hover:bg-red-500 hover:text-white"
                        aria-label="Retirer le fichier"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                    <MediaPreview media={media!} url={previewUrl} />

                    {busy && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 backdrop-blur-sm">
                        <ScannerAnimation />
                        <p className="text-sm font-semibold text-red-200">
                          {status === "uploading" ? "Envoi du fichier…" : "Analyse en cours…"}
                        </p>
                        <p className="text-xs text-white/50">Détection des artefacts IA</p>
                      </div>
                    )}
                  </div>

                  {/* Ligne d'info fichier */}
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] px-4 py-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500/15 text-red-400">
                        {(() => {
                          const Icon = MEDIA_META[media!].icon
                          return <Icon className="h-[18px] w-[18px]" />
                        })()}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{file.name}</p>
                        <p className="text-xs text-white/40">
                          {MEDIA_META[media!].label} · {COST[media!]} crédit{COST[media!] > 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* CTA CHAPVERIFY */}
                  <button
                    type="button"
                    onClick={verify}
                    disabled={busy}
                    className="group relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-red-600 py-4 text-base font-extrabold uppercase tracking-wide text-white shadow-[0_10px_40px_-8px_rgba(220,38,38,0.7)] transition-all hover:bg-red-500 hover:shadow-[0_12px_48px_-6px_rgba(220,38,38,0.9)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                    {busy ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        {status === "uploading" ? "Envoi…" : "Analyse…"}
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-5 w-5" strokeWidth={2.5} />
                        Lancer ChapVerify
                      </>
                    )}
                  </button>
                  <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-white/40">
                    <Lock className="h-3 w-3" />
                    Fichier analysé de façon sécurisée, jamais partagé.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Comment ça marche */}
        {!file && (
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { icon: Upload, title: "1. Dépose", text: "Une image, une voix ou une vidéo suspecte." },
              { icon: Sparkles, title: "2. Analyse IA", text: "Resemble détecte les artefacts de synthèse." },
              { icon: ShieldCheck, title: "3. Verdict", text: "Authentique ou deepfake, avec un score de confiance." },
            ].map((s) => (
              <div key={s.title} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <s.icon className="mb-2 h-5 w-5 text-red-400" />
                <p className="text-sm font-bold">{s.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-white/50">{s.text}</p>
              </div>
            ))}
          </div>
        )}

        {/* Historique */}
        {history.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-white/60">
              <History className="h-4 w-4 text-red-400" />
              Vérifications récentes
            </h2>
            <div className="space-y-2">
              {history.map((job) => (
                <HistoryRow key={job.uuid} job={job} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function MediaPreview({ media, url }: { media: Media; url: string | null }) {
  if (!url) return <div className="aspect-video w-full" />
  if (media === "image") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url || "/placeholder.svg"} alt="Aperçu du fichier à vérifier" className="mx-auto max-h-[360px] w-full object-contain" />
  }
  if (media === "video") {
    return <video src={url} controls className="mx-auto max-h-[360px] w-full" />
  }
  return (
    <div className="flex flex-col items-center gap-4 p-8">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/15 text-red-400">
        <AudioLines className="h-8 w-8" />
      </span>
      <audio src={url} controls className="w-full max-w-md" />
    </div>
  )
}

function ScannerAnimation() {
  return (
    <span className="relative flex h-14 w-14 items-center justify-center">
      <span className="absolute inset-0 animate-ping rounded-full border-2 border-red-500/50" />
      <span className="absolute inset-0 rounded-full border-2 border-red-500/30" />
      <Loader2 className="h-7 w-7 animate-spin text-red-400" />
    </span>
  )
}

function VerdictPanel({
  result,
  filename,
  onReset,
}: {
  result: { verdict: Verdict; confidence: number; media: Media }
  filename?: string
  onReset: () => void
}) {
  const isFake = result.verdict === "fake"
  const isReal = result.verdict === "real"
  const unknown = result.verdict === "unknown"

  const cfg = isFake
    ? {
        icon: ShieldAlert,
        title: "Deepfake détecté",
        subtitle: "Ce contenu présente des signes de manipulation par IA.",
        color: "#dc2626",
        ring: "text-red-500",
        chip: "border-red-500/40 bg-red-500/15 text-red-200",
      }
    : isReal
      ? {
          icon: ShieldCheck,
          title: "Authentique",
          subtitle: "Aucun signe de synthèse détecté sur ce contenu.",
          color: "#22c55e",
          ring: "text-green-500",
          chip: "border-green-500/40 bg-green-500/15 text-green-200",
        }
      : {
          icon: ShieldQuestion,
          title: "Non concluant",
          subtitle: "L'analyse n'a pas permis de trancher clairement.",
          color: "#eab308",
          ring: "text-yellow-500",
          chip: "border-yellow-500/40 bg-yellow-500/15 text-yellow-200",
        }

  const Icon = cfg.icon
  const pct = Math.max(0, Math.min(100, result.confidence))
  const circumference = 2 * Math.PI * 52

  return (
    <div className="flex flex-col items-center gap-6 py-4 text-center">
      {/* Anneau de confiance */}
      <div className="relative flex h-40 w-40 items-center justify-center">
        <svg className="h-40 w-40 -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke={cfg.color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - (pct / 100) * circumference}
            style={{ transition: "stroke-dashoffset 1s ease-out" }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <Icon className={`h-8 w-8 ${cfg.ring}`} strokeWidth={2.5} />
          {!unknown && <span className="mt-1 text-2xl font-extrabold">{pct}%</span>}
          <span className="text-[10px] uppercase tracking-widest text-white/40">confiance</span>
        </div>
      </div>

      <div className="space-y-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${cfg.chip}`}>
          {MEDIA_META[result.media].label}
        </span>
        <h2 className="text-3xl font-extrabold tracking-tight">{cfg.title}</h2>
        <p className="mx-auto max-w-sm text-pretty text-sm leading-relaxed text-white/60">{cfg.subtitle}</p>
        {filename && <p className="truncate text-xs text-white/35">{filename}</p>}
      </div>

      <button
        type="button"
        onClick={onReset}
        className="flex items-center gap-2 rounded-2xl border border-red-500/40 bg-red-500/10 px-6 py-3 text-sm font-bold uppercase tracking-wide text-red-200 transition-colors hover:bg-red-500/20"
      >
        <ShieldCheck className="h-4 w-4" />
        Vérifier un autre fichier
      </button>
    </div>
  )
}

function HistoryRow({ job }: { job: HistoryJob }) {
  const Icon = MEDIA_META[job.media].icon
  const verdictLabel =
    job.status === "failed"
      ? "Échec"
      : job.status === "processing"
        ? "En cours"
        : job.verdict === "fake"
          ? "Deepfake"
          : job.verdict === "real"
            ? "Authentique"
            : "Non concluant"

  const tone =
    job.status === "completed" && job.verdict === "fake"
      ? "text-red-300"
      : job.status === "completed" && job.verdict === "real"
        ? "text-green-300"
        : "text-white/50"

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-white/60">
          <Icon className="h-4 w-4" />
        </span>
        <span className="truncate text-sm text-white/70">{job.filename || MEDIA_META[job.media].label}</span>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {job.status === "completed" && typeof job.confidence === "number" && (
          <span className="text-xs text-white/40">{job.confidence}%</span>
        )}
        <span className={`text-xs font-bold uppercase tracking-wide ${tone}`}>{verdictLabel}</span>
      </div>
    </div>
  )
}
