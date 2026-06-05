'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Mic,
  Volume2,
  Radio,
  HelpCircle,
  Settings,
  Check,
  ChevronDown,
  User,
  UserRound,
  Bot,
  Baby,
  Flame,
  Gauge,
  Sparkles,
  Waves,
  Power,
} from 'lucide-react'

type VoiceId = 'naturel' | 'femme' | 'homme' | 'robot' | 'enfant' | 'demon'

interface Voice {
  id: VoiceId
  label: string
  sub: string
  icon: React.ElementType
  color: string
}

const VOICES: Voice[] = [
  { id: 'naturel', label: 'Naturel', sub: 'Votre voix originale', icon: Waves, color: '#00ff88' },
  { id: 'femme', label: 'Femme', sub: 'Voix féminine', icon: UserRound, color: '#ec4899' },
  { id: 'homme', label: 'Homme', sub: 'Voix masculine', icon: User, color: '#38bdf8' },
  { id: 'robot', label: 'Robot', sub: 'Voix robotique', icon: Bot, color: '#94a3b8' },
  { id: 'enfant', label: 'Enfant', sub: "Voix d'enfant", icon: Baby, color: '#f59e0b' },
  { id: 'demon', label: 'Démon', sub: 'Voix démoniaque', icon: Flame, color: '#a855f7' },
]

function WaveBars({ color, count = 28, side }: { color: string; count?: number; side: 'left' | 'right' }) {
  return (
    <div
      className={`flex h-16 flex-1 items-center gap-[3px] ${side === 'left' ? 'justify-end' : 'justify-start'}`}
      aria-hidden
    >
      {Array.from({ length: count }).map((_, i) => {
        const h = 20 + Math.abs(Math.sin((i / count) * Math.PI * 2)) * 80
        return (
          <span
            key={i}
            className="cc-wave-bar w-[3px] rounded-full"
            style={{
              height: `${h}%`,
              backgroundColor: color,
              animationDelay: `${(i % 10) * 0.08}s`,
              opacity: 0.5 + (h / 100) * 0.5,
            }}
          />
        )
      })}
    </div>
  )
}

function Slider({
  icon: Icon,
  label,
  value,
  onChange,
}: {
  icon: React.ElementType
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex w-44 shrink-0 items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4 text-text-faint" />
        <span>{label}</span>
        <HelpCircle className="h-3.5 w-3.5 text-text-faint" />
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="cc-range h-1.5 flex-1 cursor-pointer appearance-none rounded-full"
        style={{
          background: `linear-gradient(to right, #00ff88 ${value}%, rgba(255,255,255,0.1) ${value}%)`,
        }}
      />
      <span className="w-12 shrink-0 text-right text-sm font-semibold text-foreground">{value}%</span>
    </div>
  )
}

export default function VoiceChangerPage() {
  const [selectedVoice, setSelectedVoice] = useState<VoiceId>('naturel')
  const [intensity, setIntensity] = useState(80)
  const [clarity, setClarity] = useState(70)
  const [noiseReduction, setNoiseReduction] = useState(60)
  const [isActive, setIsActive] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [pitch, setPitch] = useState(50)
  const [reverb, setReverb] = useState(20)
  const [autoTune, setAutoTune] = useState(false)

  const active = VOICES.find((v) => v.id === selectedVoice)!

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 lg:px-8">
      {/* Header */}
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">Voice Changer v1</h1>
            <span className="flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-bold text-primary">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              LIVE
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Changez votre voix en temps réel pendant vos appels et diffusions via OBS.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 rounded-xl border border-hairline bg-muted px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted">
            <HelpCircle className="h-4 w-4" />
            Guide d&apos;utilisation
          </button>
          <button
            aria-label="Paramètres"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-hairline bg-muted text-muted-foreground transition-colors hover:bg-muted"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Status bar */}
      <div className="mb-5 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-hairline bg-muted sm:grid-cols-3">
        {[
          { icon: Mic, label: 'Micro détecté', value: 'HyperX QuadCast', color: '#00ff88' },
          { icon: Volume2, label: 'Sortie audio', value: 'ChapCam Virtual Audio', color: '#38bdf8' },
          { icon: Radio, label: 'OBS', value: 'Connecté', color: '#00ff88', dot: true },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-3 bg-card px-5 py-4">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${s.color}1f` }}
            >
              <s.icon className="h-5 w-5" style={{ color: s.color }} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-text-faint">{s.label}</p>
              <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-foreground">
                {s.dot && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                {s.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Central live zone */}
      <div className="mb-5 rounded-2xl border border-hairline bg-gradient-to-b from-[#111] to-[#0a0a0a] p-8">
        <p className="mb-6 text-center text-lg font-semibold text-foreground">Votre voix en temps réel</p>
        <div className="flex items-center justify-center gap-4">
          <WaveBars color="#00ff88" side="left" />
          <div className="relative shrink-0">
            <div
              className={`flex h-28 w-28 items-center justify-center rounded-full border-2 transition-all duration-500 ${
                isActive ? 'border-[#a855f7]' : 'border-primary'
              }`}
              style={{
                boxShadow: isActive
                  ? '0 0 40px rgba(168,85,247,0.5)'
                  : '0 0 40px rgba(0,255,136,0.4)',
              }}
            >
              <div
                className="cc-pulse flex h-20 w-20 items-center justify-center rounded-full"
                style={{ backgroundColor: isActive ? 'rgba(168,85,247,0.15)' : 'rgba(0,255,136,0.12)' }}
              >
                <Mic className="h-9 w-9" style={{ color: isActive ? '#c084fc' : '#00ff88' }} />
              </div>
            </div>
          </div>
          <WaveBars color="#a855f7" side="right" />
        </div>
        <div className="mt-6 flex justify-center">
          <span className="flex items-center gap-2 rounded-full border border-hairline bg-muted px-4 py-1.5 text-sm text-muted-foreground">
            <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
            {isActive ? 'Transformation active...' : 'En écoute...'}
          </span>
        </div>
      </div>

      {/* Choose a voice */}
      <section className="mb-5 rounded-2xl border border-hairline bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Choisir une voix</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {VOICES.map((v) => {
            const isSel = v.id === selectedVoice
            return (
              <button
                key={v.id}
                onClick={() => setSelectedVoice(v.id)}
                className={`group relative flex flex-col items-center gap-3 rounded-xl border p-4 transition-all duration-200 ${
                  isSel
                    ? 'border-primary bg-primary/10'
                    : 'border-hairline bg-muted hover:border-white/25 hover:bg-muted'
                }`}
                style={isSel ? { boxShadow: '0 0 20px rgba(0,255,136,0.15)' } : undefined}
              >
                {isSel && (
                  <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                    <Check className="h-3 w-3 text-black" />
                  </span>
                )}
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: `${v.color}1f`,
                    boxShadow: isSel ? `0 0 16px ${v.color}55` : undefined,
                  }}
                >
                  <v.icon className="h-6 w-6" style={{ color: v.color }} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground">{v.label}</p>
                  <p className="mt-0.5 text-[11px] text-text-faint">{v.sub}</p>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* Quick settings */}
      <section className="mb-5 rounded-2xl border border-hairline bg-card p-6">
        <h2 className="mb-5 text-lg font-semibold text-foreground">Réglages rapides</h2>
        <div className="flex flex-col gap-5">
          <Slider icon={Mic} label="Intensité" value={intensity} onChange={setIntensity} />
          <Slider icon={Sparkles} label="Clarté" value={clarity} onChange={setClarity} />
          <Slider icon={Gauge} label="Réduction du bruit" value={noiseReduction} onChange={setNoiseReduction} />
        </div>
      </section>

      {/* Activate button */}
      <button
        onClick={() => setIsActive((a) => !a)}
        className="mb-5 flex w-full flex-col items-center justify-center rounded-2xl bg-gradient-to-r from-[#7c3aed] via-[#8b5cf6] to-[#a855f7] py-5 text-center transition-all duration-300 hover:brightness-110"
        style={{ boxShadow: '0 8px 30px rgba(124,58,237,0.4)' }}
      >
        <span className="flex items-center gap-2 text-lg font-bold text-foreground">
          {isActive ? <Power className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          {isActive ? 'Désactiver Voice Changer' : 'Activer Voice Changer'}
        </span>
        <span className="mt-0.5 text-sm text-foreground/70">
          {isActive
            ? `Voix "${active.label}" appliquée en temps réel`
            : 'Le changement de voix sera appliqué en temps réel'}
        </span>
      </button>

      {/* Advanced settings */}
      <section className="rounded-2xl border border-hairline bg-card">
        <button
          onClick={() => setAdvancedOpen((o) => !o)}
          className="flex w-full items-center justify-between px-6 py-4 text-left"
          aria-expanded={advancedOpen}
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Settings className="h-4 w-4 text-muted-foreground" />
            Paramètres avancés
          </span>
          <ChevronDown
            className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${advancedOpen ? 'rotate-180' : ''}`}
          />
        </button>
        {advancedOpen && (
          <div className="flex flex-col gap-5 border-t border-hairline px-6 py-5">
            <Slider icon={Waves} label="Hauteur (pitch)" value={pitch} onChange={setPitch} />
            <Slider icon={Sparkles} label="Réverbération" value={reverb} onChange={setReverb} />
            <label className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Gauge className="h-4 w-4 text-text-faint" />
                Auto-Tune
              </span>
              <button
                onClick={() => setAutoTune((a) => !a)}
                className={`relative h-6 w-11 rounded-full transition-colors ${autoTune ? 'bg-primary' : 'bg-white/15'}`}
                aria-pressed={autoTune}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${autoTune ? 'translate-x-5' : 'translate-x-0.5'}`}
                />
              </button>
            </label>
          </div>
        )}
      </section>

      {/* Helper note */}
      <p className="mt-5 text-center text-xs text-text-faint">
        Besoin d&apos;aide pour configurer OBS ?{' '}
        <Link href="/dashboard" className="text-primary hover:underline">
          Consulter le guide
        </Link>
      </p>
    </div>
  )
}
