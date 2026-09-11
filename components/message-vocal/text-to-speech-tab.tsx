'use client'

import { useState } from 'react'
import { Sparkles, Loader2, ChevronDown, SlidersHorizontal, Wand2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { CatalogVoice, VoiceGroup } from '@/lib/message-vocal/voices'
import { VOICE_MESSAGE_MAX_CHARS } from '@/lib/plans'
import type { VoiceQuota } from './message-vocal-client'
import { VoicePicker } from './voice-picker'
import { AudioPlayer } from './audio-player'

const ACCENT = '#8b5cf6'
// Plafond calibre pour un message vocal <= 15 s (borne aussi le cout ElevenLabs).
const MAX_CHARS = VOICE_MESSAGE_MAX_CHARS

function triggerDownload(url: string, filename: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

// Detection legere du francais pour envoyer language_code: "fr" (accents +
// mots-outils frequents). Sinon on laisse le modele multilingue auto-detecter.
function looksFrench(text: string): boolean {
  const t = text.toLowerCase()
  if (/[àâçéèêëîïôûùü]/.test(t)) return true
  return /\b(le|la|les|un|une|des|et|est|vous|nous|bonjour|merci|pour|avec|dans|je|tu)\b/.test(t)
}

interface TextToSpeechTabProps {
  groups: VoiceGroup[]
  selectedVoice: CatalogVoice | null
  onSelectVoice: (v: CatalogVoice) => void
  quota: VoiceQuota
  locked: boolean
  onConsumed: (remaining: number) => void
}

export function TextToSpeechTab({ groups, selectedVoice, onSelectVoice, quota, locked, onConsumed }: TextToSpeechTabProps) {
  const { toast } = useToast()
  const [text, setText] = useState('')
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [stability, setStability] = useState(0.5)
  const [similarity, setSimilarity] = useState(0.85)
  const [style, setStyle] = useState(0.2)
  const [speed, setSpeed] = useState(1)

  const chars = text.length
  const canGenerate = text.trim().length > 0 && !!selectedVoice && !generating && chars <= MAX_CHARS && !locked

  const generate = async () => {
    if (!selectedVoice || !text.trim()) return
    setGenerating(true)
    setResultUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    try {
      const res = await fetch('/api/voice/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          voiceId: selectedVoice.id,
          modelId: 'eleven_multilingual_v2',
          languageCode: looksFrench(text) ? 'fr' : undefined,
          stability,
          similarity,
          style,
          speed,
          speakerBoost: true,
        }),
      })
      if (res.status === 402) {
        const data = await res.json().catch(() => ({}))
        onConsumed(0)
        throw new Error(data.error || 'Messages vocaux épuisés.')
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Erreur ${res.status}`)
      }
      const remaining = Number(res.headers.get('X-Remaining-Credits'))
      const blob = await res.blob()
      setResultUrl(URL.createObjectURL(blob))
      if (Number.isFinite(remaining)) onConsumed(remaining)
      toast({ title: 'Audio généré', description: `Voix : ${selectedVoice.shortName}.` })
    } catch (e) {
      toast({ title: 'Échec de la génération', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Etape 1 : Texte */}
      <section>
        <StepHeader n={1} title="Écrivez ou collez votre texte" />
        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
            placeholder="Saisissez le message que vous souhaitez transformer en voix…"
            rows={6}
            className="w-full resize-y rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:border-white/20 focus:outline-none"
          />
          <span className={`absolute bottom-3 right-3 text-[11px] font-medium tabular-nums ${chars >= MAX_CHARS ? 'text-red-400' : 'text-muted-foreground'}`}>
            {chars} / {MAX_CHARS}
          </span>
        </div>
      </section>

      {/* Etape 2 : Voix */}
      <section>
        <StepHeader n={2} title="Choisissez une voix" />
        <VoicePicker groups={groups} selectedId={selectedVoice?.id ?? null} onSelect={onSelectVoice} accent={ACCENT} />
      </section>

      {/* Reglages avances */}
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
            <Slider label="Stabilité" value={stability} min={0} max={1} step={0.05} display={`${Math.round(stability * 100)}%`} onChange={setStability} hint="Plus bas = plus expressif, plus haut = plus régulier" accent={ACCENT} />
            <Slider label="Similarité" value={similarity} min={0} max={1} step={0.05} display={`${Math.round(similarity * 100)}%`} onChange={setSimilarity} hint="Fidélité au timbre de la voix" accent={ACCENT} />
            <Slider label="Style / expression" value={style} min={0} max={1} step={0.05} display={`${Math.round(style * 100)}%`} onChange={setStyle} hint="Accentue l'expressivité de la voix" accent={ACCENT} />
            <Slider label="Vitesse" value={speed} min={0.7} max={1.2} step={0.05} display={`${speed.toFixed(2)}×`} onChange={setSpeed} hint="Débit de parole" accent={ACCENT} />
          </div>
        )}
      </section>

      {/* Generer */}
      <button
        onClick={generate}
        disabled={!canGenerate}
        className="btn-glow flex w-full items-center justify-center gap-2.5 rounded-2xl py-4 text-base font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
        style={{ background: `linear-gradient(135deg, ${ACCENT}, #00d4ff)` }}
      >
        {generating ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" /> Génération de l'audio…
          </>
        ) : (
          <>
            <Sparkles className="h-5 w-5" /> Générer l'audio
          </>
        )}
      </button>
      {!selectedVoice && text.trim() && <p className="text-center text-xs text-muted-foreground">Choisissez une voix ci-dessus.</p>}

      {generating && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] py-10">
          <div className="relative flex h-16 w-16 items-center justify-center">
            <span className="absolute inset-0 animate-ping rounded-full opacity-30" style={{ background: ACCENT }} />
            <span className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: `linear-gradient(135deg, ${ACCENT}, #00d4ff)` }}>
              <Wand2 className="h-7 w-7 animate-pulse text-white" />
            </span>
          </div>
          <p className="mt-4 text-sm font-semibold text-foreground">Génération de l'audio…</p>
        </div>
      )}

      {resultUrl && !generating && (
        <section className="space-y-3">
          <StepHeader n={3} title="Écoutez et téléchargez" />
          <AudioPlayer
            src={resultUrl}
            label={`Audio · ${selectedVoice?.shortName ?? ''}`}
            accent={ACCENT}
            onDownload={() => triggerDownload(resultUrl, `message-vocal-${selectedVoice?.shortName ?? 'voix'}.mp3`)}
          />
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

function Slider({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
  hint,
  accent,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  display: string
  onChange: (v: number) => void
  hint: string
  accent: string
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-xs tabular-nums text-muted-foreground">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="cc-range h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/15"
        style={{ accentColor: accent }}
      />
      <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  )
}
