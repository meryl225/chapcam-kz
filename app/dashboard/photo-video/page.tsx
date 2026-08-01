"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Upload, X, Sparkles, Loader2, ImageIcon, Download, Wand2, Play, Mic, Square, Trash2, ChevronDown, SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"

interface Voice {
  voice_id: string
  name: string
  language: string
  gender: string
  preview: string | null
}

type Status = "idle" | "uploading" | "processing" | "completed" | "failed"

const ACCENT = "#f97316"

// Gestes proposes : libelle FR (affiche) -> description anglaise (HeyGen).
// On peut en selectionner plusieurs ; elles sont combinees dans motion_prompt.
const GESTURES: { label: string; value: string }[] = [
  { label: "Bisou", value: "blow a kiss" },
  { label: "Clin d'oeil", value: "wink" },
  { label: "Toucher les cheveux", value: "touch and play with hair" },
  { label: "Sourire", value: "smile warmly" },
  { label: "Coucou de la main", value: "wave hello with hand" },
  { label: "Rire", value: "laugh happily" },
  { label: "Signe de la paix", value: "make a peace sign with fingers" },
  { label: "Hocher la tete", value: "nod head" },
  { label: "Envoyer un coeur", value: "make a heart with hands" },
  { label: "Pouce en l'air", value: "thumbs up" },
]

const EXPRESSIVENESS: { label: string; value: string }[] = [
  { label: "Douce", value: "low" },
  { label: "Naturelle", value: "medium" },
  { label: "Intense", value: "high" },
]

export default function PhotoVideoPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [loading, setLoading] = useState(true)
  const [points, setPoints] = useState<number | null>(null)

  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [prompt, setPrompt] = useState("")
  const [duration, setDuration] = useState<30 | 60>(30)
  const [voices, setVoices] = useState<Voice[]>([])
  const [voiceId, setVoiceId] = useState<string>("")
  const [gestures, setGestures] = useState<string[]>([])
  const [expressiveness, setExpressiveness] = useState<string>("medium")
  const [showOptions, setShowOptions] = useState(false)

  // Clonage de voix : mode ("preset" = voix HeyGen, "clone" = ta voix) + echantillon.
  const [voiceMode, setVoiceMode] = useState<"preset" | "clone">("preset")
  const [voiceSample, setVoiceSample] = useState<File | null>(null)
  const [voiceSampleUrl, setVoiceSampleUrl] = useState<string | null>(null)
  const [recording, setRecording] = useState(false)
  const mediaRecRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioInputRef = useRef<HTMLInputElement>(null)

  const [status, setStatus] = useState<Status>("idle")
  const [videoUrl, setVideoUrl] = useState<string | null>(null)

  const busy = status === "uploading" || status === "processing"

  // Tarification proportionnelle : 8 points/seconde, duree estimee depuis la
  // longueur du texte (~14 caracteres/seconde). La duree choisie (30s ou 60s)
  // plafonne la longueur du prompt. +50 points si clonage de voix.
  const CHARS_PER_SECOND = 14
  const MAX_SCRIPT_CHARS = duration * CHARS_PER_SECOND
  const CLONE_POINTS = 50
  const usingClone = voiceMode === "clone" && !!voiceSample
  const estimatedSeconds = Math.min(duration, Math.max(2, Math.ceil(prompt.length / CHARS_PER_SECOND)))
  const estimatedPoints = estimatedSeconds * 8 + (usingClone ? CLONE_POINTS : 0)

  // Auth + points + voices
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/login")
        return
      }
      const { data: profile } = await supabase.from("profiles").select("points").eq("id", user.id).single()
      setPoints(profile?.points ?? 0)

      try {
        const res = await fetch("/api/heygen/voices")
        const json = await res.json()
        if (res.ok && json.voices?.length) {
          setVoices(json.voices)
          setVoiceId(json.voices[0].voice_id)
        }
      } catch {
        // silencieux : l'UI affichera l'absence de voix
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

  const onSelectAudio = useCallback((f: File | undefined) => {
    if (!f) return
    if (!f.type.startsWith("audio/")) {
      toast({ title: "Format invalide", description: "Fichier audio uniquement (MP3, WAV, M4A...)", variant: "destructive" })
      return
    }
    if (f.size > 15 * 1024 * 1024) {
      toast({ title: "Fichier trop volumineux", description: "Max 15 Mo", variant: "destructive" })
      return
    }
    setVoiceSample(f)
    setVoiceSampleUrl(URL.createObjectURL(f))
  }, [toast])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream)
      chunksRef.current = []
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" })
        const ext = (rec.mimeType || "audio/webm").includes("mp4") ? "mp4" : "webm"
        const f = new File([blob], `voix.${ext}`, { type: blob.type })
        setVoiceSample(f)
        setVoiceSampleUrl(URL.createObjectURL(blob))
        stream.getTracks().forEach((t) => t.stop())
      }
      mediaRecRef.current = rec
      rec.start()
      setRecording(true)
    } catch {
      toast({ title: "Micro indisponible", description: "Autorise l'accès au micro pour enregistrer ta voix.", variant: "destructive" })
    }
  }, [toast])

  const stopRecording = useCallback(() => {
    mediaRecRef.current?.stop()
    setRecording(false)
  }, [])

  const clearVoiceSample = () => {
    setVoiceSample(null)
    setVoiceSampleUrl(null)
  }

  const startPolling = useCallback((videoId: string, cloneVoiceId: string | null) => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const cloneParam = cloneVoiceId ? `&clone_voice_id=${encodeURIComponent(cloneVoiceId)}` : ""
        const res = await fetch(`/api/heygen/photo-video?video_id=${encodeURIComponent(videoId)}${cloneParam}`)
        const json = await res.json()
        if (json.status === "completed" && json.video_url) {
          if (pollRef.current) clearInterval(pollRef.current)
          setVideoUrl(json.video_url)
          setStatus("completed")
          toast({ title: "Video prete !", description: "Ta video a ete generee avec succes." })
        } else if (json.status === "failed") {
          if (pollRef.current) clearInterval(pollRef.current)
          setStatus("failed")
          toast({ title: "Echec de la generation", description: json.error?.message || "La video n'a pas pu etre generee.", variant: "destructive" })
        }
      } catch {
        // on retente au prochain tick
      }
    }, 5000)
  }, [toast])

  const handleGenerate = async () => {
    if (!file || !prompt.trim()) {
      toast({ title: "Champs manquants", description: "Ajoute une photo et un prompt.", variant: "destructive" })
      return
    }
    if (voiceMode === "preset" && !voiceId) {
      toast({ title: "Voix manquante", description: "Choisis une voix ou clone la tienne.", variant: "destructive" })
      return
    }
    if (voiceMode === "clone" && !voiceSample) {
      toast({ title: "Extrait vocal manquant", description: "Enregistre ou importe un extrait de ta voix (10-30s).", variant: "destructive" })
      return
    }
    setStatus("uploading")
    setVideoUrl(null)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("script", prompt.trim())
      if (voiceMode === "clone" && voiceSample) {
        fd.append("voice_sample", voiceSample)
      } else {
        fd.append("voice_id", voiceId)
      }
      if (gestures.length > 0) fd.append("motion_prompt", gestures.join(", "))
      fd.append("expressiveness", expressiveness)

      const res = await fetch("/api/heygen/photo-video", { method: "POST", body: fd })
      const json = await res.json()

      if (!res.ok) {
        setStatus("idle")
        if (res.status === 402 && json.code === "heygen_no_credit") {
          toast({ title: "Service indisponible", description: json.error, variant: "destructive" })
        } else if (res.status === 402) {
          toast({ title: "Points insuffisants", description: `Il te faut ${json.points_required} points (tu en as ${json.points_available}).`, variant: "destructive" })
        } else {
          toast({ title: "Erreur", description: json.error || "Impossible de lancer la generation.", variant: "destructive" })
        }
        return
      }

      setPoints(json.points_remaining)
      setStatus("processing")
      startPolling(json.video_id, json.clone_voice_id ?? null)
      toast({ title: "Generation lancee", description: "Cela peut prendre 1 a 3 minutes..." })
    } catch {
      setStatus("idle")
      toast({ title: "Erreur reseau", description: "Reessaie dans un instant.", variant: "destructive" })
    }
  }

  const toggleGesture = (value: string) => {
    setGestures((prev) => (prev.includes(value) ? prev.filter((g) => g !== value) : [...prev, value]))
  }

  const reset = () => {
    setFile(null)
    setPreviewUrl(null)
    setPrompt("")
    setGestures([])
    setVoiceSample(null)
    setVoiceSampleUrl(null)
    setVideoUrl(null)
    setStatus("idle")
    if (pollRef.current) clearInterval(pollRef.current)
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl"
            style={{ backgroundColor: "rgba(249,115,22,0.15)" }}
          >
            <ImageIcon className="h-6 w-6" style={{ color: ACCENT }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground text-balance">Photo en Vidéo</h1>
            <p className="text-muted-foreground text-sm">
              Anime ta photo : l&apos;IA la fait parler à partir de ton prompt.
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-hairline bg-card px-4 py-2">
          <p className="text-xs text-muted-foreground">Tes points</p>
          <p className="text-lg font-bold text-foreground">{points ?? "-"}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Colonne config */}
        <div className="space-y-5">
          {/* Upload */}
          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">1. Ta photo</label>
            <div
              onDrop={(e) => { e.preventDefault(); onSelectFile(e.dataTransfer.files?.[0]) }}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => !busy && fileInputRef.current?.click()}
              className={`relative flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-card p-6 text-center transition-colors ${
                previewUrl ? "border-primary" : "border-hairline-strong hover:border-white/40"
              } ${busy ? "pointer-events-none opacity-60" : ""}`}
            >
              {previewUrl ? (
                <div className="relative">
                  <img src={previewUrl || "/placeholder.svg"} alt="Aperçu de la photo importée" className="mx-auto max-h-64 rounded-lg object-contain" />
                  <button
                    onClick={(e) => { e.stopPropagation(); reset() }}
                    className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                    aria-label="Retirer la photo"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="mb-3 h-10 w-10 text-text-faint" />
                  <p className="text-muted-foreground">Glisse une photo ici ou clique pour choisir</p>
                  <p className="mt-1 text-sm text-text-faint">JPG, PNG ou WebP — Max 10 Mo</p>
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
            <p className="mt-2 text-xs text-text-faint">
              Astuce : une photo <strong>portrait</strong> donne une vidéo verticale idéale pour TikTok.
            </p>
          </div>

          {/* Prompt */}
          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">2. Prompt — ce que la personne va dire</label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex : Salut à tous, bienvenue sur mon live TikTok ! Aujourd'hui on parle de..."
              className="min-h-28 resize-none border-hairline bg-secondary text-foreground"
              maxLength={MAX_SCRIPT_CHARS}
              disabled={busy}
            />
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-text-faint">~{estimatedSeconds}s de vidéo</span>
              <span className="text-text-faint">{prompt.length}/{MAX_SCRIPT_CHARS}</span>
            </div>

            {/* Duree maximale de la video */}
            <div className="mt-3">
              <p className="mb-2 text-sm text-muted-foreground">Durée maximale</p>
              <div className="flex gap-2">
                {[30, 60].map((d) => {
                  const active = duration === d
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        if (busy) return
                        setDuration(d as 30 | 60)
                        setPrompt((p) => p.slice(0, d * CHARS_PER_SECOND))
                      }}
                      disabled={busy}
                      aria-pressed={active}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors disabled:opacity-50 ${
                        active
                          ? "border-primary bg-primary text-black font-medium"
                          : "border-hairline-strong bg-secondary text-foreground hover:border-white/40"
                      }`}
                    >
                      {d === 30 ? "30 secondes" : "1 minute"}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Voix */}
          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">3. Voix</label>
            {/* Choix du mode : voix HeyGen ou clonage de sa propre voix */}
            <div className="mb-3 flex gap-2">
              <button
                type="button"
                onClick={() => !busy && setVoiceMode("preset")}
                disabled={busy}
                aria-pressed={voiceMode === "preset"}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors disabled:opacity-50 ${
                  voiceMode === "preset"
                    ? "border-primary bg-primary text-black font-medium"
                    : "border-hairline-strong bg-secondary text-foreground hover:border-white/40"
                }`}
              >
                Voix ChapCam
              </button>
              <button
                type="button"
                onClick={() => !busy && setVoiceMode("clone")}
                disabled={busy}
                aria-pressed={voiceMode === "clone"}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors disabled:opacity-50 ${
                  voiceMode === "clone"
                    ? "border-primary bg-primary text-black font-medium"
                    : "border-hairline-strong bg-secondary text-foreground hover:border-white/40"
                }`}
              >
                Clonage de voix (+{CLONE_POINTS})
              </button>
            </div>

            {voiceMode === "preset" ? (
              voices.length === 0 ? (
                <p className="rounded-lg border border-hairline bg-card p-3 text-sm text-muted-foreground">
                  Aucune voix disponible. Vérifie la configuration HeyGen.
                </p>
              ) : (
                <Select value={voiceId} onValueChange={setVoiceId} disabled={busy}>
                  <SelectTrigger className="border-hairline bg-secondary text-foreground">
                    <SelectValue placeholder="Choisir une voix..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {voices.map((v) => (
                      <SelectItem key={v.voice_id} value={v.voice_id}>
                        {v.name} — {v.language} ({v.gender})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )
            ) : (
              <div className="rounded-lg border border-hairline bg-card p-4">
                {voiceSampleUrl ? (
                  <div className="space-y-3">
                    <audio src={voiceSampleUrl} controls className="w-full" />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={clearVoiceSample}
                      disabled={busy}
                      className="w-full border-hairline-strong text-foreground hover:bg-muted"
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Recommencer
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Enregistre ou importe <strong>10 à 30 secondes</strong> de ta voix (parle clairement, sans bruit).
                    </p>
                    <div className="flex gap-2">
                      {recording ? (
                        <Button
                          type="button"
                          onClick={stopRecording}
                          className="flex-1 bg-red-500 text-white hover:bg-red-600"
                        >
                          <Square className="mr-2 h-4 w-4" /> Arrêter
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          onClick={startRecording}
                          disabled={busy}
                          className="flex-1 bg-primary text-black hover:bg-primary/90"
                        >
                          <Mic className="mr-2 h-4 w-4" /> Enregistrer
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => audioInputRef.current?.click()}
                        disabled={busy || recording}
                        className="flex-1 border-hairline-strong text-foreground hover:bg-muted"
                      >
                        <Upload className="mr-2 h-4 w-4" /> Importer
                      </Button>
                    </div>
                    {recording && (
                      <p className="flex items-center gap-2 text-sm text-red-500">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" /> Enregistrement en cours...
                      </p>
                    )}
                    <input
                      ref={audioInputRef}
                      type="file"
                      accept="audio/*"
                      onChange={(e) => onSelectAudio(e.target.files?.[0])}
                      className="hidden"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Options avancees (repliable) : gestes + expressivite */}
          <div className="rounded-lg border border-hairline bg-card">
            <button
              type="button"
              onClick={() => setShowOptions((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-foreground"
              aria-expanded={showOptions}
            >
              <span className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                Options
                {gestures.length > 0 && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-black">
                    {gestures.length}
                  </span>
                )}
              </span>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showOptions ? "rotate-180" : ""}`} />
            </button>

            {showOptions && (
              <div className="space-y-4 border-t border-hairline px-4 py-4">
                {/* Gestes */}
                <div>
                  <p className="mb-2 text-sm text-muted-foreground">Gestes <span className="text-text-faint">(plusieurs possibles)</span></p>
                  <div className="flex flex-wrap gap-2">
                    {GESTURES.map((g) => {
                      const active = gestures.includes(g.value)
                      return (
                        <button
                          key={g.value}
                          type="button"
                          onClick={() => !busy && toggleGesture(g.value)}
                          disabled={busy}
                          aria-pressed={active}
                          className={`rounded-full border px-3 py-1.5 text-sm transition-colors disabled:opacity-50 ${
                            active
                              ? "border-primary bg-primary text-black font-medium"
                              : "border-hairline-strong bg-secondary text-foreground hover:border-white/40"
                          }`}
                        >
                          {g.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Expressivite */}
                <div>
                  <p className="mb-2 text-sm text-muted-foreground">Expressivité</p>
                  <div className="flex gap-2">
                    {EXPRESSIVENESS.map((e) => {
                      const active = expressiveness === e.value
                      return (
                        <button
                          key={e.value}
                          type="button"
                          onClick={() => !busy && setExpressiveness(e.value)}
                          disabled={busy}
                          aria-pressed={active}
                          className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors disabled:opacity-50 ${
                            active
                              ? "border-primary bg-primary text-black font-medium"
                              : "border-hairline-strong bg-secondary text-foreground hover:border-white/40"
                          }`}
                        >
                          {e.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* CTA */}
          <Button
            onClick={handleGenerate}
            disabled={
              busy ||
              !file ||
              !prompt.trim() ||
              (voiceMode === "preset" && !voiceId) ||
              (voiceMode === "clone" && !voiceSample)
            }
            className="w-full bg-primary font-semibold text-black hover:bg-primary/90 disabled:opacity-50"
          >
            {status === "uploading" ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Envoi de la photo...</>
            ) : status === "processing" ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Génération en cours...</>
            ) : (
              <><Wand2 className="mr-2 h-4 w-4" /> Générer la vidéo ({estimatedPoints} points)</>
            )}
          </Button>
        </div>

        {/* Colonne résultat */}
        <div>
          <label className="mb-2 block text-sm font-medium text-muted-foreground">Résultat</label>
          <div className="flex min-h-[24rem] flex-col items-center justify-center rounded-2xl border border-hairline bg-card p-6">
            {status === "completed" && videoUrl ? (
              <div className="w-full">
                <video src={videoUrl} controls playsInline className="mx-auto max-h-[28rem] w-full rounded-xl bg-black" />
                <div className="mt-4 flex gap-3">
                  <a href={videoUrl} download className="flex-1">
                    <Button className="w-full bg-primary text-black hover:bg-primary/90">
                      <Download className="mr-2 h-4 w-4" /> Télécharger
                    </Button>
                  </a>
                  <Button variant="outline" onClick={reset} className="flex-1 border-hairline-strong text-foreground hover:bg-muted">
                    Nouvelle vidéo
                  </Button>
                </div>
              </div>
            ) : busy ? (
              <div className="text-center">
                <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin" style={{ color: ACCENT }} />
                <p className="font-medium text-foreground">
                  {status === "uploading" ? "Envoi de ta photo..." : "L'IA anime ta photo..."}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">Cela prend généralement 1 à 3 minutes.</p>
              </div>
            ) : status === "failed" ? (
              <div className="text-center">
                <X className="mx-auto mb-3 h-12 w-12 text-red-500" />
                <p className="font-medium text-foreground">La génération a échoué</p>
                <Button variant="outline" onClick={reset} className="mt-4 border-hairline-strong text-foreground hover:bg-muted">
                  Réessayer
                </Button>
              </div>
            ) : (
              <div className="text-center">
                <Play className="mx-auto mb-3 h-12 w-12 text-text-faint" />
                <p className="text-muted-foreground">Ta vidéo générée apparaîtra ici.</p>
              </div>
            )}
          </div>

          {/* Aide */}
          <div className="mt-4 rounded-xl border p-4" style={{ borderColor: "rgba(249,115,22,0.25)", backgroundColor: "rgba(249,115,22,0.08)" }}>
            <p className="mb-1 flex items-center gap-2 text-sm font-medium" style={{ color: ACCENT }}>
              <Sparkles className="h-4 w-4" /> Conseils pour un bon résultat
            </p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>- Photo de face, visage bien visible et éclairé</li>
              <li>- Un seul visage sur la photo</li>
              <li>- Prompt clair : c&apos;est exactement ce que la personne dira</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
