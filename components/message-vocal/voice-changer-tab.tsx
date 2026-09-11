'use client'

import { useRef, useState } from 'react'
import { Upload, Sparkles, Loader2, RotateCcw, Wand2, ChevronDown, SlidersHorizontal } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { CatalogVoice, VoiceGroup } from '@/lib/message-vocal/voices'
import { VoicePicker } from './voice-picker'
import { AudioPlayer } from './audio-player'
import { Recorder } from './recorder'

const ACCENT = '#00d4ff'

interface Source {
  blob: Blob
  url: string
}

function triggerDownload(url: string, filename: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

interface VoiceChangerTabProps {
  groups: VoiceGroup[]
  selectedVoice: CatalogVoice | null
  onSelectVoice: (v: CatalogVoice) => void
}

export function VoiceChangerTab({ groups, selectedVoice, onSelectVoice }: VoiceChangerTabProps) {
  const { toast } = useToast()
  const [source, setSource] = useState<Source | null>(null)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [transforming, setTransforming] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [stability, setStability] = useState(0.5)
  const [similarity, setSimilarity] = useState(0.9)
  const [style, setStyle] = useState(0)
  const [removeNoise, setRemoveNoise] = useState(true)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const resetResult = () => {
    setResultUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }

  const setNewSource = (blob: Blob, url: string) => {
    setSource((prev) => {
      if (prev) URL.revokeObjectURL(prev.url)
      return { blob, url }
    })
    resetResult()
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('audio/')) {
      toast({ title: 'Fichier invalide', description: 'Choisissez un fichier audio.', variant: 'destructive' })
      return
    }
    setNewSource(file, URL.createObjectURL(file))
    if (fileRef.current) fileRef.current.value = ''
  }

  const transform = async () => {
    if (!source || !selectedVoice) return
    setTransforming(true)
    resetResult()
    try {
      const form = new FormData()
      form.append('audio', source.blob, 'message.webm')
      form.append('voiceId', selectedVoice.id)
      form.append('model', 'eleven_multilingual_sts_v2')
      form.append('stability', String(stability))
      form.append('similarity', String(similarity))
      form.append('style', String(style))
      form.append('speakerBoost', 'true')
      form.append('removeNoise', String(removeNoise))

      const res = await fetch('/api/voice/speech-to-speech', { method: 'POST', body: form })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Erreur ${res.status}`)
      }
      const blob = await res.blob()
      setResultUrl(URL.createObjectURL(blob))
      toast({ title: 'Voix transformée', description: `Nouvelle voix : ${selectedVoice.shortName}.` })
    } catch (e) {
      toast({ title: 'Échec de la transformation', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setTransforming(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Etape 1 : Enregistrer / importer */}
      <section>
        <StepHeader n={1} title="Enregistrez ou importez un message" />
        {!source ? (
          <>
            <Recorder onRecorded={(blob, url) => setNewSource(blob, url)} onError={(m) => toast({ title: 'Micro', description: m, variant: 'destructive' })} accent={ACCENT} disabled={transforming} />
            <div className="mt-3 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">ou</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] py-3 text-sm font-semibold text-foreground transition-colors hover:bg-white/[0.06]"
            >
              <Upload className="h-4 w-4" /> Importer un fichier audio
            </button>
            <input ref={fileRef} type="file" accept="audio/*" onChange={handleImport} className="hidden" />
          </>
        ) : (
          <div className="space-y-3">
            <AudioPlayer src={source.url} label="Votre enregistrement" accent={ACCENT} />
            <button
              onClick={() => {
                setSource((prev) => {
                  if (prev) URL.revokeObjectURL(prev.url)
                  return null
                })
                resetResult()
              }}
              className="flex items-center gap-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Recommencer l'enregistrement
            </button>
          </div>
        )}
      </section>

      {/* Etape 2 : Choisir une voix */}
      <section>
        <StepHeader n={2} title="Choisissez une voix cible" />
        <VoicePicker groups={groups} selectedId={selectedVoice?.id ?? null} onSelect={onSelectVoice} accent={ACCENT} />
      </section>

      {/* Reglages avances (repliables) */}
      <section>
        <button
          onClick={() => setShowAdvanced((s) => !s)}
          className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-white/[0.05]"
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" style={{ color: ACCENT }} /> Réglages avancés
          </span>
          <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
        </button>
        {showAdvanced && (
          <div className="mt-3 space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <Slider label="Stabilité" value={stability} onChange={setStability} hint="Plus bas = plus d'émotion et de variation" accent={ACCENT} />
            <Slider label="Similarité" value={similarity} onChange={setSimilarity} hint="Ressemblance à la voix cible" accent={ACCENT} />
            <Slider label="Style / expression" value={style} onChange={setStyle} hint="Accentue le style de la voix cible" accent={ACCENT} />
            <label className="flex cursor-pointer items-center justify-between">
              <span className="text-sm text-foreground">Réduction de bruit</span>
              <input type="checkbox" checked={removeNoise} onChange={(e) => setRemoveNoise(e.target.checked)} className="h-4 w-8 cursor-pointer appearance-none rounded-full bg-white/20 transition-colors checked:bg-[color:var(--sw)] relative before:absolute before:top-0.5 before:left-0.5 before:h-3 before:w-3 before:rounded-full before:bg-white before:transition-transform checked:before:translate-x-4" style={{ ['--sw' as string]: ACCENT }} />
            </label>
          </div>
        )}
      </section>

      {/* Etape 3 : Transformer */}
      <button
        onClick={transform}
        disabled={!source || !selectedVoice || transforming}
        className="btn-glow flex w-full items-center justify-center gap-2.5 rounded-2xl py-4 text-base font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
        style={{ background: `linear-gradient(135deg, ${ACCENT}, #8b5cf6)` }}
      >
        {transforming ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" /> Transformation de votre voix…
          </>
        ) : (
          <>
            <Sparkles className="h-5 w-5" /> Transformer ma voix
          </>
        )}
      </button>
      {!source && <p className="text-center text-xs text-muted-foreground">Enregistrez ou importez un message pour commencer.</p>}
      {source && !selectedVoice && <p className="text-center text-xs text-muted-foreground">Choisissez une voix cible ci-dessus.</p>}

      {/* Chargement / resultat */}
      {transforming && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] py-10">
          <div className="relative flex h-16 w-16 items-center justify-center">
            <span className="absolute inset-0 animate-ping rounded-full opacity-30" style={{ background: ACCENT }} />
            <span className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: `linear-gradient(135deg, ${ACCENT}, #8b5cf6)` }}>
              <Wand2 className="h-7 w-7 animate-pulse text-white" />
            </span>
          </div>
          <p className="mt-4 text-sm font-semibold text-foreground">Transformation de votre voix…</p>
          <p className="mt-1 text-xs text-muted-foreground">Intonation, rythme et émotions sont conservés.</p>
        </div>
      )}

      {resultUrl && !transforming && (
        <section className="space-y-3">
          <StepHeader n={4} title="Comparez et téléchargez" />
          {source && <AudioPlayer src={source.url} label="Voix originale" accent="#64748b" />}
          <AudioPlayer
            src={resultUrl}
            label={`Voix transformée · ${selectedVoice?.shortName ?? ''}`}
            accent={ACCENT}
            onDownload={() => triggerDownload(resultUrl, `message-vocal-${selectedVoice?.shortName ?? 'voix'}.mp3`)}
          />
          <button
            onClick={transform}
            disabled={transforming}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-3 text-sm font-semibold text-foreground transition-colors hover:bg-white/[0.08]"
          >
            <RotateCcw className="h-4 w-4" /> Régénérer
          </button>
        </section>
      )}
    </div>
  )
}

function StepHeader({ n, title }: { n: number; title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-foreground">{n}</span>
      <h2 className="text-sm font-bold text-foreground">{title}</h2>
    </div>
  )
}

function Slider({ label, value, onChange, hint, accent }: { label: string; value: number; onChange: (v: number) => void; hint: string; accent: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-xs tabular-nums text-muted-foreground">{Math.round(value * 100)}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="cc-range h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/15"
        style={{ accentColor: accent }}
      />
      <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  )
}
