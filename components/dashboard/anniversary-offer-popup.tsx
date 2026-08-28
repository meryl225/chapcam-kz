'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Flame, PartyPopper, Gift, ArrowRight } from 'lucide-react'

// Incremente ce suffixe pour re-afficher le popup a tous les clients.
const SEEN_KEY = 'chapcam-anniversary-3mois-seen'
// Fin de l'offre memorisee par client (fenetre glissante de 7 jours).
const END_KEY = 'chapcam-anniversary-3mois-end'
const OFFER_DURATION_MS = 7 * 24 * 60 * 60 * 1000

// Grille des tarifs anniversaire (montant FCFA -> minutes de swap en direct).
const OFFERS = [
  { price: '5 000', minutes: 5, label: 'Forfait Testeur', highlight: true },
  { price: '10 000', minutes: 10 },
  { price: '20 000', minutes: 20 },
  { price: '50 000', minutes: 50 },
  { price: '100 000', minutes: 100 },
]

function getOrCreateEnd(): number {
  try {
    const stored = localStorage.getItem(END_KEY)
    if (stored) {
      const n = Number(stored)
      if (!Number.isNaN(n) && n > Date.now()) return n
    }
  } catch {
    // ignore
  }
  const end = Date.now() + OFFER_DURATION_MS
  try {
    localStorage.setItem(END_KEY, String(end))
  } catch {
    // ignore
  }
  return end
}

export function AnniversaryOfferPopup() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [endsAt, setEndsAt] = useState<number | null>(null)
  const [remaining, setRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  // Affiche le popup une seule fois par client (jusqu'a fermeture).
  useEffect(() => {
    try {
      const seen = localStorage.getItem(SEEN_KEY)
      if (!seen) {
        const t = setTimeout(() => {
          setEndsAt(getOrCreateEnd())
          setOpen(true)
        }, 700)
        return () => clearTimeout(t)
      }
    } catch {
      setEndsAt(Date.now() + OFFER_DURATION_MS)
      setOpen(true)
    }
  }, [])

  // Compte a rebours (mise a jour chaque seconde).
  useEffect(() => {
    if (!open || endsAt == null) return
    const tick = () => {
      const diff = Math.max(0, endsAt - Date.now())
      setRemaining({
        days: Math.floor(diff / 86_400_000),
        hours: Math.floor((diff % 86_400_000) / 3_600_000),
        minutes: Math.floor((diff % 3_600_000) / 60_000),
        seconds: Math.floor((diff % 60_000) / 1000),
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [open, endsAt])

  const dismiss = () => {
    try {
      localStorage.setItem(SEEN_KEY, '1')
    } catch {
      // ignore
    }
    setOpen(false)
  }

  const goToRecharge = () => {
    dismiss()
    router.push('/dashboard/plans')
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-violet-500/40 bg-[#0a0a14] shadow-[0_0_60px_rgba(139,92,246,0.4)]">
        <button
          onClick={dismiss}
          className="absolute right-4 top-4 z-10 rounded-full bg-white/5 p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Fermer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* En-tete festif */}
        <div className="relative overflow-hidden bg-gradient-to-br from-violet-600/25 via-blue-600/15 to-fuchsia-600/10 px-6 pb-6 pt-9 text-center">
          {/* Halo decoratif */}
          <div className="pointer-events-none absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-violet-500/30 blur-3xl" />

          <span className="relative mb-4 inline-flex items-center gap-2 rounded-full border border-orange-400/40 bg-orange-500/15 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-orange-300">
            <Flame className="h-3.5 w-3.5" />
            Offre anniversaire — 7 jours seulement
          </span>

          <h2 className="relative flex items-center justify-center gap-2 text-balance text-2xl font-black leading-tight text-white sm:text-3xl">
            <PartyPopper className="h-6 w-6 flex-shrink-0 text-fuchsia-400" />
            CHAPCAM FÊTE
          </h2>
          <p className="relative mt-1 text-4xl font-black leading-none sm:text-5xl">
            <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              SES 3 MOIS !
            </span>
          </p>
          <p className="relative mx-auto mt-3 max-w-sm text-pretty text-sm leading-relaxed text-gray-300">
            Pendant 7 jours seulement, profitez de nos tarifs anniversaire sur les minutes de swap
            en direct.
          </p>
        </div>

        {/* Compte a rebours */}
        <div className="px-6 pt-5">
          <div className="rounded-2xl border border-violet-500/30 bg-violet-500/5 px-4 py-4">
            <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-400">
              Fin de l&apos;offre dans :
            </p>
            <div className="flex items-center justify-center gap-3">
              {[
                { v: remaining.days, u: 'j' },
                { v: remaining.hours, u: 'h' },
                { v: remaining.minutes, u: 'min' },
                { v: remaining.seconds, u: 's' },
              ].map((seg, i) => (
                <div key={i} className="flex items-baseline gap-1">
                  <span className="text-3xl font-black tabular-nums text-white sm:text-4xl">
                    {String(seg.v).padStart(2, '0')}
                  </span>
                  <span className="text-sm font-semibold text-violet-300">{seg.u}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Grille des tarifs anniversaire (montant FCFA -> minutes) */}
        <div className="space-y-2.5 px-6 pt-5">
          {OFFERS.map((offer) => (
            <div
              key={offer.price}
              className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${
                offer.highlight
                  ? 'border-emerald-500/50 bg-emerald-500/10'
                  : 'border-white/10 bg-white/[0.03]'
              }`}
            >
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span
                  className={`text-lg font-black ${offer.highlight ? 'text-emerald-400' : 'text-white'}`}
                >
                  {offer.price}
                </span>
                <span className="text-sm text-gray-400">FCFA</span>
                {offer.label && (
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300">
                    {offer.label}
                  </span>
                )}
              </div>
              <span className="flex-shrink-0 text-sm font-bold text-violet-300">
                {offer.minutes} minutes
              </span>
            </div>
          ))}
        </div>

        {/* Mention */}
        <p className="flex items-center justify-center gap-1.5 px-6 pt-4 text-center text-xs text-gray-400">
          <Gift className="h-3.5 w-3.5 text-fuchsia-400" />
          Après les 7 jours, retour aux tarifs habituels.
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-2 px-6 pb-6 pt-4">
          <button
            onClick={goToRecharge}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 via-violet-500 to-fuchsia-500 py-3.5 font-bold text-white shadow-[0_8px_24px_-8px_rgba(139,92,246,0.7)] transition-transform hover:-translate-y-0.5"
          >
            J&apos;en profite maintenant
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            onClick={dismiss}
            className="w-full rounded-2xl py-2.5 text-sm text-gray-400 transition-colors hover:text-white"
          >
            Plus tard
          </button>
        </div>
      </div>
    </div>
  )
}
