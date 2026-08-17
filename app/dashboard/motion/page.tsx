"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Upload, X, Loader2, Download, Play, Sparkles, ChevronRight, Film, ImageIcon, Video, BookOpen, History, Sun, Moon, Trees, Snowflake, Clapperboard, Wand2 } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { MotionCreditPacksSection } from "@/components/motion/credit-packs-section"
import { ImageStudio } from "@/components/motion/image-studio"
import { downloadVideo } from "@/lib/download-video"

// Onglets du studio : deux modes image (Higgsfield Soul) + le Motion Control video.
const TABS = ["Texte → Image", "Édition d'image", "Motion Control"] as const
type Tab = (typeof TABS)[number]

interface Motion {
  id: string
  name: string
  description: string
  preview_url: string | null
}

// Une generation Motion persistee (miroir de lib/motion-jobs.ts). Permet de
// retrouver ses clips meme apres avoir quitte la page pendant le rendu.
interface MotionJob {
  id: string
  request_id: string
  provider: "fal" | "higgsfield"
  model: string
  prompt: string
  status: "processing" | "completed" | "failed"
  video_url: string | null
  created_at: string
}

type Status = "idle" | "uploading" | "processing" | "completed" | "failed"

// Modeles (mappes sur les tiers DoP cote API). Presente facon Higgsfield.
const MODELS: { value: string; label: string; credits: number }[] = [
  { value: "standard", label: "Motion Standard", credits: 28 },
  { value: "pro", label: "Motion Pro", credits: 45 },
]
const QUALITIES = ["720p", "1080p"] as const

// Scenes/decors selectionnables en un clic. Chaque scene injecte une instruction
// de fond en anglais dans le prompt final (les modeles y repondent mieux).
// "keep" garde le decor de l'image sujet ; "custom" laisse l'utilisateur decrire.
// NB : le fond ne peut PAS etre extrait d'une video (le modele ne transfere que
// le mouvement), donc on n'expose que "fond de l'image" ou une nouvelle scene.
const SCENES: { value: string; label: string; icon: LucideIcon; prompt: string }[] = [
  { value: "keep", label: "Fond de l'image", icon: ImageIcon, prompt: "" },
  { value: "neon", label: "Studio néon", icon: Wand2, prompt: "change the background to a dark studio with vibrant neon lights, cinematic lighting" },
  { value: "sunset", label: "Plage · sunset", icon: Sun, prompt: "change the background to a beach at golden hour sunset with warm light" },
  { value: "night", label: "Rue de nuit", icon: Moon, prompt: "change the background to a city street at night with colorful bokeh lights, cinematic" },
  { value: "cinema", label: "Fond noir ciné", icon: Clapperboard, prompt: "change the background to a plain black cinematic backdrop with dramatic studio lighting" },
  { value: "nature", label: "Nature / forêt", icon: Trees, prompt: "change the background to a lush green forest with soft natural daylight" },
  { value: "snow", label: "Neige", icon: Snowflake, prompt: "change the background to a snowy winter landscape with soft cold light" },
  { value: "custom", label: "Scène perso", icon: Sparkles, prompt: "" },
]

export default function MotionPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()
  const imgInputRef = useRef<HTMLInputElement>(null)
  const refInputRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [activeTab, setActiveTab] = useState<Tab>("Motion Control")
  const [loading, setLoading] = useState(true)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [refVideo, setRefVideo] = useState<File | null>(null)
  const [refVideoUrl, setRefVideoUrl] = useState<string | null>(null)
  const [prompt, setPrompt] = useState("")
  const [scene, setScene] = useState("keep")
  const [customScene, setCustomScene] = useState("")
  const [model, setModel] = useState("standard")
  const [quality, setQuality] = useState<(typeof QUALITIES)[number]>("720p")
  const [enhance, setEnhance] = useState(true)
  const [motions, setMotions] = useState<Motion[]>([])
  const [selectedMotions, setSelectedMotions] = useState<string[]>([])
  const [showLibrary, setShowLibrary] = useState(false)

  // `status` ne concerne QUE la soumission en cours (etat du bouton). Une fois
  // le job soumis, il vit dans `history` et est suivi en arriere-plan : quitter
  // la page puis revenir ne perd plus la video.
  const [status, setStatus] = useState<Status>("idle")
  const [history, setHistory] = useState<MotionJob[]>([])
  // id du clip en cours de téléchargement (pour l'état du bouton).
  const [downloadingJobId, setDownloadingJobId] = useState<string | null>(null)
  const historyRef = useRef<MotionJob[]>([])
  // Solde de credits Motion (null = pas encore charge).
  const [credits, setCredits] = useState<number | null>(null)

  const busy = status === "uploading"
  const hasProcessing = history.some((j) => j.status === "processing")
  const MAX_PROMPT = 500
  // Duree max d'un clip = duree de la video de reference (borne le cout fal).
  const MOTION_MAX_SECONDS = 10
  const activeModel = MODELS.find((m) => m.value === model) ?? MODELS[0]

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/login")
        return
      }
      try {
        const [mRes, cRes, hRes] = await Promise.all([
          fetch("/api/motion?info=motions"),
          fetch("/api/motion/control?info=quota"),
          fetch("/api/motion/control?info=history"),
        ])
        const mJson = await mRes.json()
        if (mRes.ok && Array.isArray(mJson.motions)) setMotions(mJson.motions)
        const cJson = await cRes.json()
        if (cRes.ok) setCredits(Math.max(0, Number(cJson.remaining) || 0))
        // Charger l'historique persiste : les generations lancees precedemment
        // (y compris celles encore en cours) reapparaissent ici.
        const hJson = await hRes.json()
        if (hRes.ok && Array.isArray(hJson.jobs)) setHistory(hJson.jobs)
      } catch {
        // presets/solde/historique optionnels
      }
      setLoading(false)
    }
    init()
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [router, supabase])

  // Garde une reference a jour de l'historique pour l'interval de polling.
  useEffect(() => {
    historyRef.current = history
  }, [history])

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
    setStatus("idle")
  }, [toast])

  const onSelectRef = useCallback((f: File | undefined) => {
    if (!f) return
    if (!["video/mp4", "video/quicktime", "video/webm"].includes(f.type)) {
      toast({ title: "Format invalide", description: "MP4, MOV ou WebM uniquement", variant: "destructive" })
      return
    }
    if (f.size > 30 * 1024 * 1024) {
      toast({ title: "Vidéo trop volumineuse", description: "Max 30 Mo (une vidéo de 10s est légère)", variant: "destructive" })
      return
    }
    // Verifier la DUREE : le clip genere = la duree de la reference, plafonnee a
    // 10s pour borner le cout. On lit les metadonnees avant d'accepter le fichier.
    const url = URL.createObjectURL(f)
    const probe = document.createElement("video")
    probe.preload = "metadata"
    probe.onloadedmetadata = () => {
      const dur = probe.duration
      if (Number.isFinite(dur) && dur > MOTION_MAX_SECONDS + 0.5) {
        URL.revokeObjectURL(url)
        toast({
          title: "Vidéo trop longue",
          description: `La vidéo de référence doit durer ${MOTION_MAX_SECONDS}s maximum (la tienne fait ${Math.round(dur)}s). Découpe-la puis réessaie.`,
          variant: "destructive",
        })
        return
      }
      setRefVideo(f)
      setRefVideoUrl(url)
    }
    probe.onerror = () => {
      URL.revokeObjectURL(url)
      toast({ title: "Vidéo illisible", description: "Impossible de lire cette vidéo. Essaie un autre fichier.", variant: "destructive" })
    }
    probe.src = url
  }, [toast])

  // Interroge le statut d'UN job (la bonne route selon le fournisseur) et met a
  // jour son entree dans l'historique. Le statut est aussi persiste cote serveur.
  const pollJob = useCallback(async (job: MotionJob) => {
    const endpoint = job.provider === "fal" ? "/api/motion/control" : "/api/motion"
    const url = `${endpoint}?request_id=${encodeURIComponent(job.request_id)}${job.provider === "fal" ? `&model=${job.model}` : ""}`
    try {
      const res = await fetch(url)
      const json = await res.json()
      if (json.status === "completed" && json.video_url) {
        setHistory((prev) => prev.map((j) => (j.request_id === job.request_id ? { ...j, status: "completed", video_url: json.video_url } : j)))
        toast({ title: "Vidéo prête !", description: "Ton clip Motion a été généré." })
      } else if (json.status === "failed" || json.status === "nsfw") {
        setHistory((prev) => prev.map((j) => (j.request_id === job.request_id ? { ...j, status: "failed" } : j)))
        toast({ title: "Échec de la génération", description: json.error || "La vidéo n'a pas pu être générée.", variant: "destructive" })
      }
    } catch {
      // retry au prochain tick
    }
  }, [toast])

  // Tant qu'au moins un job est "processing", on poll tous les 5s. L'interval se
  // relance automatiquement au chargement de la page si des jobs sont en cours,
  // ce qui resout la perte de video quand on quitte puis revient sur la page.
  useEffect(() => {
    if (!hasProcessing) return
    const id = setInterval(() => {
      historyRef.current
        .filter((j) => j.status === "processing")
        .forEach((j) => { void pollJob(j) })
    }, 5000)
    pollRef.current = id
    return () => clearInterval(id)
  }, [hasProcessing, pollJob])

  // Fragment de prompt lie a la scene choisie ("" si on garde le fond de l'image).
  const buildScenePrompt = () => {
    if (scene === "custom") {
      const t = customScene.trim()
      return t ? `change the background: ${t}` : ""
    }
    return SCENES.find((s) => s.value === scene)?.prompt || ""
  }
  // Combine le mouvement decrit par l'utilisateur + l'instruction de scene.
  const composePrompt = (movement: string) => {
    return [movement.trim(), buildScenePrompt()].filter(Boolean).join(". ")
  }
  // Une scene est "active" (autre que le fond d'origine) si elle apporte une instruction.
  const sceneActive = scene === "custom" ? !!customScene.trim() : scene !== "keep"

  const handleGenerate = async () => {
    if (!file) {
      toast({ title: "Image manquante", description: "Ajoute une image sujet pour démarrer.", variant: "destructive" })
      return
    }

    // MODE 1 : Motion Control REEL — une video de reference est fournie.
    // On transfere son mouvement sur l'image via Kling Motion Control (fal.ai).
    if (refVideo) {
      // Garde-fou UX : bloquer si le solde de credits Motion est vide.
      if (credits !== null && credits <= 0) {
        toast({
          title: "Crédits Motion épuisés",
          description: "Passe à un forfait Premium, VIP PRO ou VIP DEBOUT pour obtenir des crédits Motion Control.",
          variant: "destructive",
        })
        return
      }
      setStatus("uploading")
      try {
        const finalPrompt = composePrompt(prompt)
        const fd = new FormData()
        fd.append("image", file)
        fd.append("video", refVideo)
        fd.append("prompt", finalPrompt)
        fd.append("model", model === "pro" ? "pro" : "standard")
        fd.append("orientation", "video")
        fd.append("keep_sound", "false")

        const res = await fetch("/api/motion/control", { method: "POST", body: fd })
        const json = await res.json()
        if (!res.ok) {
          setStatus("idle")
          if (res.status === 402) {
            // Solde epuise / pas de forfait : synchroniser l'affichage a 0.
            if (json.code === "quota_exhausted" || json.code === "no_plan") setCredits(0)
            toast({ title: "Crédits Motion épuisés", description: json.error, variant: "destructive" })
          } else {
            toast({ title: "Erreur", description: json.error || "Impossible de lancer le transfert de mouvement.", variant: "destructive" })
          }
          return
        }
        if (typeof json.remaining === "number") setCredits(json.remaining)
        addJobToHistory(json.request_id, "fal", model === "pro" ? "pro" : "standard", finalPrompt || prompt.trim())
        setStatus("idle")
        toast({ title: "Transfert de mouvement lancé", description: "Cela peut prendre 2 à 5 minutes. Tu peux quitter la page." })
      } catch {
        setStatus("idle")
        toast({ title: "Erreur réseau", description: "Réessaie dans un instant.", variant: "destructive" })
      }
      return
    }

    // MODE 2 : Animation par prompt/presets (image -> video Higgsfield).
    if (!prompt.trim() && selectedMotions.length === 0 && !sceneActive) {
      toast({ title: "Décris le mouvement", description: "Ajoute une vidéo de référence, un prompt, une scène ou un preset.", variant: "destructive" })
      return
    }
    setStatus("uploading")
    try {
      const finalPrompt = composePrompt(prompt)
      const fd = new FormData()
      fd.append("file", file)
      fd.append("prompt", finalPrompt || "subtle natural motion, cinematic")
      fd.append("model", model === "pro" ? "standard" : model)
      fd.append("quality", quality)
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

      addJobToHistory(json.request_id, "higgsfield", model === "pro" ? "standard" : model, finalPrompt || "Animation")
      setStatus("idle")
      toast({ title: "Génération lancée", description: "Cela peut prendre 1 à 3 minutes. Tu peux quitter la page." })
    } catch {
      setStatus("idle")
      toast({ title: "Erreur réseau", description: "Réessaie dans un instant.", variant: "destructive" })
    }
  }

  // Ajoute (optimiste) un job en tete de l'historique. L'effet de polling le
  // suivra automatiquement jusqu'a completion, meme si on quitte la page.
  const addJobToHistory = (
    requestId: string,
    provider: "fal" | "higgsfield",
    model: string,
    prompt: string,
  ) => {
    setHistory((prev) => [
      {
        id: `local-${requestId}`,
        request_id: requestId,
        provider,
        model,
        prompt,
        status: "processing",
        video_url: null,
        created_at: new Date().toISOString(),
      },
      ...prev,
    ])
  }

  const toggleMotion = (id: string) => {
    setSelectedMotions((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : prev.length >= 3 ? prev : [...prev, id],
    )
  }

  const clearImage = () => {
    setFile(null)
    setPreviewUrl(null)
    setStatus("idle")
  }
  const clearRef = () => {
    setRefVideo(null)
    setRefVideoUrl(null)
  }

  // Generation possible si : image + (video de reference OU prompt OU preset OU scene).
  const canGenerate = !!file && (!!refVideo || !!prompt.trim() || selectedMotions.length > 0 || sceneActive) && !busy

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="h-8 w-8 animate-spin text-[#c6f542]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Onglets facon Higgsfield */}
      <div className="flex items-center gap-6 border-b border-white/10 px-4 lg:px-8">
        {TABS.map((tab) => {
          const active = tab === activeTab
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`relative py-4 text-sm font-medium transition-colors ${
                active ? "text-white" : "text-white/40 hover:text-white/70"
              }`}
            >
              {tab}
              {active && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[#c6f542]" />}
            </button>
          )
        })}
      </div>

      {/* Onglets image (Higgsfield Soul) : generation seule, galerie + telechargement. */}
      {activeTab !== "Motion Control" ? (
        <ImageStudio mode={activeTab === "Édition d'image" ? "edit" : "text"} />
      ) : (
      <>
      {/* ------------------------ Onglet Motion Control ------------------------ */}

      <div className="grid gap-4 p-4 lg:grid-cols-[380px_1fr] lg:p-6">
        {/* ---------- Panneau gauche : configuration ---------- */}
        <div className="space-y-3">
          {/* Banniere Motion Control */}
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1a1a1a] to-[#111] p-4">
            <button
              type="button"
              onClick={() => setShowLibrary((v) => !v)}
              className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur transition-colors hover:bg-white/20"
            >
              <BookOpen className="h-3.5 w-3.5" />
              Bibliothèque de mouvements
            </button>
            <h2 className="mt-8 text-xl font-extrabold uppercase tracking-tight text-[#c6f542]">Motion Control</h2>
            <p className="text-sm text-white/60">Anime une image avec un mouvement contrôlé</p>
          </div>

          {/* Deux vignettes : image sujet + video de reference */}
          <div className="grid grid-cols-2 gap-3">
            {/* Image sujet */}
            <div>
              <div
                onDrop={(e) => { e.preventDefault(); onSelectImage(e.dataTransfer.files?.[0]) }}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => !busy && imgInputRef.current?.click()}
                className={`relative flex aspect-[3/4] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-colors ${
                  previewUrl ? "border-[#c6f542]/60" : "border-white/15 bg-white/[0.03] hover:border-[#c6f542]/40"
                } ${busy ? "pointer-events-none opacity-60" : ""}`}
              >
                {previewUrl ? (
                  <>
                    <img src={previewUrl || "/placeholder.svg"} alt="Image sujet" className="h-full w-full object-cover" />
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
                    <p className="px-2 text-center text-xs font-medium text-white/70">Image sujet</p>
                    <p className="mt-0.5 flex items-center gap-1 text-[10px] text-white/40"><Upload className="h-3 w-3" /> Importer</p>
                  </>
                )}
                <input ref={imgInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => onSelectImage(e.target.files?.[0])} className="hidden" />
              </div>
              <p className="mt-1.5 text-center text-[11px] text-white/40">Requis</p>
            </div>

            {/* Video de reference (UI seulement pour l'instant) */}
            <div>
              <div
                onDrop={(e) => { e.preventDefault(); onSelectRef(e.dataTransfer.files?.[0]) }}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => !busy && refInputRef.current?.click()}
                className={`relative flex aspect-[3/4] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-colors ${
                  refVideoUrl ? "border-[#c6f542]/60" : "border-white/15 bg-white/[0.03] hover:border-[#c6f542]/40"
                } ${busy ? "pointer-events-none opacity-60" : ""}`}
              >
                {refVideoUrl ? (
                  <>
                    <video src={refVideoUrl} className="h-full w-full object-cover" muted loop playsInline />
                    <button
                      onClick={(e) => { e.stopPropagation(); clearRef() }}
                      className="absolute right-1.5 top-1.5 rounded-full bg-black/70 p-1 text-white transition-transform hover:scale-110"
                      aria-label="Retirer la vidéo"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <Video className="mb-2 h-6 w-6 text-white/40" />
                    <p className="px-2 text-center text-xs font-medium text-white/70">Vidéo de référence</p>
                    <p className="mt-0.5 flex items-center gap-1 text-[10px] text-white/40"><Upload className="h-3 w-3" /> Importer</p>
                  </>
                )}
                <input ref={refInputRef} type="file" accept="video/mp4,video/quicktime,video/webm" onChange={(e) => onSelectRef(e.target.files?.[0])} className="hidden" />
              </div>
              <p className="mt-1.5 text-center text-[11px] text-white/40">Optionnel · {MOTION_MAX_SECONDS}s max</p>
            </div>
          </div>

          {/* Explication des 2 modes selon la presence d'une video de reference */}
          <div className={`rounded-lg border px-3 py-2 text-[11px] leading-relaxed transition-colors ${
            refVideo ? "border-[#c6f542]/30 bg-[#c6f542]/5 text-[#c6f542]" : "border-white/10 bg-white/[0.03] text-white/50"
          }`}>
            {refVideo ? (
              <>Mode transfert de mouvement : le personnage de ton image reproduira les mouvements de la vidéo de référence (Kling Motion Control). Le clip généré dure comme la référence, {MOTION_MAX_SECONDS}s maximum.</>
            ) : (
              <>Ajoute une vidéo de référence ({MOTION_MAX_SECONDS}s max) pour transférer son mouvement, ou laisse vide et décris le mouvement au prompt pour une simple animation.</>
            )}
          </div>

          {/* Solde de credits Motion */}
          <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
            <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-white/40">
              <Film className="h-3.5 w-3.5" /> Crédits Motion
            </span>
            <span className={`text-sm font-bold ${credits !== null && credits <= 0 ? "text-red-400" : "text-[#c6f542]"}`}>
              {credits === null ? "…" : credits}
            </span>
          </div>

          {/* Scene / decor en un clic */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-white/40">
              <ImageIcon className="h-3.5 w-3.5" /> Scène / décor
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {SCENES.map((s) => {
                const active = scene === s.value
                const Icon = s.icon
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => !busy && setScene(s.value)}
                    disabled={busy}
                    aria-pressed={active}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors disabled:opacity-50 ${
                      active ? "bg-[#c6f542] text-black" : "bg-white/5 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{s.label}</span>
                  </button>
                )
              })}
            </div>
            {scene === "custom" && (
              <input
                value={customScene}
                onChange={(e) => setCustomScene(e.target.value)}
                disabled={busy}
                maxLength={200}
                placeholder="Décris ton décor : plateau TV, désert, néon rose..."
                className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#c6f542]/50 focus:outline-none"
              />
            )}
            <p className="mt-2 text-[11px] leading-relaxed text-white/40">
              {scene === "keep"
                ? "Le sujet garde le décor de son image."
                : "Le sujet est placé dans la scène choisie. Le fond ne peut pas être extrait d'une vidéo (seul le mouvement est transféré)."}
            </p>
          </div>

          {/* Prompt */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Décris le mouvement : la caméra zoome lentement, la personne sourit, léger vent..."
              className="min-h-20 resize-none border-0 bg-transparent p-0 text-sm text-white placeholder:text-white/30 focus-visible:ring-0"
              maxLength={MAX_PROMPT}
              disabled={busy}
            />
            <div className="mt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setEnhance((v) => !v)}
                disabled={busy}
                aria-pressed={enhance}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                  enhance ? "border-[#c6f542] bg-[#c6f542]/10 text-[#c6f542]" : "border-white/15 text-white/50 hover:border-white/30"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" /> Enhance
              </button>
              <span className="text-[11px] text-white/30">{prompt.length}/{MAX_PROMPT}</span>
            </div>
          </div>

          {/* Ligne Model */}
          <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
            <div className="px-3 pt-2.5 text-[11px] font-medium uppercase tracking-wide text-white/40">Model</div>
            <div className="grid grid-cols-2 gap-1 p-2">
              {MODELS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => !busy && setModel(m.value)}
                  disabled={busy}
                  aria-pressed={model === m.value}
                  className={`rounded-lg px-2 py-2 text-center transition-colors disabled:opacity-50 ${
                    model === m.value ? "bg-[#c6f542] text-black" : "bg-white/5 text-white/70 hover:bg-white/10"
                  }`}
                >
                  <span className="block text-xs font-semibold leading-tight">{m.label.replace("Motion ", "")}</span>
                  <span className={`block text-[10px] ${model === m.value ? "text-black/60" : "text-white/40"}`}>{m.credits} cr.</span>
                </button>
              ))}
            </div>
          </div>

          {/* Ligne Quality */}
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-white/40">Quality</div>
              <div className="text-sm font-semibold text-white">{quality}</div>
            </div>
            <div className="flex gap-1">
              {QUALITIES.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => !busy && setQuality(q)}
                  disabled={busy}
                  aria-pressed={quality === q}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                    quality === q ? "bg-white text-black" : "bg-white/5 text-white/60 hover:bg-white/10"
                  }`}
                >
                  {q}
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
              <>Generate <Sparkles className="h-4 w-4" /> {activeModel.credits}</>
            )}
          </button>
        </div>

        {/* ---------- Panneau droit : apercu ---------- */}
        <div className="flex flex-col rounded-2xl border border-white/10 bg-[#0d0d0d]">
          {/* Barre History / Motion library */}
          <div className="flex items-center gap-2 border-b border-white/10 p-3">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white">
              <History className="h-3.5 w-3.5" /> Historique
            </span>
            <button
              type="button"
              onClick={() => setShowLibrary((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white/50 transition-colors hover:text-white"
            >
              <BookOpen className="h-3.5 w-3.5" /> Bibliothèque de mouvements
            </button>
          </div>

          {/* Zone centrale */}
          <div className="flex flex-1 items-center justify-center p-6">
            {showLibrary ? (
              motions.length > 0 ? (
                <div className="grid max-h-[60vh] w-full grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 lg:grid-cols-4">
                  {motions.map((m) => {
                    const active = selectedMotions.includes(m.id)
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleMotion(m.id)}
                        aria-pressed={active}
                        title={m.description}
                        className={`group relative overflow-hidden rounded-xl border text-left transition-colors ${
                          active ? "border-[#c6f542] ring-2 ring-[#c6f542]/40" : "border-white/10 hover:border-white/30"
                        }`}
                      >
                        {m.preview_url ? (
                          <video src={m.preview_url} className="aspect-video w-full object-cover" muted loop playsInline
                            onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
                            onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0 }}
                          />
                        ) : (
                          <div className="flex aspect-video w-full items-center justify-center bg-white/5"><Film className="h-5 w-5 text-white/30" /></div>
                        )}
                        <span className="block truncate px-2 py-1.5 text-[11px] font-medium text-white/80">{m.name}</span>
                        {active && <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-[#c6f542]" />}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-white/40">Bibliothèque de mouvements indisponible pour le moment.</p>
              )
            ) : history.length > 0 ? (
              <div className="grid max-h-[70vh] w-full grid-cols-2 gap-3 self-start overflow-y-auto sm:grid-cols-3">
                {history.map((job) => (
                  <div key={job.id} className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
                    <div className="relative aspect-[3/4] w-full bg-black/40">
                      {job.status === "completed" && job.video_url ? (
                        <video src={job.video_url} controls loop playsInline className="h-full w-full object-cover" />
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
                      <p className="truncate text-[11px] text-white/60" title={job.prompt}>{job.prompt || "Animation"}</p>
                      {job.status === "completed" && job.video_url && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (!job.video_url) return
                            setDownloadingJobId(job.id)
                            try {
                              await downloadVideo(job.video_url, `chapcam-motion-${job.id.slice(0, 8)}.mp4`)
                            } finally {
                              setDownloadingJobId(null)
                            }
                          }}
                          disabled={downloadingJobId === job.id}
                          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-white/20 disabled:opacity-60"
                          aria-label="Télécharger le clip"
                        >
                          {downloadingJobId === job.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Download className="h-3 w-3" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : busy ? (
              <div className="flex flex-col items-center text-center">
                <Loader2 className="h-10 w-10 animate-spin text-[#c6f542]" />
                <p className="mt-4 text-sm font-medium text-white">Envoi de l&apos;image...</p>
                <p className="mt-1 text-xs text-white/40">Un instant</p>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center">
                <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
                  <Play className="h-7 w-7 text-white/30" />
                </div>
                <p className="text-sm text-white/50">Ton clip généré apparaîtra ici</p>
                <p className="mt-1 text-xs text-white/30">Importe une image, décris le mouvement, puis Generate</p>
              </div>
            )}
          </div>

          {/* Selection de presets (rappel sous l'apercu) */}
          {selectedMotions.length > 0 && !showLibrary && (
            <div className="flex flex-wrap items-center gap-2 border-t border-white/10 p-3">
              <span className="text-[11px] text-white/40">Mouvements :</span>
              {selectedMotions.map((id) => {
                const m = motions.find((x) => x.id === id)
                return (
                  <span key={id} className="inline-flex items-center gap-1 rounded-full bg-[#c6f542]/15 px-2.5 py-1 text-[11px] font-medium text-[#c6f542]">
                    {m?.name || id}
                    <button type="button" onClick={() => toggleMotion(id)} aria-label="Retirer"><X className="h-3 w-3" /></button>
                  </span>
                )
              })}
              <button type="button" onClick={() => setShowLibrary(true)} className="inline-flex items-center gap-0.5 text-[11px] text-white/50 hover:text-white">
                Ajouter <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Packs de credits Motion (achat sans forfait) */}
      <div className="px-4 pb-10 lg:px-6">
        <MotionCreditPacksSection />
      </div>
      </>
      )}
    </div>
  )
}
