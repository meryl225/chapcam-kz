"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Upload, X, Loader2, Download, ImageIcon, Sparkles, Wand2 } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"

// Studio Image Higgsfield (Soul), rendu dans les onglets "Texte -> Image" et
// "Edition d'image" de la page Motion. Generation d'images uniquement : chaque
// resultat s'affiche dans une galerie locale et est telechargeable. Aucun
// chainage vers l'animation (choix produit).
//
// - mode "text" : prompt seul -> higgsfield-ai/soul/standard
// - mode "edit" : image source + prompt -> higgsfield-ai/soul/reference
//   (variations / changement de style a partir de l'image importee)

type Mode = "text" | "edit"

interface ImageJob {
  request_id: string
  prompt: string
  status: "processing" | "completed" | "failed"
  image_url: string | null
}

const ASPECT_RATIOS = ["1:1", "9:16", "16:9", "3:4", "4:3"] as const
const MAX_PROMPT = 500

const PLACEHOLDERS: Record<Mode, string> = {
  text: "Décris l'image à créer : portrait d'un gamer futuriste, lumière néon, style cinématique...",
  edit: "Décris la transformation : même personnage sur une plage tropicale, style cyberpunk néon...",
}

export function ImageStudio({ mode }: { mode: Mode }) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [prompt, setPrompt] = useState("")
  const [aspect, setAspect] = useState<(typeof ASPECT_RATIOS)[number]>(mode === "edit" ? "3:4" : "1:1")
  const [busy, setBusy] = useState(false)
  const [jobs, setJobs] = useState<ImageJob[]>([])

  const jobsRef = useRef<ImageJob[]>([])
  useEffect(() => { jobsRef.current = jobs }, [jobs])

  const hasProcessing = jobs.some((j) => j.status === "processing")

  const onSelectImage = useCallback((f: File | undefined) => {
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
  }, [toast])

  const clearImage = () => {
    setFile(null)
    setPreviewUrl(null)
  }

  // Poll d'UN job image jusqu'a completion.
  const pollJob = useCallback(async (job: ImageJob) => {
    try {
      const res = await fetch(`/api/higgsfield/image?request_id=${encodeURIComponent(job.request_id)}`)
      const json = await res.json()
      if (json.status === "completed" && json.image_url) {
        setJobs((prev) => prev.map((j) => (j.request_id === job.request_id ? { ...j, status: "completed", image_url: json.image_url } : j)))
        toast({ title: "Image prête !", description: "Ta création est disponible." })
      } else if (json.status === "failed" || json.status === "nsfw") {
        setJobs((prev) => prev.map((j) => (j.request_id === job.request_id ? { ...j, status: "failed" } : j)))
        toast({ title: "Échec de la génération", description: json.error || "L'image n'a pas pu être générée.", variant: "destructive" })
      }
    } catch {
      // retry au prochain tick
    }
  }, [toast])

  useEffect(() => {
    if (!hasProcessing) return
    const id = setInterval(() => {
      jobsRef.current.filter((j) => j.status === "processing").forEach((j) => { void pollJob(j) })
    }, 4000)
    pollRef.current = id
    return () => clearInterval(id)
  }, [hasProcessing, pollJob])

  const canGenerate = !!prompt.trim() && !busy && (mode === "text" || !!file)

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({ title: "Prompt manquant", description: "Décris ce que tu veux générer.", variant: "destructive" })
      return
    }
    if (mode === "edit" && !file) {
      toast({ title: "Image manquante", description: "Ajoute une image à transformer.", variant: "destructive" })
      return
    }
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append("mode", mode)
      fd.append("prompt", prompt.trim())
      fd.append("aspect_ratio", aspect)
      if (mode === "edit" && file) fd.append("file", file)

      const res = await fetch("/api/higgsfield/image", { method: "POST", body: fd })
      const json = await res.json()
      if (!res.ok || !json.request_id) {
        const detail = json.detail ? ` (${json.detail})` : ""
        toast({ title: "Erreur", description: `${json.error || "Impossible de lancer la génération."}${detail}`, variant: "destructive" })
        return
      }
      setJobs((prev) => [
        { request_id: json.request_id, prompt: prompt.trim(), status: "processing", image_url: null },
        ...prev,
      ])
      toast({ title: "Génération lancée", description: "Ton image apparaîtra dans quelques secondes." })
    } catch {
      toast({ title: "Erreur réseau", description: "Réessaie dans un instant.", variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  const isEdit = mode === "edit"

  return (
    <div className="grid gap-4 p-4 lg:grid-cols-[380px_1fr] lg:p-6">
      {/* ---------- Panneau gauche : configuration ---------- */}
      <div className="space-y-3">
        {/* Banniere */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1a1a1a] to-[#111] p-4">
          <div className="mb-1 flex h-8 w-8 items-center justify-center rounded-lg bg-[#c6f542]/15">
            {isEdit ? <Wand2 className="h-4 w-4 text-[#c6f542]" /> : <Sparkles className="h-4 w-4 text-[#c6f542]" />}
          </div>
          <h2 className="mt-2 text-xl font-extrabold uppercase tracking-tight text-[#c6f542]">
            {isEdit ? "Édition d'image" : "Texte → Image"}
          </h2>
          <p className="text-sm text-white/60">
            {isEdit ? "Transforme une image à partir d'un prompt" : "Crée une image à partir d'une description"}
          </p>
        </div>

        {/* Image source (mode edition uniquement) */}
        {isEdit && (
          <div>
            <div
              onDrop={(e) => { e.preventDefault(); onSelectImage(e.dataTransfer.files?.[0]) }}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => !busy && fileInputRef.current?.click()}
              className={`relative flex aspect-video cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-colors ${
                previewUrl ? "border-[#c6f542]/60" : "border-white/15 bg-white/[0.03] hover:border-[#c6f542]/40"
              } ${busy ? "pointer-events-none opacity-60" : ""}`}
            >
              {previewUrl ? (
                <>
                  <img src={previewUrl || "/placeholder.svg"} alt="Image source" className="h-full w-full object-cover" />
                  <button
                    onClick={(e) => { e.stopPropagation(); clearImage() }}
                    className="absolute right-1.5 top-1.5 rounded-full bg-black/70 p-1 text-white transition-transform hover:scale-110"
                    aria-label="Retirer l'image"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <ImageIcon className="mb-2 h-6 w-6 text-white/40" />
                  <p className="px-2 text-center text-xs font-medium text-white/70">Image à transformer</p>
                  <p className="mt-0.5 flex items-center gap-1 text-[10px] text-white/40"><Upload className="h-3 w-3" /> Importer</p>
                </>
              )}
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => onSelectImage(e.target.files?.[0])} className="hidden" />
            </div>
            <p className="mt-1.5 text-center text-[11px] text-white/40">Requis · JPG, PNG ou WebP</p>
          </div>
        )}

        {/* Prompt */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={PLACEHOLDERS[mode]}
            className="min-h-24 resize-none border-0 bg-transparent p-0 text-sm text-white placeholder:text-white/30 focus-visible:ring-0"
            maxLength={MAX_PROMPT}
            disabled={busy}
          />
          <div className="mt-2 flex items-center justify-end">
            <span className="text-[11px] text-white/30">{prompt.length}/{MAX_PROMPT}</span>
          </div>
        </div>

        {/* Format (aspect ratio) */}
        <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
          <div className="px-3 pt-2.5 text-[11px] font-medium uppercase tracking-wide text-white/40">Format</div>
          <div className="flex flex-wrap gap-1 p-2">
            {ASPECT_RATIOS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => !busy && setAspect(r)}
                disabled={busy}
                aria-pressed={aspect === r}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                  aspect === r ? "bg-[#c6f542] text-black" : "bg-white/5 text-white/60 hover:bg-white/10"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Bouton Generate */}
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#c6f542] py-3.5 text-sm font-bold text-black transition-colors hover:bg-[#d4ff5a] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? (
            <><Loader2 className="h-5 w-5 animate-spin" /> Génération...</>
          ) : (
            <>Générer <Sparkles className="h-4 w-4" /></>
          )}
        </button>
      </div>

      {/* ---------- Panneau droit : galerie ---------- */}
      <div className="flex flex-col rounded-2xl border border-white/10 bg-[#0d0d0d]">
        <div className="flex items-center gap-2 border-b border-white/10 p-3">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white">
            <ImageIcon className="h-3.5 w-3.5" /> Mes créations
          </span>
        </div>

        <div className="flex flex-1 items-center justify-center p-6">
          {jobs.length > 0 ? (
            <div className="grid max-h-[70vh] w-full grid-cols-2 gap-3 self-start overflow-y-auto sm:grid-cols-3">
              {jobs.map((job) => (
                <div key={job.request_id} className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
                  <div className="relative aspect-square w-full bg-black/40">
                    {job.status === "completed" && job.image_url ? (
                      <img src={job.image_url || "/placeholder.svg"} alt={job.prompt} className="h-full w-full object-cover" />
                    ) : job.status === "failed" ? (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-center">
                        <X className="h-6 w-6 text-red-400" />
                        <span className="px-2 text-[11px] text-red-400">Échec</span>
                      </div>
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-center">
                        <Loader2 className="h-6 w-6 animate-spin text-[#c6f542]" />
                        <span className="px-2 text-[11px] text-white/50">Génération...</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 p-2">
                    <p className="truncate text-[11px] text-white/60" title={job.prompt}>{job.prompt}</p>
                    {job.status === "completed" && job.image_url && (
                      <a
                        href={job.image_url}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-white/20"
                        aria-label="Télécharger l'image"
                      >
                        <Download className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center text-center">
              <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
                {isEdit ? <Wand2 className="h-7 w-7 text-white/30" /> : <Sparkles className="h-7 w-7 text-white/30" />}
              </div>
              <p className="text-sm text-white/50">Tes images générées apparaîtront ici</p>
              <p className="mt-1 text-xs text-white/30">
                {isEdit ? "Importe une image, décris la transformation, puis Générer" : "Décris ton image, puis Générer"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
