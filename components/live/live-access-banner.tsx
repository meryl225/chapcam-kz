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
      <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-[#00ff88]/40 bg-[#00ff88]/10 p-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00ff88]/20">
            <Zap className="h-5 w-5 text-[#00ff88]" />
          </span>
          <div>
            <p className="text-sm font-semibold text-white">Acces Live Pro actif</p>
            <p className="text-xs text-gray-400">Fenetre de 15 minutes en cours</p>
          </div>
        </div>
        <span className="flex items-center gap-2 rounded-xl bg-black/40 px-4 py-2 font-mono text-lg font-bold text-[#00ff88]">
          <Clock className="h-4 w-4" />
          {fmt(secondsRemaining)}
        </span>
      </div>
    )
  }

  // Fenetre payee disponible (pas encore demarree)
  if (mode === 'ready') {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-[#00ff88]/40 bg-[#00ff88]/10 p-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00ff88]/20">
          <Zap className="h-5 w-5 text-[#00ff88]" />
        </span>
        <div>
          <p className="text-sm font-semibold text-white">
            {pendingWindows} fenetre{pendingWindows > 1 ? 's' : ''} de 15 min disponible
            {pendingWindows > 1 ? 's' : ''}
          </p>
          <p className="text-xs text-gray-400">
            Le compte a rebours demarre des que tu lances le swap.
          </p>
        </div>
      </div>
    )
  }

  // Essai gratuit disponible
  if (mode === 'trial') {
    return (
      <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/20">
            <Gift className="h-5 w-5 text-yellow-400" />
          </span>
          <div>
            <p className="text-sm font-semibold text-white">Essai gratuit</p>
            <p className="text-xs text-gray-400">
              Il te reste {fmt(trialSecondsRemaining)} d&apos;essai. Achete {offerName} pour 15 min sans coupure.
            </p>
          </div>
        </div>
        <button
          onClick={onBuy}
          className="flex items-center gap-2 rounded-xl bg-[#00ff88] px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[#00dd77]"
        >
          <CreditCard className="h-4 w-4" />
          {offerPrice.toLocaleString()} FCFA
        </button>
      </div>
    )
  }

  // Plus aucun acces : doit acheter
  return (
    <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 sm:flex-row sm:items-center">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/20">
          <Lock className="h-5 w-5 text-red-400" />
        </span>
        <div>
          <p className="text-sm font-semibold text-white">Acces epuise</p>
          <p className="text-xs text-gray-400">
            Ton essai gratuit est termine. Achete {offerName} pour continuer.
          </p>
        </div>
      </div>
      <button
        onClick={onBuy}
        className="flex items-center gap-2 rounded-xl bg-[#00ff88] px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[#00dd77]"
      >
        <CreditCard className="h-4 w-4" />
        Acheter — {offerPrice.toLocaleString()} FCFA
      </button>
    </div>
  )
}
