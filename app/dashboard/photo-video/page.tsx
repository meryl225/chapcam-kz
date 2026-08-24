"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Upload, X, Sparkles, Loader2, Download, Wand2, Play, Mic, Square, Trash2, ChevronDown, SlidersHorizontal, Check, Clapperboard, Plus, Volume2, Gauge } from "lucide-react"
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
import { CreditPacksSection } from "@/components/photo-video/credit-packs-section"
import { VideoHistorySection } from "@/components/video-history-section"
import { downloadVideo } from "@/lib/download-video"

interface Voice {
  voice_id: string
  name: string
  language: string
  gender: string
  preview: string | null
}

type Status = "idle" | "uploading" | "processing" | "completed" | "failed"

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

// Vitesse d'elocution : un debit legerement plus lent sonne plus naturel.
const SPEEDS: { label: string; value: number }[] = [
  { label: "Posé", value: 0.9 },
  { label: "Naturel", value: 1.0 },
  { label: "Énergique", value: 1.1 },
]

// HeyGen n'accepte QUE le MP3 ou le WAV pour le clonage vocal. Or l'enregistrement
// micro du navigateur (MediaRecorder) produit du WebM/Opus, et un import peut etre
// du M4A/AAC : ces formats font echouer le clone ("ne fonctionne pas"). On reconvertit
// donc systematiquement l'echantillon en WAV 16 bits mono via la Web Audio API avant
// l'envoi, ce qui garantit la compatibilite HeyGen quel que soit le format source.
function encodeWav(buffer: AudioBuffer): Blob {
  const numCh = buffer.numberOfChannels
  const length = buffer.length
  // Mixage mono (moyenne des canaux) pour un fichier leger et compatible.
  const mono = new Float32Array(length)
  for (let ch = 0; ch < numCh; ch++) {
    const data = buffer.getChannelData(ch)
    for (let i = 0; i < length; i++) mono[i] += data[i] / numCh
  }
  const sampleRate = buffer.sampleRate
  const dataSize = length * 2 // 16 bits = 2 octets/echantillon
  const buf = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buf)
  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i))
  }
  writeStr(0, "RIFF")
  view.setUint32(4, 36 + dataSize, true)
  writeStr(8, "WAVE")
  writeStr(12, "fmt ")
  view.setUint32(16, 16, true) // taille du chunk fmt
  view.setUint16(20, 1, true) // format PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true) // debit d'octets (mono 16 bits)
  view.setUint16(32, 2, true) // block align
  view.setUint16(34, 16, true) // bits par echantillon
  writeStr(36, "data")
  view.setUint32(40, dataSize, true)
  let offset = 44
  for (let i = 0; i < length; i++) {
    const s = Math.max(-1, Math.min(1, mono[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    offset += 2
  }
  return new Blob([view], { type: "audio/wav" })
}

async function convertAudioToWav(file: File): Promise<File> {
  const arrayBuf = await file.arrayBuffer()
  const AudioCtx: typeof AudioContext =
    window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const ctx = new AudioCtx()
  try {
    // slice(0) : decodeAudioData consomme le buffer, on lui passe une copie.
    const audioBuffer = await ctx.decodeAudioData(arrayBuf.slice(0))
    const wavBlob = encodeWav(audioBuffer)
    return new File([wavBlob], "voix.wav", { type: "audio/wav" })
  } finally {
    ctx.close().catch(() => {})
  }
}

export default function PhotoVideoPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [loading, setLoading] = useState(true)
  // Solde de credits Studio Photo en Video (1 credit = 1 video de 30s).
  const [remaining, setRemaining] = useState<number | null>(null)
  const [planName, setPlanName] = useState<string | null>(null)

  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [prompt, setPrompt] = useState("")
  const [voices, setVoices] = useState<Voice[]>([])
  const [voiceId, setVoiceId] = useState<string>("")
  const [gestures, setGestures] = useState<string[]>([])
  const [expressiveness, setExpressiveness] = useState<string>("medium")
  const [showOptions, setShowOptions] = useState(false)
  // Vitesse d'elocution (0.9 = pose, 1.0 = naturel, 1.1 = energique).
  const [speed, setSpeed] = useState<number>(1.0)
  // Apercu vocal : etat de generation + URL audio du texte lu par la voix choisie.
  const [previewing, setPreviewing] = useState(false)
  const [previewUrlAudio, setPreviewUrlAudio] = useState<string | null>(null)
  const previewAudioRef = useRef<HTMLAudioElement | null>(null)

  // Clonage de voix : mode ("preset" = voix HeyGen, "clone" = ta voix) + echantillon.
  const [voiceMode, setVoiceMode] = useState<"preset" | "clone">("preset")
  const [voiceSample, setVoiceSample] = useState<File | null>(null)
  const [voiceSampleUrl, setVoiceSampleUrl] = useState<string | null>(null)
  // Conversion de l'echantillon en WAV (asynchrone) : bloque la generation le temps.
  const [preparingSample, setPreparingSample] = useState(false)
  const [recording, setRecording] = useState(false)
  const mediaRecRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioInputRef = useRef<HTMLInputElement>(null)

  const [status, setStatus] = useState<Status>("idle")
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  // Téléchargement de la vidéo fraîchement générée (état du bouton).
  const [downloadingMain, setDownloadingMain] = useState(false)
  // Compteur incrémenté à chaque vidéo terminée : force la section "Mes vidéos"
  // à se rafraîchir pour afficher la nouvelle génération.
  const [historyRefresh, setHistoryRefresh] = useState(0)

  const busy = status === "uploading" || status === "processing"

  // Les videos font 30 SECONDES (1 credit = 1 video de 30s). La longueur du
  // prompt est bornee en consequence (~14 caracteres/seconde).
  const CHARS_PER_SECOND = 14
  const VIDEO_SECONDS = 30
  const MAX_SCRIPT_CHARS = VIDEO_SECONDS * CHARS_PER_SECOND
  const noQuota = remaining !== null && remaining <= 0

  // Auth + points + voices
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/login")
        return
      }
      // Solde de credits Studio Photo en Video (depuis le forfait actif).
      try {
        const qRes = await fetch("/api/heygen/photo-video?info=quota")
        const qJson = await qRes.json()
        if (qRes.ok) {
          setRemaining(qJson.remaining ?? 0)
          setPlanName(qJson.plan ?? null)
        } else {
          // Ne jamais laisser le spinner tourner indefiniment en cas d'erreur.
          setRemaining(0)
        }
      } catch {
        setRemaining(0)
      }

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

  // L'apercu vocal devient obsolete si le texte, la voix ou la vitesse changent.
  useEffect(() => {
    setPreviewUrlAudio(null)
  }, [prompt, voiceId, speed])

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

  const onSelectAudio = useCallback(async (f: File | undefined) => {
    if (!f) return
    if (!f.type.startsWith("audio/")) {
      toast({ title: "Format invalide", description: "Fichier audio uniquement (MP3, WAV, M4A...)", variant: "destructive" })
      return
    }
    if (f.size > 25 * 1024 * 1024) {
      toast({ title: "Fichier trop volumineux", description: "Max 25 Mo", variant: "destructive" })
      return
    }
    // HeyGen n'accepte que MP3/WAV : on reconvertit tout import en WAV compatible.
    setPreparingSample(true)
    try {
      const wav = await convertAudioToWav(f)
      setVoiceSample(wav)
      setVoiceSampleUrl(URL.createObjectURL(wav))
    } catch {
      toast({
        title: "Audio illisible",
        description: "Impossible de lire ce fichier. Essaie un MP3 ou un WAV clair de 10 à 30s.",
        variant: "destructive",
      })
    } finally {
      setPreparingSample(false)
    }
  }, [toast])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream)
      chunksRef.current = []
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      rec.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" })
        stream.getTracks().forEach((t) => t.stop())
        // L'enregistrement est du WebM/Opus : HeyGen ne l'accepte pas pour le
        // clonage. On le reconvertit en WAV avant de le stocker pour l'envoi.
        setPreparingSample(true)
        try {
          const wav = await convertAudioToWav(new File([blob], "raw", { type: blob.type }))
          setVoiceSample(wav)
          setVoiceSampleUrl(URL.createObjectURL(wav))
        } catch {
          toast({
            title: "Enregistrement illisible",
            description: "Réessaie d'enregistrer 10 à 30s en parlant clairement.",
            variant: "destructive",
          })
        } finally {
          setPreparingSample(false)
        }
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

  // Ecouter un apercu : genere l'audio du texte exact avec la voix + vitesse
  // choisies (meme moteur que la video -> l'apercu correspond au rendu final).
  const handlePreviewVoice = useCallback(async () => {
    if (!prompt.trim()) {
      toast({ title: "Texte manquant", description: "Écris d'abord le texte à dire.", variant: "destructive" })
      return
    }
    if (!voiceId) {
      toast({ title: "Voix manquante", description: "Choisis une voix ChapCam pour l'aperçu.", variant: "destructive" })
      return
    }
    setPreviewing(true)
    setPreviewUrlAudio(null)
    try {
      const res = await fetch("/api/heygen/voice-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: prompt.trim(), voice_id: voiceId, speed }),
      })
      const json = await res.json()
      if (!res.ok || !json.audio_url) {
        toast({ title: "Aperçu indisponible", description: json.error || "Impossible de générer l'aperçu.", variant: "destructive" })
        return
      }
      setPreviewUrlAudio(json.audio_url)
      // Laisser le DOM monter l'element <audio> avant de lancer la lecture.
      setTimeout(() => previewAudioRef.current?.play().catch(() => {}), 100)
    } catch {
      toast({ title: "Erreur réseau", description: "Réessaie dans un instant.", variant: "destructive" })
    } finally {
      setPreviewing(false)
    }
  }, [prompt, voiceId, speed, toast])

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
          setHistoryRefresh((n) => n + 1)
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
    if (preparingSample) {
      toast({ title: "Préparation en cours", description: "Ton extrait vocal est en cours de préparation, patiente une seconde.", variant: "destructive" })
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
      fd.append("speed", String(speed))

      const res = await fetch("/api/heygen/photo-video", { method: "POST", body: fd })
      const json = await res.json()

      if (!res.ok) {
        setStatus("idle")
        if (res.status === 402 && json.code === "heygen_no_credit") {
          toast({ title: "Service indisponible", description: json.error, variant: "destructive" })
        } else if (res.status === 402 && json.code === "no_plan") {
          toast({ title: "Aucun forfait actif", description: json.error, variant: "destructive" })
        } else if (res.status === 402 && json.code === "quota_exhausted") {
          setRemaining(0)
          toast({ title: "Credits epuises", description: json.error, variant: "destructive" })
        } else if (res.status === 504 && json.code === "clone_timeout") {
          toast({ title: "Clonage trop long", description: json.error, variant: "destructive" })
        } else {
          const detail = json.detail ? ` (${json.detail})` : ""
          toast({ title: "Erreur", description: `${json.error || "Impossible de lancer la generation."}${detail}`, variant: "destructive" })
        }
        return
      }

      if (typeof json.remaining === "number") setRemaining(json.remaining)
      setStatus("processing")
      startPolling(json.video_id, json.clone_voice_id ?? null)
      toast({ title: "Generation lancee", description: "Cela peut prendre 1 a 3 minutes..." })
    } catch {
      setStatus("idle")
      toast({ title: "Erreur reseau", description: "Reessaie dans un instant.", variant: "destructive" })
    }
  }

  // Enregistrement FIABLE sur mobile ET ordinateur de la vidéo générée
  // (l'attribut HTML `download` est ignoré sur mobile -> voir lib/download-video).
  const handleDownloadMain = useCallback(async () => {
    if (!videoUrl) return
    setDownloadingMain(true)
    try {
      await downloadVideo(videoUrl, `chapcam-photo-video-${Date.now()}.mp4`)
    } finally {
      setDownloadingMain(false)
    }
  }, [videoUrl])

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

  // Etat de complétion de chaque étape (pour les badges numérotés).
  const photoDone = !!file
  const promptDone = !!prompt.trim()
  const voiceDone = voiceMode === "preset" ? !!voiceId : !!voiceSample
  const canGenerate = photoDone && promptDone && voiceDone && !busy && !noQuota && !preparingSample

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Pastille numérotée d'étape (coche verte quand l'étape est validée).
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
            <Clapperboard className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground text-balance">Studio Photo en Vidéo</h1>
            <p className="text-sm text-muted-foreground">
              Anime ta photo : l&apos;IA la fait parler, avec gestes et voix personnalisée.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/10 p-2 pl-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/20">
            <Clapperboard className="h-5 w-5 text-primary" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-xs font-medium text-muted-foreground">Crédits vidéo (30s)</span>
            {remaining === null ? (
              <Loader2 className="mt-1 h-4 w-4 animate-spin text-primary" aria-label="Chargement du solde" />
            ) : (
              <span className="text-xl font-bold text-foreground">{remaining}</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              document.getElementById("recharger-credits")?.scrollIntoView({ behavior: "smooth", block: "start" })
            }}
            className="ml-1 flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Recharger
          </button>
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
                <p className="text-xs text-muted-foreground">JPG, PNG ou WebP — portrait recommandé</p>
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
                  <p className="mt-1 text-xs text-text-faint">Max 10 Mo — une photo portrait donne une vidéo TikTok verticale</p>
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

          {/* Etape 2 — Prompt */}
          <section className="rounded-2xl border border-hairline bg-card p-5">
            <div className="mb-4 flex items-center gap-3">
              <StepBadge n={2} done={promptDone} />
              <div>
                <h2 className="text-sm font-semibold text-foreground">Le texte à dire</h2>
                <p className="text-xs text-muted-foreground">Exactement ce que la personne prononcera</p>
              </div>
            </div>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex : Salut à tous, bienvenue sur mon live TikTok ! Aujourd'hui on parle de..."
              className="min-h-28 resize-none border-hairline bg-secondary/50 text-foreground"
              maxLength={MAX_SCRIPT_CHARS}
              disabled={busy}
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <span className="rounded-full border border-hairline-strong bg-secondary px-3 py-1 text-xs font-medium text-foreground">
                Vidéo de 30s
              </span>
              <span className="text-xs text-text-faint">{prompt.length}/{MAX_SCRIPT_CHARS}</span>
            </div>
          </section>

          {/* Etape 3 — Voix */}
          <section className="rounded-2xl border border-hairline bg-card p-5">
            <div className="mb-4 flex items-center gap-3">
              <StepBadge n={3} done={voiceDone} />
              <div>
                <h2 className="text-sm font-semibold text-foreground">La voix</h2>
                <p className="text-xs text-muted-foreground">Une voix ChapCam ou clone la tienne</p>
              </div>
            </div>
            {/* Choix du mode : voix HeyGen ou clonage de sa propre voix */}
            <div className="mb-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => !busy && setVoiceMode("preset")}
                disabled={busy}
                aria-pressed={voiceMode === "preset"}
                className={`rounded-lg border px-3 py-2 text-sm transition-colors disabled:opacity-50 ${
                  voiceMode === "preset"
                    ? "border-primary bg-primary text-primary-foreground font-medium"
                    : "border-hairline-strong bg-secondary text-foreground hover:border-primary/50"
                }`}
              >
                Voix ChapCam
              </button>
              <button
                type="button"
                onClick={() => !busy && setVoiceMode("clone")}
                disabled={busy}
                aria-pressed={voiceMode === "clone"}
                className={`rounded-lg border px-3 py-2 text-sm transition-colors disabled:opacity-50 ${
                  voiceMode === "clone"
                    ? "border-primary bg-primary text-primary-foreground font-medium"
                    : "border-hairline-strong bg-secondary text-foreground hover:border-primary/50"
                }`}
              >
                Clonage de voix
              </button>
            </div>

            {voiceMode === "preset" ? (
              voices.length === 0 ? (
                <p className="rounded-lg border border-hairline bg-secondary/40 p-3 text-sm text-muted-foreground">
                  Aucune voix disponible. Vérifie la configuration HeyGen.
                </p>
              ) : (
                <Select value={voiceId} onValueChange={setVoiceId} disabled={busy}>
                  <SelectTrigger className="border-hairline bg-secondary/50 text-foreground">
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
              <div className="rounded-xl border border-hairline bg-secondary/40 p-4">
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
                      Enregistre ou importe <strong className="text-foreground">10 à 30 secondes</strong> de ta voix (parle clairement, sans bruit).
                    </p>
                    <div className="flex gap-2">
                      {recording ? (
                        <Button
                          type="button"
                          onClick={stopRecording}
                          className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          <Square className="mr-2 h-4 w-4" /> Arrêter
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          onClick={startRecording}
                          disabled={busy}
                          className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
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
                      <p className="flex items-center gap-2 text-sm text-destructive">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" /> Enregistrement en cours...
                      </p>
                    )}
                    {preparingSample && (
                      <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" /> Préparation de l&apos;extrait vocal...
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

            {/* Vitesse d'elocution : un debit un peu plus lent sonne plus humain. */}
            <div className="mt-4">
              <p className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Gauge className="h-4 w-4" /> Vitesse de la voix
              </p>
              <div className="flex gap-2">
                {SPEEDS.map((s) => {
                  const active = speed === s.value
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => !busy && setSpeed(s.value)}
                      disabled={busy}
                      aria-pressed={active}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors disabled:opacity-50 ${
                        active
                          ? "border-primary bg-primary text-primary-foreground font-medium"
                          : "border-hairline-strong bg-secondary text-foreground hover:border-primary/50"
                      }`}
                    >
                      {s.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Apercu vocal : ecouter le texte lu par la voix AVANT la video. */}
            {voiceMode === "preset" && (
              <div className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePreviewVoice}
                  disabled={busy || previewing || !prompt.trim() || !voiceId}
                  className="w-full border-primary/40 text-foreground hover:bg-primary/10"
                >
                  {previewing ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Génération de l&apos;aperçu...</>
                  ) : (
                    <><Volume2 className="mr-2 h-4 w-4 text-primary" /> Écouter un aperçu de la voix</>
                  )}
                </Button>
                {previewUrlAudio && (
                  <audio
                    ref={previewAudioRef}
                    src={previewUrlAudio}
                    controls
                    className="mt-3 w-full"
                  />
                )}
                <p className="mt-2 text-xs text-text-faint">
                  L&apos;aperçu utilise la même voix que la vidéo finale — ce que tu entends, c&apos;est ce que tu obtiendras.
                </p>
              </div>
            )}
          </section>

          {/* Options avancees (repliable) : gestes + expressivite */}
          <section className="rounded-2xl border border-hairline bg-card">
            <button
              type="button"
              onClick={() => setShowOptions((v) => !v)}
              className="flex w-full items-center justify-between px-5 py-4 text-sm font-medium text-foreground"
              aria-expanded={showOptions}
            >
              <span className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                Gestes & expressivité
                {gestures.length > 0 && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                    {gestures.length}
                  </span>
                )}
              </span>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showOptions ? "rotate-180" : ""}`} />
            </button>

            {showOptions && (
              <div className="space-y-4 border-t border-hairline px-5 py-4">
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
                              ? "border-primary bg-primary text-primary-foreground font-medium"
                              : "border-hairline-strong bg-secondary text-foreground hover:border-primary/50"
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
                              ? "border-primary bg-primary text-primary-foreground font-medium"
                              : "border-hairline-strong bg-secondary text-foreground hover:border-primary/50"
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
          </section>
        </div>

        {/* Colonne résultat — cadre vertical façon studio */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-hairline bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Aperçu</h2>
              <span className="rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground">Format 9:16</span>
            </div>

            {/* Cadre vertical 9:16 */}
            <div className="mx-auto w-full max-w-[300px]">
              <div className="relative aspect-[9/16] w-full overflow-hidden rounded-2xl border border-hairline bg-secondary/40">
                {status === "completed" && videoUrl ? (
                  <video src={videoUrl} controls playsInline className="h-full w-full bg-black object-contain" />
                ) : busy ? (
                  <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                    <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" />
                    <p className="font-medium text-foreground">
                      {status === "uploading"
                        ? voiceMode === "clone"
                          ? "Clonage de ta voix..."
                          : "Envoi de ta photo..."
                        : "L'IA anime ta photo..."}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {status === "uploading" && voiceMode === "clone"
                        ? "Le clonage prend jusqu'à 2 minutes, patiente ici."
                        : "Généralement 1 à 3 minutes."}
                    </p>
                  </div>
                ) : status === "failed" ? (
                  <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                      <X className="h-6 w-6 text-destructive" />
                    </div>
                    <p className="font-medium text-foreground">La génération a échoué</p>
                  </div>
                ) : previewUrl ? (
                  <>
                    <img src={previewUrl || "/placeholder.svg"} alt="Aperçu de ta photo" className="h-full w-full object-cover opacity-40" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-background/80 backdrop-blur">
                        <Play className="h-7 w-7 text-primary" />
                      </div>
                      <p className="mt-3 px-6 text-sm font-medium text-foreground">Prêt à animer ta photo</p>
                    </div>
                  </>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                      <Play className="h-6 w-6 text-text-faint" />
                    </div>
                    <p className="text-sm text-muted-foreground">Ta vidéo apparaîtra ici</p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions sous l'aperçu */}
            {status === "completed" && videoUrl ? (
              <div className="mt-4 flex gap-3">
                <Button
                  onClick={handleDownloadMain}
                  disabled={downloadingMain}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {downloadingMain ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enregistrement...</>
                  ) : (
                    <><Download className="mr-2 h-4 w-4" /> Télécharger</>
                  )}
                </Button>
                <Button variant="outline" onClick={reset} className="flex-1 border-hairline-strong text-foreground hover:bg-muted">
                  Nouvelle vidéo
                </Button>
              </div>
            ) : status === "failed" ? (
              <Button variant="outline" onClick={reset} className="mt-4 w-full border-hairline-strong text-foreground hover:bg-muted">
                Réessayer
              </Button>
            ) : (
              <>
                {noQuota && (
                  <div className="mt-4 rounded-2xl border border-hairline-strong bg-muted p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      {planName
                        ? "Tu as utilisé toutes tes vidéos incluses. Recharge un forfait pour en obtenir plus."
                        : "Aucun forfait actif. Achète un forfait pour recevoir tes vidéos de 30s."}
                    </p>
                    <a href="/dashboard/plans" className="mt-2 inline-block text-sm font-semibold text-primary hover:underline">
                      Voir les forfaits
                    </a>
                  </div>
                )}
              <Button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="btn-glow mt-4 h-11 w-full bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {status === "uploading" ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Envoi de la photo...</>
                ) : status === "processing" ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Génération...</>
                ) : (
                  <><Wand2 className="mr-2 h-5 w-5" /> {noQuota ? "Crédits épuisés" : "Générer la vidéo"}</>
                )}
              </Button>
              </>
            )}
          </div>

          {/* Aide */}
          <div className="mt-4 rounded-2xl border border-primary/25 bg-primary/5 p-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" /> Conseils pour un bon résultat
            </p>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> Photo de face, visage bien visible et éclairé</li>
              <li className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> Un seul visage sur la photo</li>
              <li className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> Un texte clair et naturel à prononcer</li>
            </ul>
          </div>

          {/* Techniques pour une voix humaine (anti-robotique) */}
          <div className="mt-4 rounded-2xl border border-hairline bg-card p-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
              <Volume2 className="h-4 w-4 text-primary" /> Pour une voix vraiment humaine
            </p>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> Ponctue : les virgules et points créent des pauses naturelles</li>
              <li className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> Écris comme tu parles : phrases courtes, mots simples</li>
              <li className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> Utilise « ... » pour un suspense, « ! » et « ? » pour l&apos;intonation</li>
              <li className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> Évite les MAJUSCULES et sigles : ils sont lus de façon mécanique</li>
              <li className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> Vitesse « Posé » = ton plus posé et confiant</li>
              <li className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> Le plus humain : clone ta propre voix (onglet « Clonage »)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Historique permanent : toutes les vidéos générées par cet utilisateur */}
      <VideoHistorySection tool="photo_video" refreshKey={historyRefresh} />

      {/* Achat de credits video (sans forfait Live Swap requis) */}
      <div id="recharger-credits" className="scroll-mt-8">
        <CreditPacksSection />
      </div>
    </div>
  )
}
