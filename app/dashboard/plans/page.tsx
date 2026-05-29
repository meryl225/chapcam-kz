'use client'

import { useEffect, useState } from 'react'
import { Check, Crown, Clock, Sparkles, ExternalLink, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { PLANS, type PlanConfig } from '@/lib/plans'
import { PaymentConfirmModal } from './payment-confirm-modal'

type WaveLinkMap = Record<string, { plan: string; label: string; amount: number; wave_url: string }>

export default function PlansPage() {
  const [waveLinks, setWaveLinks] = useState<WaveLinkMap>({})
  const [loadingLinks, setLoadingLinks] = useState(true)
  // plan dont le lien Wave a ete ouvert -> affiche "J'ai effectue mon paiement"
  const [openedPlan, setOpenedPlan] = useState<string | null>(null)
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

  const handleSubscribe = (plan: PlanConfig) => {
    const link = waveLinks[plan.id]?.wave_url
    if (link) {
      window.open(link, '_blank', 'noopener,noreferrer')
      setOpenedPlan(plan.id)
    } else {
      // Pas de lien configure : on ouvre directement le formulaire de confirmation
      setOpenedPlan(plan.id)
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] px-6 py-12">
      <div className="mx-auto max-w-7xl">
        {/* Banniere offre */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
          <div className="relative overflow-hidden rounded-2xl border border-[#00ff88]/50 bg-gradient-to-r from-[#00ff88]/20 via-[#00ff88]/10 to-[#00ff88]/20 p-6">
            <div className="relative z-10 text-center">
              <div className="mb-2 flex items-center justify-center gap-2">
                <Sparkles className="h-5 w-5 text-[#00ff88]" />
                <span className="text-lg font-bold text-[#00ff88]">PAIEMENT SECURISE VIA WAVE</span>
                <Sparkles className="h-5 w-5 text-[#00ff88]" />
              </div>
              <h3 className="mb-2 text-xl font-black text-white md:text-2xl">
                Choisissez votre formule, payez avec <span className="text-[#00ff88]">Wave</span>
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
            const opened = openedPlan === plan.id
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

                {opened ? (
                  <button
                    onClick={() => setModalPlan(plan)}
                    className="mt-10 w-full rounded-2xl bg-[#00ff88] py-4 font-semibold text-black transition-all hover:bg-[#00dd77]"
                  >
                    J&apos;ai effectue mon paiement
                  </button>
                ) : (
                  <button
                    onClick={() => handleSubscribe(plan)}
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
                        <ExternalLink className="h-4 w-4" />
                      </>
                    )}
                  </button>
                )}

                {opened && (
                  <button
                    onClick={() => handleSubscribe(plan)}
                    className="mt-3 text-center text-xs text-gray-500 underline transition-colors hover:text-[#00ff88]"
                  >
                    Rouvrir le lien de paiement Wave
                  </button>
                )}
              </motion.div>
            )
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center"
        >
          <div className="inline-flex items-center gap-3 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-6 py-3">
            <Clock className="h-5 w-5 text-yellow-400" />
            <p className="font-semibold text-yellow-400">
              Votre abonnement est active manuellement apres verification du paiement.
            </p>
          </div>
        </motion.div>
      </div>

      {modalPlan && <PaymentConfirmModal plan={modalPlan} onClose={() => setModalPlan(null)} />}
    </div>
  )
}
