'use client'

import { useEffect, useState } from 'react'
import { Check, Crown, Clock, Sparkles, Loader2, CreditCard, Zap, Gift, Video } from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { PLANS, type PlanConfig } from '@/lib/plans'
import { LIVE_OFFERS, LIVE_TRIAL_SECONDS } from '@/lib/live-offers'
import { PaymentConfirmModal } from './payment-confirm-modal'

const LIVE_OFFER = LIVE_OFFERS[0]
const LIVE_OFFER_AS_PLAN = {
  id: LIVE_OFFER.id,
  name: LIVE_OFFER.name,
  price: LIVE_OFFER.price,
} as unknown as PlanConfig

type WaveLinkMap = Record<string, { plan: string; label: string; amount: number; wave_url: string }>

export default function PlansPage() {
  const [waveLinks, setWaveLinks] = useState<WaveLinkMap>({})
  const [loadingLinks, setLoadingLinks] = useState(true)
  const [modalPlan, setModalPlan] = useState<PlanConfig | null>(null)

  useEffect(() => {
    fetch('/api/wave-links')
      .then((r) => r.json())
      .then((d) => {
        const map: WaveLinkMap = {}
        for (const l of d.links ?? []) map[l.plan] = l
        setWaveLinks(map)
      })
      .catch(() => {})
      .finally(() => setLoadingLinks(false))
  }, [])

  return (
    <div className="min-h-screen bg-[#050505] px-6 py-12">
      <div className="mx-auto max-w-7xl">
        {/* Banniere offre */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
          <div className="relative overflow-hidden rounded-2xl border border-[#00ff88]/50 bg-gradient-to-r from-[#00ff88]/20 via-[#00ff88]/10 to-[#00ff88]/20 p-6">
            <div className="relative z-10 text-center">
              <div className="mb-2 flex items-center justify-center gap-2">
                <Sparkles className="h-5 w-5 text-[#00ff88]" />
                <span className="text-lg font-bold text-[#00ff88]">PAIEMENT MOBILE SECURISE</span>
                <Sparkles className="h-5 w-5 text-[#00ff88]" />
              </div>
              <h3 className="mb-2 text-xl font-black text-white md:text-2xl">
                Payez avec <span className="text-[#00ff88]">Wave, Orange, MTN ou Moov</span>
              </h3>
              <p className="text-sm text-gray-300">
                Apres le paiement, confirmez votre transaction pour activer votre abonnement.
              </p>
            </div>
          </div>
        </motion.div>

        <div className="mb-16 text-center">
          <h1 className="mb-4 text-4xl font-bold text-white md:text-5xl text-balance">
            Changez d&apos;apparence en live
          </h1>
          <p className="text-3xl font-medium text-emerald-400">avec ChapCam</p>
          <p className="mt-6 text-lg text-gray-400">
            2 points = 1 seconde de transformation du visage et corps entier
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan, index) => {
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative flex flex-col rounded-3xl border bg-[#111] p-8 transition-all hover:border-[#00ff88] ${
                  plan.popular
                    ? 'scale-[1.03] border-[#00ff88] shadow-2xl shadow-[#00ff88]/20'
                    : 'border-gray-800'
                }`}
              >
                <div className="absolute -right-3 -top-3 rounded-full bg-red-500 px-3 py-1.5 text-xs font-bold text-white shadow-lg">
                  -{plan.discount}%
                </div>

                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-[#00ff88] px-6 py-1 text-sm font-bold text-black">
                    <Crown className="h-4 w-4" />
                    MEILLEUR CHOIX
                  </div>
                )}

                <div className="text-sm font-medium text-emerald-400">{plan.duration}</div>
                <h3 className="mt-2 text-3xl font-bold text-white">{plan.name}</h3>

                <div className="mb-2 mt-8">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xl text-gray-500 line-through">
                      {plan.oldPrice.toLocaleString()}
                    </span>
                    <span className="text-sm font-semibold text-red-400">-{plan.discount}%</span>
                  </div>
                  <span className="text-5xl font-bold text-[#00ff88]">
                    {plan.price.toLocaleString()}
                  </span>
                  <span className="text-2xl text-gray-400"> FCFA</span>
                </div>

                <ul className="mt-8 flex-1 space-y-4 text-gray-300">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <Check className="h-5 w-5 flex-shrink-0 text-emerald-400" />
                      {feature}
                    </li>
                  ))}
                  <li className="flex items-center gap-3">
                    <Check className="h-5 w-5 flex-shrink-0 text-emerald-400" />
                    {plan.points.toLocaleString()} points ({plan.minutes})
                  </li>
                </ul>

                <button
                  onClick={() => setModalPlan(plan)}
                  disabled={loadingLinks}
                  className={`mt-10 flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-semibold transition-all disabled:opacity-60 ${
                    plan.popular
                      ? 'bg-[#00ff88] text-black hover:bg-[#00dd77]'
                      : 'bg-white text-black hover:bg-gray-200'
                  }`}
                >
                  {loadingLinks ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      S&apos;abonner
                      <CreditCard className="h-4 w-4" />
                    </>
                  )}
                </button>
              </motion.div>
            )
          })}
        </div>

        {/* ===================== OFFRE LIVE PRO (separee, encadree en rouge) ===================== */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="mt-12"
        >
          <div className="relative overflow-hidden rounded-3xl border-2 border-red-500 bg-gradient-to-br from-red-500/10 via-[#111] to-[#111] p-6 shadow-[0_0_40px_-10px_rgba(239,68,68,0.5)] md:p-8">
            {/* Badge distinctif */}
            <div className="absolute -right-3 -top-3 flex items-center gap-1 rounded-full bg-red-500 px-3 py-1.5 text-xs font-bold text-white shadow-lg">
              <Zap className="h-3.5 w-3.5" />
              OFFRE SPECIALE
            </div>

            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex-1">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-red-400">
                  <Video className="h-3.5 w-3.5" />
                  Face Swap Temps Reel
                </div>
                <h3 className="text-2xl font-black text-white md:text-3xl">{LIVE_OFFER.name}</h3>
                <p className="mt-2 max-w-xl text-sm text-gray-400">
                  {LIVE_OFFER.description} Cette offre est <span className="font-semibold text-red-400">independante</span> des
                  formules a points : elle ouvre une fenetre d&apos;acces dediee au moteur GPU temps reel.
                </p>

                <ul className="mt-4 grid gap-2 text-sm text-gray-300 sm:grid-cols-2">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 flex-shrink-0 text-red-400" />
                    {LIVE_OFFER.windowMinutes} minutes de swap en direct
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 flex-shrink-0 text-red-400" />
                    Basse latence, jusqu&apos;a 4 personas
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 flex-shrink-0 text-red-400" />
                    Utilisable en appel video (OBS)
                  </li>
                  <li className="flex items-center gap-2">
                    <Gift className="h-4 w-4 flex-shrink-0 text-[#00ff88]" />
                    Essai gratuit de {Math.round(LIVE_TRIAL_SECONDS / 60)} min offert
                  </li>
                </ul>
              </div>

              <div className="flex flex-col items-stretch gap-3 lg:w-64">
                <div className="text-center lg:text-right">
                  <span className="text-4xl font-black text-red-400">
                    {LIVE_OFFER.price.toLocaleString()}
                  </span>
                  <span className="text-xl text-gray-400"> FCFA</span>
                  <p className="text-xs text-gray-500">pour {LIVE_OFFER.windowMinutes} min d&apos;acces</p>
                </div>
                <Link
                  href="/live"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#00ff88]/50 bg-[#00ff88]/10 py-3 font-semibold text-[#00ff88] transition-colors hover:bg-[#00ff88]/20"
                >
                  <Gift className="h-4 w-4" />
                  Essayer gratuitement
                </Link>
                <button
                  onClick={() => setModalPlan(LIVE_OFFER_AS_PLAN)}
                  disabled={loadingLinks}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-500 py-3 font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-60"
                >
                  {loadingLinks ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      Acheter {LIVE_OFFER.windowMinutes} min
                      <CreditCard className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center"
        >
          <div className="inline-flex flex-col items-center gap-3 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-6 py-4 sm:flex-row">
            <Clock className="h-5 w-5 flex-shrink-0 text-yellow-400" />
            <p className="font-semibold text-yellow-400">
              Votre abonnement est active manuellement apres verification du paiement.
            </p>
          </div>
          <div className="mt-6">
            <Link
              href="/dashboard/mes-demandes"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-700 bg-[#111] px-5 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:border-[#00ff88] hover:text-white"
            >
              Suivre l&apos;etat de mes demandes
            </Link>
          </div>
        </motion.div>
      </div>

      {modalPlan && (
        <PaymentConfirmModal
          plan={modalPlan}
          waveUrl={waveLinks[modalPlan.id]?.wave_url}
          onClose={() => setModalPlan(null)}
        />
      )}
    </div>
  )
}
