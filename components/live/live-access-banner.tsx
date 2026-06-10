'use client'

import { Clock, Gift, Lock, Zap, CreditCard } from 'lucide-react'
import type { LiveMode } from '@/hooks/use-live-face-swap'

interface Props {
  mode: LiveMode | null
  secondsRemaining: number
  trialSecondsRemaining: number
  pendingWindows: number
  offerName: string
  offerPrice: number
  onBuy: () => void
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function LiveAccessBanner({
  mode,
  secondsRemaining,
  trialSecondsRemaining,
  pendingWindows,
  offerName,
  offerPrice,
  onBuy,
}: Props) {
  // Acces paye en cours
  if (mode === 'paid') {
    return (
      <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-primary/40 bg-primary/10 p-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20">
            <Zap className="h-5 w-5 text-primary" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Acces Live Pro actif</p>
            <p className="text-xs text-muted-foreground">Fenetre de 15 minutes en cours</p>
          </div>
        </div>
        <span className="flex items-center gap-2 rounded-xl bg-black/40 px-4 py-2 font-mono text-lg font-bold text-primary">
          <Clock className="h-4 w-4" />
          {fmt(secondsRemaining)}
        </span>
      </div>
    )
  }

  // Fenetre payee disponible (pas encore demarree)
  if (mode === 'ready') {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-primary/40 bg-primary/10 p-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20">
          <Zap className="h-5 w-5 text-primary" />
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">
            {pendingWindows} fenetre{pendingWindows > 1 ? 's' : ''} de 15 min disponible
            {pendingWindows > 1 ? 's' : ''}
          </p>
          <p className="text-xs text-muted-foreground">
            Le compte a rebours demarre des que tu lances le swap.
          </p>
        </div>
      </div>
    )
  }

  // Essai gratuit disponible
  if (mode === 'trial') {
    return (
      <div className="rounded-2xl border border-primary/40 bg-gradient-to-r from-primary/15 to-primary/5 p-5">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20">
              <Gift className="h-6 w-6 text-primary" />
            </span>
            <div>
              <p className="flex items-center gap-2 text-base font-bold text-foreground">
                Essaye gratuitement
                <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-black">
                  2 MIN OFFERTES
                </span>
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5 text-primary" />
                Il te reste <span className="font-mono font-semibold text-primary">{fmt(trialSecondsRemaining)}</span> d&apos;essai gratuit. Lance le swap pour commencer !
              </p>
            </div>
          </div>
          <button
            onClick={onBuy}
            className="flex items-center gap-2 rounded-xl border border-white/15 bg-black/30 px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-black/50"
          >
            <CreditCard className="h-4 w-4 text-primary" />
            Passer a 15 min — {offerPrice.toLocaleString()} FCFA
          </button>
        </div>
      </div>
    )
  }

  // Plus aucun acces : la periode d'essai gratuit est terminee, il faut acheter.
  return (
    <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 sm:flex-row sm:items-center">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/20">
          <Lock className="h-5 w-5 text-red-400" />
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">Periode d&apos;essai terminee</p>
          <p className="text-xs text-muted-foreground">
            La periode d&apos;essai gratuit de 2 minutes a pris fin il y a quelques jours.
            Achete {offerName} pour continuer a utiliser le Live Pro.
          </p>
        </div>
      </div>
      <button
        onClick={onBuy}
        className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-primary/90"
      >
        <CreditCard className="h-4 w-4" />
        Acheter — {offerPrice.toLocaleString()} FCFA
      </button>
    </div>
  )
}
