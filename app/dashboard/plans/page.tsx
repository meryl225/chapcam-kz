'use client'

import { useEffect, useRef, Suspense } from 'react'
import { Check, Crown, Clock, Sparkles, Loader2, CreditCard, Droplet, DropletOff, Monitor, Palette } from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { PLANS, getPlan } from '@/lib/plans'
import { ChapCamPcPromo } from '@/components/chapcam-pc-promo'
import { usePaymentCheckout } from '@/components/payment/use-payment-checkout'
import { PaymentBadgePopup } from '@/components/payment-badge-popup'

function PlansContent() {
  const searchParams = useSearchParams()
  // Paiement partage : ouvre le choix de methode (PayDunya / Crypto) puis redirige.
  const { startCheckout, pendingKey, error, modal } = usePaymentCheckout()
  // evite de relancer le checkout auto plusieurs fois (ex: arrivee depuis l'accueil)
  const autoStarted = useRef(false)

  // Si l'utilisateur arrive depuis la page d'accueil avec ?plan=ID, on ouvre
  // automatiquement le choix de paiement pour ce produit (formule ou Live Pro).
  useEffect(() => {
    if (autoStarted.current) return
    const requested = searchParams.get('plan')
    if (!requested) return
    if (getPlan(requested)) {
      autoStarted.current = true
      startCheckout(requested)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  return (
    <div className="min-h-screen bg-background px-6 py-12">
      {modal}
      {/* Badges paiements & cryptos (popup a gauche, alternance aleatoire) */}
      <PaymentBadgePopup />
      <div className="mx-auto max-w-7xl">
        {/* Banniere offre */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
          <div className="relative overflow-hidden rounded-2xl border border-primary/50 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 p-6">
            <div className="relative z-10 text-center">
              <div className="mb-2 flex items-center justify-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <span className="text-lg font-bold text-primary">PAIEMENT EN LIGNE SECURISE</span>
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-black text-foreground md:text-2xl">
                Payez par <span className="text-primary">Carte bancaire, Wave, Orange, MTN, Moov ou Djamo</span> via PayDunya
                {" "}ou en <span className="text-[#f7931a]">Cryptomonnaie</span> via Trybit
              </h3>
              <p className="text-sm text-muted-foreground">
                Activation automatique de votre compte des que le paiement est confirme.
              </p>
              {/* Logos crypto acceptes (Bitcoin, Ethereum, USDT, TON, BNB) */}
              <div className="mt-4 flex items-center justify-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg">
                  <Image src="/images/bitcoin-logo.png" alt="Bitcoin" width={32} height={32} className="max-h-full max-w-full object-contain" />
                </span>
                <span className="flex h-8 items-center justify-center overflow-hidden rounded-lg">
                  <Image src="/images/crypto-accepted-logos.png" alt="Cryptomonnaies acceptees : Bitcoin, Ethereum, USDT, TON, BNB" width={120} height={32} className="max-h-full object-contain" />
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="mb-16 text-center">
          <h1 className="mb-4 text-4xl font-bold text-foreground md:text-5xl text-balance">
            Changez d&apos;apparence en live
          </h1>
          <p className="text-3xl font-medium text-emerald-400">avec ChapCam</p>
          <p className="mt-6 text-lg text-muted-foreground">
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

        {/* Offre ChapCam PC (logiciel a vie) - mise en avant au-dessus des offres a credit */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <ChapCamPcPromo />
        </motion.div>

        {/* Annonce ChapCam 2.0 : les recharges concernent le nouveau logiciel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 p-6 md:p-8"
        >
          <div className="flex flex-col items-center gap-4 text-center md:flex-row md:items-center md:gap-6 md:text-left">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-black">
              <Sparkles className="h-7 w-7" />
            </div>
            <div className="flex-1">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-400">
                Nouveau · Sorti le 17 juillet
              </div>
              <h3 className="text-xl font-bold text-foreground md:text-2xl">
                Ces recharges alimentent ChapCam 2.0
              </h3>
              <p className="mt-2 text-pretty leading-relaxed text-muted-foreground">
                Toutes les offres ci-dessous sont destinees a notre nouveau logiciel{' '}
                <span className="font-semibold text-emerald-400">ChapCam 2.0</span>, qui fonctionne
                desormais avec <span className="font-semibold text-foreground">tout type de PC</span> et
                permet meme de{' '}
                <span className="font-semibold text-foreground">changer la couleur de peau</span>.
              </p>
            </div>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground md:min-w-[220px]">
              <span className="inline-flex items-center gap-2">
                <Monitor className="h-4 w-4 flex-shrink-0 text-emerald-400" />
                Compatible avec tout type de PC
              </span>
              <span className="inline-flex items-center gap-2">
                <Palette className="h-4 w-4 flex-shrink-0 text-emerald-400" />
                Changement de la couleur de peau
              </span>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan, index) => {
            const loading = pendingKey === plan.id
            // Couleur d'accent des forfaits mis en avant (sans logo)
            const accent =
              plan.id === 'vipdebout' ? '#2563eb' : plan.id === 'ultimate' ? '#f97316' : '#22c55e'
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                style={
                  plan.highlight
                    ? { borderColor: accent, boxShadow: `0 0 60px ${accent}55` }
                    : undefined
                }
                className={`relative flex flex-col rounded-3xl bg-card p-8 transition-all ${
                  plan.highlight
                    ? 'border-2 lg:scale-105 z-10'
                    : 'border border-gray-800 hover:border-primary'
                }`}
              >
                <div className="absolute -right-3 -top-3 rounded-full bg-red-500 px-3 py-1.5 text-xs font-bold text-white shadow-lg">
                  -{plan.discount}%
                </div>

                {/* Badge du haut : "MEILLEURE OFFRE" pour le VIP PRO, sinon "SANS LOGO" */}
                {plan.bestOffer ? (
                  <div
                    className="absolute -top-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full px-5 py-1 text-sm font-bold text-black shadow-lg"
                    style={{ backgroundColor: accent }}
                  >
                    <Crown className="h-4 w-4" />
                    MEILLEURE OFFRE
                  </div>
                ) : plan.highlight && plan.watermark !== 'with' ? (
                  <div
                    className="absolute -top-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full px-5 py-1 text-sm font-bold text-black"
                    style={{ backgroundColor: accent }}
                  >
                    <DropletOff className="h-4 w-4" />
                    SANS LOGO
                  </div>
                ) : null}

                <div className="text-sm font-medium text-emerald-400">{plan.duration}</div>
                <h3 className="mt-2 text-3xl font-bold text-foreground">{plan.name}</h3>

                <div className="mb-2 mt-8">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xl text-text-faint line-through">
                      {plan.oldPrice.toLocaleString()}
                    </span>
                    <span className="text-sm font-semibold text-red-400">-{plan.discount}%</span>
                  </div>
                  <span
                    className="text-5xl font-bold text-primary"
                    style={plan.id === 'vipdebout' ? { color: accent } : undefined}
                  >
                    {plan.price.toLocaleString()}
                  </span>
                  <span className="text-2xl text-muted-foreground"> FCFA</span>
                </div>

                {/* Statut du logo (watermark) mis en avant */}
                {plan.watermark === 'with' ? (
                  <div className="mt-8 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <Droplet className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-bold text-foreground">Avec logo ChapCam</p>
                      <p className="text-xs text-muted-foreground">Filigrane visible sur le rendu</p>
                    </div>
                  </div>
                ) : (
                  <div
                    className="mt-8 flex items-center gap-3 rounded-2xl px-4 py-3"
                    style={{ backgroundColor: `${accent}1f`, border: `1px solid ${accent}66` }}
                  >
                    <DropletOff className="h-5 w-5 flex-shrink-0" style={{ color: accent }} />
                    <div>
                      <p className="text-sm font-bold" style={{ color: accent }}>
                        {plan.watermark === 'auto' ? 'Sans logo (automatique)' : 'Sans logo (sur demande)'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {plan.watermark === 'auto'
                          ? 'Retrait du logo inclus, active automatiquement'
                          : 'Retrait du logo active par notre equipe'}
                      </p>
                    </div>
                  </div>
                )}

                <ul className="mt-6 flex-1 space-y-4 text-muted-foreground">
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
                  disabled={!!pendingKey}
                  className={`mt-10 flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-semibold transition-all disabled:opacity-60 ${
                    plan.highlight
                      ? 'bg-primary text-black hover:bg-primary/90'
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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center"
        >
          <div className="inline-flex flex-col items-center gap-3 rounded-2xl border border-primary/30 bg-primary/10 px-6 py-4 sm:flex-row">
            <Clock className="h-5 w-5 flex-shrink-0 text-primary" />
            <p className="font-semibold text-primary">
              Activation automatique et immediate apres confirmation du paiement.
            </p>
          </div>
          <div className="mt-6">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-700 bg-card px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
            >
              Retour au tableau de bord
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
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <PlansContent />
    </Suspense>
  )
}
