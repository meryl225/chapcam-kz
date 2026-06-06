'use client'

import { useEffect, useState } from 'react'
import { X, Cpu, Users, Loader2 } from 'lucide-react'
import type { LiveStatus } from '@/hooks/use-live-face-swap'

interface Props {
  status: LiveStatus
  queuePosition: number
  queueTotal: number
  saturated: boolean
  onClose: () => void
}

// Overlay bloquant facon LiveSync : empeche d'enchainer les demandes pendant
// que le GPU se prepare (anti-surcharge) et fait patienter proprement en file.
// Visible uniquement pendant connecting / preparing / queued.
export function GpuSetupOverlay({ status, queuePosition, queueTotal, saturated, onClose }: Props) {
  const visible = status === 'connecting' || status === 'preparing' || status === 'queued'

  // Chronometre d'attente (affiche depuis combien de temps on patiente)
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!visible) {
      setElapsed(0)
      return
    }
    const t = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [visible])

  if (!visible) return null

  const isQueued = status === 'queued'
  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60
  const elapsedLabel = `${mins}:${secs.toString().padStart(2, '0')}`

  // Titre + sous-texte selon l'etat
  let title = 'Configuration des GPU pour ta session…'
  let subtitle = 'Cela prend habituellement 1 a 3 minutes. Si ca depasse 10 minutes, reessaie.'
  if (isQueued) {
    if (saturated) {
      title = 'Tous les GPU sont occupes'
      subtitle = 'On te garde ta place et on relance automatiquement des qu\u2019un GPU se libere. Ton temps d\u2019essai ne tourne pas.'
    } else if (queuePosition > 0) {
      title = queuePosition === 1 ? 'Tu es le prochain' : `Tu es en position ${queuePosition} dans la file`
      subtitle = 'On te connecte des qu\u2019un GPU se libere. Ton temps d\u2019essai ne tourne pas pendant l\u2019attente.'
    } else {
      title = 'Recherche d\u2019un GPU libre…'
      subtitle = 'On te place automatiquement des qu\u2019un creneau se libere.'
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Preparation du moteur Live"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-primary/20 bg-card p-7 text-center shadow-[0_0_60px_rgba(0,255,136,0.15)]">
        {/* Halo discret en fond */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(ellipse_at_top,rgba(0,255,136,0.18),transparent_70%)]"
        />

        {/* Bouton fermer */}
        <button
          onClick={onClose}
          aria-label="Fermer et annuler"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Icone */}
        <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10">
          {isQueued ? (
            <Users className="h-7 w-7 text-primary" />
          ) : (
            <Cpu className="h-7 w-7 text-primary" />
          )}
        </div>

        {/* Position de file en gros */}
        {isQueued && queuePosition > 0 && (
          <div className="mb-2 text-4xl font-extrabold text-primary">#{queuePosition}</div>
        )}

        <h2 className="text-balance text-lg font-bold text-foreground">{title}</h2>
        <p className="mx-auto mt-2 max-w-xs text-pretty text-sm leading-relaxed text-muted-foreground">
          {subtitle}
        </p>

        {isQueued && queueTotal > 0 && (
          <p className="mt-2 text-xs text-text-faint">{queueTotal} personne(s) en attente</p>
        )}

        {/* Barre de progression indeterminee */}
        <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/3 animate-[gpu-slide_1.4s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-transparent via-primary to-transparent" />
        </div>

        {/* Etat + chrono */}
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-text-faint">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>
            {status === 'connecting'
              ? 'Connexion au moteur'
              : status === 'preparing'
                ? 'Preparation du visage'
                : 'En attente d\u2019un GPU'}
            {' \u00b7 '}
            {elapsedLabel}
          </span>
        </div>

        {/* Bouton fermer en bas (comme LiveSync) */}
        <button
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-muted py-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          Annuler
        </button>
      </div>

      {/* Animation de la barre */}
      <style jsx global>{`
        @keyframes gpu-slide {
          0% {
            transform: translateX(-120%);
          }
          100% {
            transform: translateX(420%);
          }
        }
      `}</style>
    </div>
  )
}
