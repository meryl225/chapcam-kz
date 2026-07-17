'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { Check, Crown, Clock, Sparkles, Loader2, CreditCard, Droplet, DropletOff } from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { PLANS, getPlan } from '@/lib/plans'
import { ChapCamPcPromo } from '@/components/chapcam-pc-promo'
import { isInAppBrowser } from '@/lib/in-app-browser'
import { InAppBrowserNotice } from '@/components/in-app-browser-notice'

function PlansContent() {
  const searchParams = useSearchParams()
  // id du produit en cours de redirection vers PayDunya (pour le loader par bouton)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // URL PayDunya a ouvrir manuellement quand on est dans un navigateur integre
  const [inAppUrl, setInAppUrl] = useState<string | null>(null)
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
        // Dans un navigateur integre (TikTok, Instagram...), la page PayDunya
        // ne se charge pas : on invite a ouvrir le lien dans le vrai navigateur.
        if (isInAppBrowser()) {
          setInAppUrl(data.invoice_url)
          return
        }
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
    if (getPlan(requested)) {
      autoStarted.current = true
      startCheckout(requested)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  return (
    <div className="min-h-screen bg-background px-6 py-12">
      {inAppUrl && <InAppBrowserNotice url={inAppUrl} onClose={() => setInAppUrl(null)} />}
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
              </h3>
              <p className="text-sm text-muted-foreground">
                Activation automatique de votre compte des que le paiement est confirme.
              </p>
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

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan, index) => {
            const loading = pendingId === plan.id
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
                  disabled={!!pendingId}
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
