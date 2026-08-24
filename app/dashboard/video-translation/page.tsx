"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Upload,
  X,
  Loader2,
  Download,
  Languages,
  Video,
  Gauge,
  Sparkles,
  Captions,
  Search,
  Check,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { TranslationCreditPacksSection } from "@/components/translation/credit-packs-section"
import { VideoHistorySection } from "@/components/video-history-section"
import { downloadVideo } from "@/lib/download-video"

type Status = "idle" | "uploading" | "processing" | "completed" | "failed"

const MAX_SECONDS = 60
const POLL_MS = 8000

export default function VideoTranslationPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [loading, setLoading] = useState(true)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [languages, setLanguages] = useState<string[]>([])
  const [language, setLanguage] = useState<string>("")
  const [search, setSearch] = useState("")
  const [mode, setMode] = useState<"speed" | "precision">("speed")
  const [caption, setCaption] = useState(false)

  const [status, setStatus] = useState<Status>("idle")
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [credits, setCredits] = useState<number | null>(null)
  // Téléchargement de la vidéo traduite (état du bouton).
  const [downloading, setDownloading] = useState(false)
  // Force le rafraîchissement de la section "Mes vidéos" à chaque traduction terminée.
  const [historyRefresh, setHistoryRefresh] = useState(0)

  const busy = status === "uploading" || status === "processing"
  const cost = mode === "precision" ? 2 : 1

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/login")
        return
      }
      try {
        const [lRes, cRes] = await Promise.all([
          fetch("/api/heygen/video-translation?info=languages"),
          fetch("/api/heygen/video-translation?info=quota"),
        ])
        const lJson = await lRes.json()
        if (lRes.ok && Array.isArray(lJson.languages)) setLanguages(lJson.languages)
        const cJson = await cRes.json()
        if (cRes.ok) setCredits(Math.max(0, Number(cJson.remaining) || 0))
      } catch {
        // langues/solde optionnels
      }
      setLoading(false)
    }
    init()
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [router, supabase])

  const onSelectFile = useCallback((f: File | undefined) => {
    if (!f) return
    if (!f.type.startsWith("video/")) {
      toast({ title: "Format invalide", description: "Choisis un fichier vidéo (MP4, MOV, WebM).", variant: "destructive" })
      return
    }
    if (f.size > 60 * 1024 * 1024) {
      toast({ title: "Vidéo trop volumineuse", description: `Max 60 Mo (~${MAX_SECONDS}s).`, variant: "destructive" })
      return
    }
    // Verifier la duree (<= 60s) avant d'accepter, pour borner le cout HeyGen.
    const url = URL.createObjectURL(f)
    const probe = document.createElement("video")
    probe.preload = "metadata"
    probe.onloadedmetadata = () => {
      const dur = probe.duration
      if (Number.isFinite(dur) && dur > MAX_SECONDS + 1) {
        URL.revokeObjectURL(url)
        toast({
          title: "Vidéo trop longue",
          description: `La vidéo doit durer ${MAX_SECONDS}s maximum (la tienne fait ${Math.round(dur)}s). Découpe-la puis réessaie.`,
          variant: "destructive",
        })
        return
      }
      setFile(f)
      setPreviewUrl(url)
      setVideoUrl(null)
      setStatus("idle")
    }
    probe.onerror = () => {
      URL.revokeObjectURL(url)
      toast({ title: "Vidéo illisible", description: "Impossible de lire cette vidéo. Essaie un autre fichier.", variant: "destructive" })
    }
    probe.src = url
  }, [toast])

  const startPolling = useCallback((id: string) => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/heygen/video-translation?id=${encodeURIComponent(id)}`)
        const json = await res.json()
        if (json.status === "completed" && json.video_url) {
          if (pollRef.current) clearInterval(pollRef.current)
          setVideoUrl(json.video_url)
          setStatus("completed")
          setHistoryRefresh((n) => n + 1)
          toast({ title: "Traduction prête !", description: "Ta vidéo traduite est disponible." })
        } else if (json.status === "failed") {
          if (pollRef.current) clearInterval(pollRef.current)
          setStatus("failed")
          // Le credit a ete rembourse cote serveur : rafraichir le solde affiche.
          try {
            const cRes = await fetch("/api/heygen/video-translation?info=quota")
            const cJson = await cRes.json()
            if (cRes.ok) setCredits(Math.max(0, Number(cJson.remaining) || 0))
          } catch {
            // non bloquant
          }
          toast({
            title: "Échec de la traduction",
            description: `${json.error || "La vidéo n'a pas pu être traduite."}${json.refunded ? " Ton crédit a été remboursé." : ""}`,
            variant: "destructive",
          })
        }
      } catch {
        // retry au prochain tick
      }
    }, POLL_MS)
  }, [toast])

  const handleTranslate = async () => {
    if (!file) {
      toast({ title: "Vidéo manquante", description: "Ajoute une vidéo à traduire.", variant: "destructive" })
      return
    }
    if (!language) {
      toast({ title: "Langue manquante", description: "Choisis une langue cible.", variant: "destructive" })
      return
    }
    if (credits !== null && credits < cost) {
      toast({
        title: "Crédits insuffisants",
        description: `Cette traduction coûte ${cost} crédit${cost > 1 ? "s" : ""}. Achète un pack ou passe à un forfait Premium/VIP.`,
        variant: "destructive",
      })
      return
    }

    setStatus("uploading")
    setVideoUrl(null)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("language", language)
      fd.append("mode", mode)
      fd.append("caption", String(caption))

      const res = await fetch("/api/heygen/video-translation", { method: "POST", body: fd })
      const json = await res.json()
      if (!res.ok) {
        setStatus("idle")
        if (res.status === 402) {
          if (json.code === "quota_exhausted" || json.code === "no_plan") setCredits(0)
          toast({ title: "Crédits insuffisants", description: json.error, variant: "destructive" })
        } else {
          toast({ title: "Erreur", description: json.error || "Impossible de lancer la traduction.", variant: "destructive" })
        }
        return
      }
      if (typeof json.remaining === "number") setCredits(json.remaining)
      setStatus("processing")
      startPolling(json.id)
      toast({ title: "Traduction lancée", description: "Cela peut prendre quelques minutes selon la durée..." })
    } catch {
      setStatus("idle")
      toast({ title: "Erreur réseau", description: "Réessaie dans un instant.", variant: "destructive" })
    }
  }

  const clearFile = () => {
    setFile(null)
    setPreviewUrl(null)
    setVideoUrl(null)
    setStatus("idle")
  }

  const filteredLanguages = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return languages
    return languages.filter((l) => l.toLowerCase().includes(q))
  }, [languages, search])

  const canTranslate = !!file && !!language && !busy

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 lg:p-6">
      {/* En-tete */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Languages className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground text-balance">
              Traduction de Vidéo
            </h1>
            <p className="text-sm text-muted-foreground text-pretty">
              Traduis ta vidéo dans une autre langue avec ta voix clonée et la synchro labiale.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-hairline bg-card px-3 py-2">
          <Languages className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Crédits</span>
          <span className={`text-sm font-bold ${credits !== null && credits <= 0 ? "text-destructive" : "text-primary"}`}>
            {credits === null ? "…" : credits}
          </span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[400px_1fr]">
        {/* ---------- Panneau gauche : configuration ---------- */}
        <div className="space-y-4">
          {/* Upload video */}
          <div
            onDrop={(e) => { e.preventDefault(); onSelectFile(e.dataTransfer.files?.[0]) }}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => !busy && fileInputRef.current?.click()}
            className={`relative flex aspect-video cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition-colors ${
              previewUrl ? "border-primary/60" : "border-hairline bg-card hover:border-primary/40"
            } ${busy ? "pointer-events-none opacity-60" : ""}`}
          >
            {previewUrl ? (
              <>
                <video src={previewUrl} className="h-full w-full object-contain" muted loop playsInline autoPlay />
                <button
                  onClick={(e) => { e.stopPropagation(); clearFile() }}
                  className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-white transition-transform hover:scale-110"
                  aria-label="Retirer la vidéo"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <Video className="mb-2 h-8 w-8 text-muted-foreground" />
                <p className="px-2 text-center text-sm font-medium text-foreground">Importer une vidéo</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-text-faint">
                  <Upload className="h-3.5 w-3.5" /> MP4, MOV ou WebM · {MAX_SECONDS}s max
                </p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm"
              onChange={(e) => onSelectFile(e.target.files?.[0])}
              className="hidden"
            />
          </div>

          {/* Langue cible */}
          <div className="rounded-2xl border border-hairline bg-card p-4">
            <label className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Languages className="h-3.5 w-3.5" /> Langue cible
            </label>
            <div className="relative mb-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-faint" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher une langue (French, Arabic, Swahili...)"
                className="w-full rounded-xl border border-hairline bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-text-faint focus:border-primary focus:outline-none"
                disabled={busy}
              />
            </div>
            <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
              {filteredLanguages.length === 0 ? (
                <p className="py-4 text-center text-xs text-text-faint">Aucune langue trouvée.</p>
              ) : (
                filteredLanguages.map((l) => {
                  const active = l === language
                  return (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setLanguage(l)}
                      disabled={busy}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors disabled:opacity-50 ${
                        active ? "bg-primary/15 font-semibold text-primary" : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <span className="truncate">{l}</span>
                      {active && <Check className="h-4 w-4 shrink-0" />}
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Mode de qualite */}
          <div className="rounded-2xl border border-hairline bg-card p-4">
            <label className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Gauge className="h-3.5 w-3.5" /> Qualité
            </label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: "speed", label: "Rapide", sub: "1 crédit · plus vite" },
                { value: "precision", label: "Précision", sub: "2 crédits · meilleure synchro" },
              ] as const).map((m) => {
                const active = mode === m.value
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMode(m.value)}
                    disabled={busy}
                    className={`flex flex-col items-start rounded-xl border p-3 text-left transition-colors disabled:opacity-50 ${
                      active ? "border-primary bg-primary/10" : "border-hairline hover:border-primary/40"
                    }`}
                  >
                    <span className={`text-sm font-semibold ${active ? "text-primary" : "text-foreground"}`}>{m.label}</span>
                    <span className="mt-0.5 text-[11px] text-muted-foreground">{m.sub}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Sous-titres */}
          <button
            type="button"
            onClick={() => setCaption((v) => !v)}
            disabled={busy}
            aria-pressed={caption}
            className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium transition-colors disabled:opacity-50 ${
              caption ? "border-primary bg-primary/10 text-primary" : "border-hairline text-foreground hover:border-primary/40"
            }`}
          >
            <span className="flex items-center gap-2">
              <Captions className="h-4 w-4" /> Ajouter des sous-titres
            </span>
            <span className={`flex h-5 w-9 items-center rounded-full p-0.5 transition-colors ${caption ? "bg-primary" : "bg-muted"}`}>
              <span className={`h-4 w-4 rounded-full bg-background transition-transform ${caption ? "translate-x-4" : ""}`} />
            </span>
          </button>

          {/* Bouton lancer */}
          <button
            onClick={handleTranslate}
            disabled={!canTranslate}
            className="btn-glow inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold uppercase tracking-tight text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {status === "uploading" ? "Envoi..." : "Traduction en cours..."}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Traduire ({cost} crédit{cost > 1 ? "s" : ""})
              </>
            )}
          </button>
        </div>

        {/* ---------- Panneau droit : resultat ---------- */}
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-hairline bg-card p-6">
          {status === "completed" && videoUrl ? (
            <div className="w-full max-w-xl">
              <video src={videoUrl} controls playsInline className="w-full rounded-xl" />
              <button
                type="button"
                onClick={async () => {
                  if (!videoUrl) return
                  setDownloading(true)
                  try {
                    await downloadVideo(videoUrl, `chapcam-traduction-${Date.now()}.mp4`)
                  } finally {
                    setDownloading(false)
                  }
                }}
                disabled={downloading}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-hairline bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-60"
              >
                {downloading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Enregistrement...</>
                ) : (
                  <><Download className="h-4 w-4" /> Télécharger la vidéo traduite</>
                )}
              </button>
            </div>
          ) : busy ? (
            <div className="flex flex-col items-center text-center">
              <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" />
              <p className="text-sm font-medium text-foreground">
                {status === "uploading" ? "Envoi de ta vidéo..." : "Traduction en cours..."}
              </p>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground text-pretty">
                La voix est clonée et resynchronisée sur les lèvres. Tu peux quitter cette page, la
                vidéo continuera d&apos;être générée.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center">
              <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Languages className="h-8 w-8" />
              </span>
              <p className="text-sm font-medium text-foreground">Ta vidéo traduite apparaîtra ici</p>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground text-pretty">
                Importe une vidéo (jusqu&apos;à 60s), choisis une langue et lance la traduction.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Historique permanent : toutes les vidéos traduites de cet utilisateur */}
      <VideoHistorySection tool="translation" refreshKey={historyRefresh} />

      {/* Packs de credits Traduction */}
      <TranslationCreditPacksSection />
    </div>
  )
}
