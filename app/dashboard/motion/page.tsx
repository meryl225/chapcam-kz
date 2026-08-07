"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Upload, X, Loader2, Download, Check, Clapperboard, Wand2, Film, Sparkles } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"

interface Motion {
  id: string
  name: string
  description: string
  preview_url: string | null
}

type Status = "idle" | "uploading" | "processing" | "completed" | "failed"

// Modeles proposes : vitesse vs qualite. Valeurs = allowlist de la route API.
const MODELS: { value: string; label: string; hint: string }[] = [
  { value: "turbo", label: "Turbo", hint: "Rapide" },
  { value: "standard", label: "Standard", hint: "Equilibre" },
  { value: "lite", label: "Lite", hint: "Economique" },
]

export default function MotionPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [loading, setLoading] = useState(true)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [prompt, setPrompt] = useState("")
  const [model, setModel] = useState("turbo")
  const [enhance, setEnhance] = useState(true)
  const [motions, setMotions] = useState<Motion[]>([])
  const [selectedMotions, setSelectedMotions] = useState<string[]>([])

  const [status, setStatus] = useState<Status>("idle")
  const [videoUrl, setVideoUrl] = useState<string | null>(null)

  const busy = status === "uploading" || status === "processing"
  const MAX_PROMPT = 500

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/login")
        return
      }
      try {
        const res = await fetch("/api/motion?info=motions")
        const json = await res.json()
        if (res.ok && Array.isArray(json.motions)) setMotions(json.motions)
      } catch {
        // silencieux : les presets sont optionnels
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
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
      toast({ title: "Format invalide", description: "JPG, PNG ou WebP uniquement", variant: "destructive" })
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      toast({ title: "Fichier trop volumineux", description: "Max 10 Mo", variant: "destructive" })
      return
    }
    setFile(f)
    setPreviewUrl(URL.createObjectURL(f))
    setVideoUrl(null)
    setStatus("idle")
  }, [toast])

  const startPolling = useCallback((requestId: string) => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/motion?request_id=${encodeURIComponent(requestId)}`)
        const json = await res.json()
        if (json.status === "completed" && json.video_url) {
          if (pollRef.current) clearInterval(pollRef.current)
          setVideoUrl(json.video_url)
          setStatus("completed")
          toast({ title: "Vidéo prête !", description: "Ton clip animé a été généré." })
        } else if (json.status === "failed" || json.status === "nsfw") {
          if (pollRef.current) clearInterval(pollRef.current)
          setStatus("failed")
          toast({ title: "Échec de la génération", description: json.error || "La vidéo n'a pas pu être générée.", variant: "destructive" })
        }
      } catch {
        // on retente au prochain tick
      }
    }, 5000)
  }, [toast])

  const handleGenerate = async () => {
    if (!file || !prompt.trim()) {
      toast({ title: "Champs manquants", description: "Ajoute une photo et décris le mouvement.", variant: "destructive" })
      return
    }
    setStatus("uploading")
    setVideoUrl(null)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("prompt", prompt.trim())
      fd.append("model", model)
      fd.append("enhance", String(enhance))
      if (selectedMotions.length > 0) fd.append("motions", JSON.stringify(selectedMotions))

      const res = await fetch("/api/motion", { method: "POST", body: fd })
      const json = await res.json()

      if (!res.ok) {
        setStatus("idle")
        if (res.status === 402 && json.code === "no_credit") {
          toast({ title: "Service indisponible", description: json.error, variant: "destructive" })
        } else {
          toast({ title: "Erreur", description: json.error || "Impossible de lancer la génération.", variant: "destructive" })
        }
        return
      }

      setStatus("processing")
      startPolling(json.request_id)
      toast({ title: "Génération lancée", description: "Cela peut prendre 1 à 3 minutes..." })
    } catch {
      setStatus("idle")
      toast({ title: "Erreur réseau", description: "Réessaie dans un instant.", variant: "destructive" })
    }
  }

  const toggleMotion = (id: string) => {
    setSelectedMotions((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : prev.length >= 3 ? prev : [...prev, id],
    )
  }

  const reset = () => {
    setFile(null)
    setPreviewUrl(null)
    setPrompt("")
    setSelectedMotions([])
    setVideoUrl(null)
    setStatus("idle")
    if (pollRef.current) clearInterval(pollRef.current)
  }

  const photoDone = !!file
  const promptDone = !!prompt.trim()
  const canGenerate = photoDone && promptDone && !busy

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const StepBadge = ({ n, done }: { n: number; done: boolean }) => (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
        done ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
      }`}
    >
      {done ? <Check className="h-4 w-4" /> : n}
    </span>
  )

  return (
    <div className="mx-auto max-w-6xl p-4 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <Film className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground text-balance">Motion — Photo animée</h1>
            <p className="text-sm text-muted-foreground">
              Transforme une photo en clip vidéo avec un mouvement de caméra contrôlé.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Colonne config */}
        <div className="space-y-4">
          {/* Etape 1 — Photo */}
          <section className="rounded-2xl border border-hairline bg-card p-5">
            <div className="mb-4 flex items-center gap-3">
              <StepBadge n={1} done={photoDone} />
              <div>
                <h2 className="text-sm font-semibold text-foreground">Ta photo</h2>
                <p className="text-xs text-muted-foreground">JPG, PNG ou WebP — sujet net et bien cadré</p>
              </div>
            </div>
            <div
              onDrop={(e) => { e.preventDefault(); onSelectFile(e.dataTransfer.files?.[0]) }}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => !busy && fileInputRef.current?.click()}
              className={`relative flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
                previewUrl ? "border-primary bg-primary/5" : "border-hairline-strong bg-secondary/40 hover:border-primary/50"
              } ${busy ? "pointer-events-none opacity-60" : ""}`}
            >
              {previewUrl ? (
                <div className="relative">
                  <img src={previewUrl || "/placeholder.svg"} alt="Aperçu de la photo importée" className="mx-auto max-h-56 rounded-lg object-contain" />
                  <button
                    onClick={(e) => { e.stopPropagation(); reset() }}
                    className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground shadow-md transition-transform hover:scale-105"
                    aria-label="Retirer la photo"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Upload className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Glisse une photo ou clique pour choisir</p>
                  <p className="mt-1 text-xs text-text-faint">Max 10 Mo</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => onSelectFile(e.target.files?.[0])}
                className="hidden"
              />
            </div>
          </section>

          {/* Etape 2 — Prompt de mouvement */}
          <section className="rounded-2xl border border-hairline bg-card p-5">
            <div className="mb-4 flex items-center gap-3">
              <StepBadge n={2} done={promptDone} />
              <div>
                <h2 className="text-sm font-semibold text-foreground">Le mouvement</h2>
                <p className="text-xs text-muted-foreground">Décris l&apos;animation : caméra, sujet, ambiance</p>
              </div>
            </div>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex : la caméra zoome lentement, la personne sourit, lumière dorée, léger vent dans les cheveux"
              className="min-h-24 resize-none border-hairline bg-secondary/50 text-foreground"
              maxLength={MAX_PROMPT}
              disabled={busy}
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setEnhance((v) => !v)}
                disabled={busy}
                aria-pressed={enhance}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                  enhance
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-hairline-strong bg-secondary text-muted-foreground hover:border-primary/50"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Améliorer le prompt
              </button>
              <span className="text-xs text-text-faint">{prompt.length}/{MAX_PROMPT}</span>
            </div>
          </section>

          {/* Etape 3 — Modele */}
          <section className="rounded-2xl border border-hairline bg-card p-5">
            <div className="mb-4 flex items-center gap-3">
              <StepBadge n={3} done />
              <div>
                <h2 className="text-sm font-semibold text-foreground">Qualité</h2>
                <p className="text-xs text-muted-foreground">Vitesse ou rendu, à toi de choisir</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {MODELS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => !busy && setModel(m.value)}
                  disabled={busy}
                  aria-pressed={model === m.value}
                  className={`rounded-lg border px-3 py-2.5 text-center transition-colors disabled:opacity-50 ${
                    model === m.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-hairline-strong bg-secondary text-foreground hover:border-primary/50"
                  }`}
                >
                  <span className="block text-sm font-semibold">{m.label}</span>
                  <span className={`block text-[11px] ${model === m.value ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                    {m.hint}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Colonne resultat + presets */}
        <div className="space-y-4">
          {/* Resultat */}
          <section className="rounded-2xl border border-hairline bg-card p-5">
            <h2 className="mb-4 text-sm font-semibold text-foreground">Résultat</h2>
            <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-hairline bg-secondary/40 p-4 text-center">
              {status === "completed" && videoUrl ? (
                <div className="w-full">
                  <video src={videoUrl} controls playsInline className="mx-auto max-h-72 w-full rounded-lg" />
                  <a
                    href={videoUrl}
                    download
                    className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    <Download className="h-4 w-4" />
                    Télécharger
                  </a>
                </div>
              ) : busy ? (
                <>
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="mt-3 text-sm font-medium text-foreground">
                    {status === "uploading" ? "Envoi de la photo..." : "Génération en cours..."}
                  </p>
                  <p className="mt-1 text-xs text-text-faint">Cela peut prendre 1 à 3 minutes</p>
                </>
              ) : status === "failed" ? (
                <p className="text-sm text-red-400">La génération a échoué. Réessaie avec une autre photo ou un autre prompt.</p>
              ) : (
                <>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Clapperboard className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">Ta vidéo animée apparaîtra ici</p>
                </>
              )}
            </div>

            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold uppercase tracking-tight text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wand2 className="h-5 w-5" />}
              {busy ? "Génération..." : "Générer la vidéo"}
            </button>
          </section>

          {/* Presets de mouvement (optionnel) */}
          {motions.length > 0 && (
            <section className="rounded-2xl border border-hairline bg-card p-5">
              <div className="mb-1 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Mouvements de caméra</h2>
                <span className="text-xs text-text-faint">{selectedMotions.length}/3</span>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">Optionnel — jusqu&apos;à 3 presets combinés</p>
              <div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto pr-1">
                {motions.map((m) => {
                  const active = selectedMotions.includes(m.id)
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => !busy && toggleMotion(m.id)}
                      disabled={busy}
                      aria-pressed={active}
                      title={m.description}
                      className={`group relative overflow-hidden rounded-xl border text-left transition-colors disabled:opacity-50 ${
                        active ? "border-primary ring-2 ring-primary/40" : "border-hairline-strong hover:border-primary/50"
                      }`}
                    >
                      {m.preview_url ? (
                        <img src={m.preview_url || "/placeholder.svg"} alt={m.name} className="h-20 w-full object-cover" />
                      ) : (
                        <div className="flex h-20 w-full items-center justify-center bg-secondary">
                          <Film className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      {active && (
                        <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                      <span className="block truncate px-2 py-1.5 text-xs font-medium text-foreground">{m.name}</span>
                    </button>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
