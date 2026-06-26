'use client'

import { useMemo, useState } from 'react'
import {
  AudioLines,
  Mic,
  Power,
  Loader2,
  AlertTriangle,
  ChevronDown,
  Monitor,
  MessageCircle,
  Send,
  Hash,
  Check,
  Copy,
  Clock,
} from 'lucide-react'
import { useVoiceSwap } from '@/hooks/use-voice-swap'
import { useVoiceSubscription } from '@/hooks/use-voice-subscription'
import { VoiceOffersSection } from '@/components/voice-swap/voice-offers-section'
import { SwapConsent, GenerateNotice } from '@/components/dashboard/swap-consent'
import { type VoiceSwapPhase } from '@/lib/voice-swap'

const PHASE_LABELS: Record<VoiceSwapPhase, string> = {
  idle: 'Inactif',
  connecting: 'Connexion...',
  running: 'Conversion active',
  reconnecting: 'Reconnexion...',
  error: 'Erreur',
  stopping: 'Arret...',
}

// Plateformes cibles de sortie (via le micro virtuel VB-Cable).
const TARGETS = [
  { icon: MessageCircle, label: 'WhatsApp' },
  { icon: Send, label: 'Telegram' },
  { icon: Hash, label: 'Discord' },
]

export default function VoiceSwapPage() {
  const { state, available, webMode, devices, voices, start, stop } = useVoiceSwap()
  const voiceSub = useVoiceSubscription()
  const hasMinutes = voiceSub.active && voiceSub.secondsRemaining > 0
  const [selectedVoice, setSelectedVoice] = useState('')
  const [voiceMenuOpen, setVoiceMenuOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  // Certification d'usage responsable, requise avant chaque demarrage.
  const [swapConsent, setSwapConsent] = useState(false)

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
        if (!swapConsent) return
        // Journalisation de l'acceptation de la certification d'usage responsable.
        console.log('[v0] swap-consent accepted', {
          type: 'voice-swap',
          voiceId: selectedVoice,
          acceptedAt: new Date().toISOString(),
        })
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

      {/* Solde de minutes Voice Swap (ChapVoice) */}
      <div
        className={`mb-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-5 ${
          hasMinutes
            ? 'border-primary/30 bg-primary/5'
            : 'border-hairline bg-card'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-xl ${
              hasMinutes ? 'bg-primary/15 text-primary' : 'bg-muted text-text-faint'
            }`}
          >
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-text-faint">
              Minutes de changement de voix
            </p>
            {voiceSub.loading ? (
              <p className="text-sm text-muted-foreground">Chargement...</p>
            ) : hasMinutes ? (
              <p className="text-2xl font-bold text-foreground">
                {voiceSub.minutesRemaining}
                <span className="ml-1 text-sm font-medium text-text-faint">
                  / {voiceSub.minutesTotal} min restantes
                </span>
              </p>
            ) : (
              <p className="text-sm font-semibold text-foreground">
                Aucune minute disponible — recharge une offre ChapVoice ci-dessous
              </p>
            )}
          </div>
        </div>
        {hasMinutes && voiceSub.expiresAt && (
          <span className="rounded-full border border-hairline bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
            Valable jusqu&apos;au{' '}
            {new Date(voiceSub.expiresAt).toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })}
          </span>
        )}
      </div>

      {/* Note mode web : conversion OK, mais routage micro virtuel = app de bureau */}
      {webMode && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <Monitor className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <div>
            <p className="text-sm font-semibold text-amber-300">
              Conversion disponible ici - routage micro virtuel via l&apos;app de bureau
            </p>
            <p className="mt-1 text-xs text-amber-200/80 text-pretty">
              Tu peux convertir ta voix en direct dans le navigateur et l&apos;ecouter sur ta sortie
              audio. Pour l&apos;envoyer comme micro vers WhatsApp, Telegram ou Discord, installe
              VB-Cable et selectionne-le comme sortie (disponible dans l&apos;app de bureau ChapCam PC).
            </p>
          </div>
        </div>
      )}

      {/* Sortie vers les plateformes */}
      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-hairline bg-card px-5 py-4">
        <span className="text-sm font-medium text-muted-foreground">Compatible avec :</span>
        {TARGETS.map((t) => (
          <span
            key={t.label}
            className="flex items-center gap-1.5 rounded-full border border-hairline bg-muted px-3 py-1.5 text-sm text-foreground"
          >
            <t.icon className="h-4 w-4 text-primary" />
            {t.label}
          </span>
        ))}
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
              Voix cible ChapCam
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

      {/* Certification d'usage responsable (avant demarrage) */}
      {!isRunning && (
        <SwapConsent checked={swapConsent} onChange={setSwapConsent} className="mb-3" />
      )}

      {/* Bouton activation */}
      <button
        onClick={handleToggle}
        disabled={!available || busy || isTransitioning || (!isRunning && (!selectedVoice || !hasMinutes || !swapConsent))}
        className="mb-2 flex w-full flex-col items-center justify-center rounded-2xl bg-gradient-to-r from-[#7c3aed] via-[#8b5cf6] to-[#a855f7] py-5 text-center transition-all duration-300 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
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

      {!isRunning && <GenerateNotice className="mb-3 mt-2" />}

      {/* Aide contextuelle quand le demarrage est bloque */}
      {!isRunning && available && !voiceSub.loading && (
        <p className="mb-5 text-center text-xs text-text-faint">
          {!hasMinutes
            ? 'Recharge une offre ChapVoice ci-dessous pour activer le changement de voix.'
            : !selectedVoice
              ? 'Choisis une voix cible ci-dessus pour pouvoir demarrer.'
              : 'Pret a demarrer.'}
        </p>
      )}

      {/* Offres ChapVoice : recharge des minutes via PayDunya */}
      <VoiceOffersSection />
    </div>
  )
}
