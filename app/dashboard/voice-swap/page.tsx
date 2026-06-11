'use client'

import { useMemo, useState } from 'react'
import {
  AudioLines,
  Mic,
  Radio,
  Activity,
  Wifi,
  WifiOff,
  Gauge,
  Layers,
  Power,
  Loader2,
  AlertTriangle,
  ChevronDown,
  Monitor,
  ArrowRight,
  ShieldCheck,
  MessageCircle,
  Send,
  Hash,
  Check,
  Copy,
} from 'lucide-react'
import { useVoiceSwap } from '@/hooks/use-voice-swap'
import { VoiceOffersSection } from '@/components/voice-swap/voice-offers-section'
import {
  DEFAULT_AUDIO_FORMAT,
  DEFAULT_CHUNKING,
  type ConnectionQuality,
  type VoiceSwapPhase,
} from '@/lib/voice-swap'

const PHASE_LABELS: Record<VoiceSwapPhase, string> = {
  idle: 'Inactif',
  connecting: 'Connexion...',
  running: 'Conversion active',
  reconnecting: 'Reconnexion...',
  error: 'Erreur',
  stopping: 'Arret...',
}

const QUALITY_LABELS: Record<ConnectionQuality, string> = {
  unknown: 'Inconnue',
  good: 'Bonne',
  degraded: 'Moyenne',
  poor: 'Faible',
}

const QUALITY_COLORS: Record<ConnectionQuality, string> = {
  unknown: '#94a3b8',
  good: '#00ff88',
  degraded: '#f59e0b',
  poor: '#ef4444',
}

// Etapes du pipeline temps reel (architecture cible, affichee a l'utilisateur).
const PIPELINE = [
  { icon: Mic, label: 'Micro' },
  { icon: AudioLines, label: 'PCM 16kHz' },
  { icon: Layers, label: 'Chunks' },
  { icon: Wifi, label: 'WebSocket' },
  { icon: Activity, label: 'ElevenLabs' },
  { icon: Radio, label: 'VB-Cable' },
]

// Plateformes cibles de sortie (via le micro virtuel VB-Cable).
const TARGETS = [
  { icon: MessageCircle, label: 'WhatsApp' },
  { icon: Send, label: 'Telegram' },
  { icon: Hash, label: 'Discord' },
]

export default function VoiceSwapPage() {
  const { state, available, devices, voices, start, stop } = useVoiceSwap()
  const [selectedVoice, setSelectedVoice] = useState('')
  const [voiceMenuOpen, setVoiceMenuOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const selectedVoiceProfile = useMemo(
    () => voices.find((v) => v.id === selectedVoice) || null,
    [voices, selectedVoice],
  )

  const copyVoiceId = async () => {
    if (!selectedVoice) return
    try {
      await navigator.clipboard.writeText(selectedVoice)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // presse-papiers indisponible : on ignore
    }
  }

  const isRunning = state.phase === 'running'
  const isTransitioning = state.phase === 'connecting' || state.phase === 'stopping' || state.phase === 'reconnecting'

  const inputs = useMemo(() => devices.filter((d) => d.kind === 'audioinput'), [devices])
  const outputs = useMemo(() => devices.filter((d) => d.kind === 'audiooutput'), [devices])
  const [inputDeviceId, setInputDeviceId] = useState<string>('')
  const [outputDeviceId, setOutputDeviceId] = useState<string>('')

  const handleToggle = async () => {
    setBusy(true)
    try {
      if (isRunning) {
        await stop()
      } else {
        await start({
          conversion: { voiceId: selectedVoice },
          inputDeviceId: inputDeviceId || null,
          outputDeviceId: outputDeviceId || null,
        })
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 lg:px-8">
      {/* Header */}
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground md:text-3xl">
              <AudioLines className="h-7 w-7 text-primary" />
              Voice Swap
            </h1>
            <span className="rounded-full bg-violet-500/20 px-2.5 py-1 text-[11px] font-bold text-violet-300">
              PRO
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground text-pretty">
            Conversion de voix en temps reel par streaming : votre micro est transforme en direct
            puis renvoye vers un micro virtuel pour WhatsApp, Telegram et Discord.
          </p>
        </div>
        <span
          className="flex items-center gap-2 self-start rounded-full border border-hairline bg-muted px-3 py-1.5 text-xs font-semibold"
          style={{ color: isRunning ? '#00ff88' : 'var(--muted-foreground)' }}
        >
          <span
            className={`h-2 w-2 rounded-full ${isRunning ? 'animate-pulse bg-primary' : 'bg-text-faint'}`}
          />
          {PHASE_LABELS[state.phase]}
        </span>
      </header>

      {/* Avertissement : disponible uniquement dans l'app de bureau */}
      {!available && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <Monitor className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <div>
            <p className="text-sm font-semibold text-amber-300">
              Voice Swap fonctionne dans l&apos;application de bureau ChapCam PC
            </p>
            <p className="mt-1 text-xs text-amber-200/80 text-pretty">
              Le streaming audio temps reel (micro -&gt; ElevenLabs -&gt; micro virtuel VB-Cable)
              necessite l&apos;app de bureau. Cette page reste consultable, mais l&apos;activation
              est desactivee ici.
            </p>
          </div>
        </div>
      )}

      {/* Pipeline temps reel */}
      <section className="mb-5 rounded-2xl border border-hairline bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-faint">
          Pipeline temps reel
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {PIPELINE.map((step, i) => (
            <div key={step.label} className="flex items-center gap-2">
              <div
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
                  isRunning ? 'border-primary/40 bg-primary/10' : 'border-hairline bg-muted'
                }`}
              >
                <step.icon
                  className="h-4 w-4"
                  style={{ color: isRunning ? '#00ff88' : 'var(--muted-foreground)' }}
                />
                <span className="text-xs font-medium text-foreground">{step.label}</span>
              </div>
              {i < PIPELINE.length - 1 && <ArrowRight className="h-4 w-4 text-text-faint" />}
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-hairline pt-4">
          <span className="text-xs text-text-faint">Sortie vers :</span>
          {TARGETS.map((t) => (
            <span
              key={t.label}
              className="flex items-center gap-1.5 rounded-full border border-hairline bg-muted px-2.5 py-1 text-xs text-muted-foreground"
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </span>
          ))}
        </div>
      </section>

      {/* Monitoring : latence / sante connexion / buffer */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Latence */}
        <div className="rounded-2xl border border-hairline bg-card p-5">
          <div className="mb-3 flex items-center gap-2 text-text-faint">
            <Gauge className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Latence</span>
          </div>
          <p className="text-3xl font-bold text-foreground">
            {state.latency.endToEndMs}
            <span className="ml-1 text-base font-medium text-text-faint">ms</span>
          </p>
          <p className="mt-1 text-xs text-text-faint">bout-en-bout estimee</p>
          <div className="mt-3 flex flex-col gap-1 text-[11px] text-muted-foreground">
            <span>Reseau : {state.latency.networkRttMs} ms</span>
            <span>Lecture : {state.latency.playbackMs} ms</span>
          </div>
        </div>

        {/* Sante connexion */}
        <div className="rounded-2xl border border-hairline bg-card p-5">
          <div className="mb-3 flex items-center gap-2 text-text-faint">
            {state.health.connected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            <span className="text-xs font-semibold uppercase tracking-wide">Connexion</span>
          </div>
          <p
            className="text-2xl font-bold"
            style={{ color: QUALITY_COLORS[state.health.quality] }}
          >
            {QUALITY_LABELS[state.health.quality]}
          </p>
          <p className="mt-1 text-xs text-text-faint">
            {state.health.connected ? 'Flux ouvert' : 'Non connecte'}
          </p>
          <div className="mt-3 flex flex-col gap-1 text-[11px] text-muted-foreground">
            <span>Reconnexions : {state.health.reconnectAttempts}</span>
            <span>Chunks perdus : {state.health.droppedChunks}</span>
          </div>
        </div>

        {/* Buffer */}
        <div className="rounded-2xl border border-hairline bg-card p-5">
          <div className="mb-3 flex items-center gap-2 text-text-faint">
            <Layers className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Buffer</span>
          </div>
          <p className="text-3xl font-bold text-foreground">
            {state.buffer.bufferedMs}
            <span className="ml-1 text-base font-medium text-text-faint">ms</span>
          </p>
          <p className="mt-1 text-xs text-text-faint">{state.buffer.bufferedChunks} chunks en file</p>
          <div className="mt-3 flex flex-col gap-1 text-[11px] text-muted-foreground">
            <span>Underruns : {state.buffer.underruns}</span>
            <span>Overruns : {state.buffer.overruns}</span>
          </div>
        </div>
      </div>

      {/* Micro virtuel */}
      <div
        className={`mb-5 flex items-center gap-3 rounded-2xl border p-4 ${
          state.virtualMicAvailable
            ? 'border-primary/30 bg-primary/5'
            : 'border-hairline bg-muted'
        }`}
      >
        <Radio
          className="h-5 w-5 shrink-0"
          style={{ color: state.virtualMicAvailable ? '#00ff88' : 'var(--text-faint)' }}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Micro virtuel VB-Cable</p>
          <p className="text-xs text-text-faint">
            {state.virtualMicAvailable
              ? 'Detecte — selectionnez « CABLE Output » comme micro dans WhatsApp / Telegram / Discord.'
              : 'Non detecte — installez VB-Cable pour router la voix convertie.'}
          </p>
        </div>
        {state.virtualMicAvailable && <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />}
      </div>

      {/* Selection voix + peripheriques */}
      <section className="mb-5 rounded-2xl border border-hairline bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Configuration</h2>

        {/* Voix actuellement selectionnee : nom + voice_id visibles */}
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <AudioLines className="h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-text-faint">
                Voix selectionnee
              </p>
              {selectedVoiceProfile ? (
                <>
                  <p className="truncate text-sm font-semibold text-foreground">
                    {selectedVoiceProfile.name}
                  </p>
                  <p className="truncate font-mono text-xs text-primary">
                    {selectedVoiceProfile.id}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Aucune voix selectionnee</p>
              )}
            </div>
          </div>
          {selectedVoiceProfile && (
            <button
              type="button"
              onClick={copyVoiceId}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-hairline bg-muted px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              title="Copier le voice_id"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copie' : 'Copier ID'}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-faint">
              Voix cible ElevenLabs
              <span className="ml-2 font-normal text-text-faint/70">
                {voices.length} voix disponibles
              </span>
            </span>
            <div className="relative">
              <button
                type="button"
                onClick={() => setVoiceMenuOpen((o) => !o)}
                disabled={!available || isRunning || voices.length === 0}
                aria-haspopup="listbox"
                aria-expanded={voiceMenuOpen}
                className="flex w-full items-center justify-between gap-2 rounded-xl border border-hairline bg-muted px-3 py-2.5 text-left text-sm text-foreground outline-none transition-colors focus:border-primary disabled:opacity-50"
              >
                {selectedVoiceProfile ? (
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium text-foreground">
                      {selectedVoiceProfile.name}
                    </span>
                    <span className="truncate font-mono text-[11px] text-text-faint">
                      {selectedVoiceProfile.id}
                    </span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    {voices.length ? 'Choisir une voix...' : 'Aucune voix disponible'}
                  </span>
                )}
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-text-faint transition-transform ${voiceMenuOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {voiceMenuOpen && voices.length > 0 && (
                <ul
                  role="listbox"
                  className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-hairline bg-card p-1 shadow-xl"
                >
                  {voices.map((v) => {
                    const active = v.id === selectedVoice
                    return (
                      <li key={v.id} role="option" aria-selected={active}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedVoice(v.id)
                            setVoiceMenuOpen(false)
                          }}
                          className={`flex w-full items-start justify-between gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted ${active ? 'bg-primary/10' : ''}`}
                        >
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate text-sm font-medium text-foreground">
                              {v.name}
                              {v.locale ? (
                                <span className="ml-2 text-[10px] uppercase text-text-faint">
                                  {v.locale}
                                </span>
                              ) : null}
                            </span>
                            <span className="truncate font-mono text-[11px] text-text-faint">
                              {v.id}
                            </span>
                            {v.description ? (
                              <span className="truncate text-[11px] text-muted-foreground">
                                {v.description}
                              </span>
                            ) : null}
                          </span>
                          {active && <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-faint">Micro d&apos;entree</span>
            <select
              value={inputDeviceId}
              onChange={(e) => setInputDeviceId(e.target.value)}
              disabled={!available || isRunning}
              className="rounded-xl border border-hairline bg-muted px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary disabled:opacity-50"
            >
              <option value="">Peripherique par defaut</option>
              {inputs.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-xs font-medium text-text-faint">Sortie (micro virtuel)</span>
            <select
              value={outputDeviceId}
              onChange={(e) => setOutputDeviceId(e.target.value)}
              disabled={!available || isRunning}
              className="rounded-xl border border-hairline bg-muted px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary disabled:opacity-50"
            >
              <option value="">Peripherique par defaut</option>
              {outputs.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label}
                  {d.isVirtual ? ' (virtuel)' : ''}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {/* Erreur runtime */}
      {state.error && (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {state.error}
        </div>
      )}

      {/* Bouton activation */}
      <button
        onClick={handleToggle}
        disabled={!available || busy || isTransitioning || (!isRunning && !selectedVoice)}
        className="mb-5 flex w-full flex-col items-center justify-center rounded-2xl bg-gradient-to-r from-[#7c3aed] via-[#8b5cf6] to-[#a855f7] py-5 text-center transition-all duration-300 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        style={{ boxShadow: '0 8px 30px rgba(124,58,237,0.4)' }}
      >
        <span className="flex items-center gap-2 text-lg font-bold text-white">
          {busy || isTransitioning ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : isRunning ? (
            <Power className="h-5 w-5" />
          ) : (
            <Mic className="h-5 w-5" />
          )}
          {isRunning ? 'Arreter Voice Swap' : 'Demarrer Voice Swap'}
        </span>
        <span className="mt-0.5 text-sm text-white/70">
          {isRunning
            ? 'Conversion temps reel en cours'
            : 'Streaming temps reel vers le micro virtuel'}
        </span>
      </button>

      {/* Offres ChapVoice : recharge des minutes via PayDunya */}
      <VoiceOffersSection />

      {/* Details techniques (architecture) */}
      <section className="rounded-2xl border border-hairline bg-card">
        <button
          onClick={() => setAdvancedOpen((o) => !o)}
          className="flex w-full items-center justify-between px-6 py-4 text-left"
          aria-expanded={advancedOpen}
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Activity className="h-4 w-4 text-muted-foreground" />
            Details techniques du flux
          </span>
          <ChevronDown
            className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${advancedOpen ? 'rotate-180' : ''}`}
          />
        </button>
        {advancedOpen && (
          <div className="grid grid-cols-2 gap-4 border-t border-hairline px-6 py-5 text-sm sm:grid-cols-4">
            <div>
              <p className="text-xs text-text-faint">Format</p>
              <p className="font-semibold text-foreground">
                {DEFAULT_AUDIO_FORMAT.sampleRate / 1000} kHz mono
              </p>
            </div>
            <div>
              <p className="text-xs text-text-faint">Encodage</p>
              <p className="font-semibold text-foreground">PCM 16-bit</p>
            </div>
            <div>
              <p className="text-xs text-text-faint">Taille de chunk</p>
              <p className="font-semibold text-foreground">{DEFAULT_CHUNKING.chunkDurationMs} ms</p>
            </div>
            <div>
              <p className="text-xs text-text-faint">Jitter buffer</p>
              <p className="font-semibold text-foreground">{DEFAULT_CHUNKING.targetJitterBufferMs} ms</p>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
