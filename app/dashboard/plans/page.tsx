'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { Check, Crown, Clock, Sparkles, Loader2, CreditCard, Zap, Gift, Video } from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { PLANS, getPlan } from '@/lib/plans'
import { LIVE_OFFERS, LIVE_TRIAL_SECONDS, getLiveOffer } from '@/lib/live-offers'

const LIVE_OFFER = LIVE_OFFERS[0]

function PlansContent() {
  const searchParams = useSearchParams()
  // id du produit en cours de redirection vers PayDunya (pour le loader par bouton)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // evite de relancer le checkout auto plusieurs fois (ex: arrivee depuis l'accueil)
  const autoStarted = useRef(false)

  const startCheckout = async (productId: string) => {
    setError(null)
    setPendingId(productId)
    try {
      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      })
      const data = await res.json()
      if (res.ok && data.success && data.invoice_url) {
        // Redirection vers la page de paiement securisee PayDunya.
        window.location.href = data.invoice_url
        return
      }
      setError(data.error || 'Impossible de demarrer le paiement. Reessayez.')
    } catch {
      setError('Erreur de connexion. Reessayez.')
    } finally {
      setPendingId(null)
    }
  }

  // Si l'utilisateur arrive depuis la page d'accueil avec ?plan=ID, on lance
  // automatiquement le paiement PayDunya pour ce produit (formule ou Live Pro).
  useEffect(() => {
    if (autoStarted.current) return
    const requested = searchParams.get('plan')
    if (!requested) return
    if (getPlan(requested) || getLiveOffer(requested)) {
      autoStarted.current = true
      startCheckout(requested)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  return (
    <div className="min-h-screen bg-[#050505] px-6 py-12">
      <div className="mx-auto max-w-7xl">
        {/* Banniere offre */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
          <div className="relative overflow-hidden rounded-2xl border border-[#00ff88]/50 bg-gradient-to-r from-[#00ff88]/20 via-[#00ff88]/10 to-[#00ff88]/20 p-6">
            <div className="relative z-10 text-center">
              <div className="mb-2 flex items-center justify-center gap-2">
                <Sparkles className="h-5 w-5 text-[#00ff88]" />
                <span className="text-lg font-bold text-[#00ff88]">PAIEMENT EN LIGNE SECURISE</span>
                <Sparkles className="h-5 w-5 text-[#00ff88]" />
              </div>
              <h3 className="mb-2 text-xl font-black text-white md:text-2xl">
                Payez par <span className="text-[#00ff88]">Carte bancaire, Wave, Orange, MTN, Moov ou Djamo</span> via PayDunya
              </h3>
              <p className="text-sm text-gray-300">
                Activation automatique de votre compte des que le paiement est confirme.
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

        <div className="mx-auto mb-8 max-w-2xl rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-center">
          <p className="text-sm font-semibold text-emerald-300">
            Paiement 100% securise et instantane. Apres avoir paye, patientez quelques secondes sur
            la page PayDunya : votre compte est credite automatiquement des la confirmation.
          </p>
        </div>

        {error && (
          <div className="mx-auto mb-8 max-w-xl rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan, index) => {
            const loading = pendingId === plan.id
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
                  onClick={() => startCheckout(plan.id)}
                  disabled={!!pendingId}
                  className={`mt-10 flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-semibold transition-all disabled:opacity-60 ${
                    plan.popular
                      ? 'bg-[#00ff88] text-black hover:bg-[#00dd77]'
                      : 'bg-white text-black hover:bg-gray-200'
                  }`}
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      Recharger
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
                  onClick={() => startCheckout(LIVE_OFFER.id)}
                  disabled={!!pendingId}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-500 py-3 font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-60"
                >
                  {pendingId === LIVE_OFFER.id ? (
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
          <div className="inline-flex flex-col items-center gap-3 rounded-2xl border border-[#00ff88]/30 bg-[#00ff88]/10 px-6 py-4 sm:flex-row">
            <Clock className="h-5 w-5 flex-shrink-0 text-[#00ff88]" />
            <p className="font-semibold text-[#00ff88]">
              Activation automatique et immediate apres confirmation du paiement.
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
    </div>
  )
}

export default function PlansPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#050505]">
          <Loader2 className="h-8 w-8 animate-spin text-[#00ff88]" />
        </div>
      }
    >
      <PlansContent />
    </Suspense>
  )
}
