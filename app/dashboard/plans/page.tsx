'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { Check, Crown, Clock, Sparkles, Loader2, CreditCard, Droplet, DropletOff, Monitor, Palette, Gift, Clapperboard } from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { PLANS, getPlan } from '@/lib/plans'
import { usePaymentCheckout } from '@/components/payment/use-payment-checkout'
import { PaymentBadgePopup } from '@/components/payment-badge-popup'
import { CURRENCIES, useXofRates, formatConverted, formatXof, guessCurrency } from '@/lib/currency-convert'
import { useT } from '@/lib/i18n/language-provider'

function PlansContent() {
  const t = useT()
  const searchParams = useSearchParams()
  // Paiement partage : ouvre le choix de methode (PayDunya / Crypto) puis redirige.
  const { startCheckout, pendingKey, error, modal } = usePaymentCheckout()
  // evite de relancer le checkout auto plusieurs fois (ex: arrivee depuis l'accueil)
  const autoStarted = useRef(false)

  // Convertisseur de devise indicatif (le debit reste en XOF/FCFA).
  const { rates } = useXofRates()
  const [currencyCode, setCurrencyCode] = useState('XOF')
  useEffect(() => {
    setCurrencyCode(guessCurrency())
  }, [])
  const currency = CURRENCIES.find((c) => c.code === currencyCode) ?? CURRENCIES[0]

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
                <span className="text-lg font-bold text-primary">{t('PAIEMENT EN LIGNE SECURISE')}</span>
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-black text-foreground md:text-2xl">
                {t('Payez par')} <span className="text-primary">{t('Carte bancaire, Wave, Orange, MTN, Moov ou Djamo')}</span> {t('via PayDunya')}
                {" "}{t('ou en')} <span className="text-[#f7931a]">{t('Cryptomonnaie')}</span> {t('via NOWPayments')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t('Activation automatique de votre compte des que le paiement est confirme.')}
              </p>
              {/* Logos crypto acceptes (Bitcoin, Ethereum, USDT, TON, BNB) */}
              <div className="mt-4 flex items-center justify-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg">
                  <Image src="/images/bitcoin-logo.png" alt="Bitcoin" width={32} height={32} className="max-h-full max-w-full object-contain" />
                </span>
                <span className="flex h-8 items-center justify-center overflow-hidden rounded-lg">
                  <Image src="/images/crypto-accepted-logos.png" alt={t('Cryptomonnaies acceptees : Bitcoin, Ethereum, USDT, TON, BNB')} width={120} height={32} className="max-h-full object-contain" />
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="mb-16 text-center">
          <h1 className="mb-4 text-4xl font-bold text-foreground md:text-5xl text-balance">
            {t('Changez d\'apparence en live')}
          </h1>
          <p className="text-3xl font-medium text-emerald-400">{t('avec ChapCam')}</p>
          <p className="mt-6 text-lg text-muted-foreground">
            {t('2 points = 1 seconde de transformation du visage et corps entier')}
          </p>

          {/* Convertisseur de devise indicatif */}
          <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2">
            <label htmlFor="currency-select" className="text-sm text-muted-foreground">
              {t('Afficher les prix en')}
            </label>
            <select
              id="currency-select"
              value={currency.code}
              onChange={(e) => setCurrencyCode(e.target.value)}
              className="cursor-pointer rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-sm font-semibold text-foreground outline-none focus:border-emerald-400"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code} className="bg-[#0a0a0a] text-white">
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          {currency.code !== 'XOF' && (
            <p className="mt-3 text-xs text-muted-foreground/70">
              {t('Montants convertis a titre indicatif. Vous serez debite en FCFA (XOF).')}
            </p>
          )}
        </div>

        <div className="mx-auto mb-8 max-w-2xl rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-center">
          <p className="text-sm font-semibold text-emerald-300">
            {t('Paiement 100% securise et instantane. Apres avoir paye, patientez quelques secondes sur la page PayDunya : votre compte est credite automatiquement des la confirmation.')}
          </p>
        </div>

        {error && (
          <div className="mx-auto mb-8 max-w-xl rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm text-red-400">
            {error}
          </div>
        )}

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
                {t('Nouveau · Sorti le 17 juillet')}
              </div>
              <h3 className="text-xl font-bold text-foreground md:text-2xl">
                {t('Ces recharges alimentent ChapCam 2.0')}
              </h3>
              <p className="mt-2 text-pretty leading-relaxed text-muted-foreground">
                {t('Toutes les offres ci-dessous sont destinees a notre nouveau logiciel')}{' '}
                <span className="font-semibold text-emerald-400">ChapCam 2.0</span>{t(', qui fonctionne desormais avec')}{' '}
                <span className="font-semibold text-foreground">{t('tout type de PC')}</span> {t('et permet meme de')}{' '}
                <span className="font-semibold text-foreground">{t('changer la couleur de peau')}</span>.
              </p>
            </div>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground md:min-w-[220px]">
              <span className="inline-flex items-center gap-2">
                <Monitor className="h-4 w-4 flex-shrink-0 text-emerald-400" />
                {t('Compatible avec tout type de PC')}
              </span>
              <span className="inline-flex items-center gap-2">
                <Palette className="h-4 w-4 flex-shrink-0 text-emerald-400" />
                {t('Changement de la couleur de peau')}
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
            // Forfait le plus haut de gamme : rendu premium ornemente (couronne doree).
            const isVipDebout = plan.id === 'vipdebout'
            // VIP PRO : petit logo couronne a cote du titre.
            const isVipPro = plan.id === 'ultimate'
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                style={
                  isVipDebout
                    ? { borderColor: '#facc15', boxShadow: `0 0 70px rgba(250,204,21,0.35), 0 0 40px ${accent}44` }
                    : plan.highlight
                    ? { borderColor: accent, boxShadow: `0 0 60px ${accent}55` }
                    : undefined
                }
                className={`relative flex flex-col rounded-3xl p-8 transition-all ${
                  isVipDebout
                    ? 'border-2 bg-gradient-to-b from-[#161310] via-card to-card lg:scale-105 z-10'
                    : plan.highlight
                    ? 'border-2 bg-card lg:scale-105 z-10'
                    : 'border border-gray-800 bg-card hover:border-primary'
                }`}
              >
                {/* Halo dore ornemente en fond pour le forfait premium.
                    rounded-3xl + overflow-hidden ici pour ne pas rogner les badges de la carte. */}
                {isVipDebout && (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl opacity-60"
                  >
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          'radial-gradient(120% 80% at 50% -10%, rgba(250,204,21,0.18), transparent 55%)',
                      }}
                    />
                  </div>
                )}

                <div className="absolute -right-3 -top-3 z-20 rounded-full bg-red-500 px-3 py-1.5 text-xs font-bold text-white shadow-lg">
                  -{plan.discount}%
                </div>

                {/* Badge du haut : "POPULAIRE" pour VIP PRO, "MEILLEURE OFFRE" pour VIP DEBOUT */}
                {plan.bestOffer ? (
                  <div
                    className="absolute -top-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full px-5 py-1 text-sm font-bold text-black shadow-lg"
                    style={{ backgroundColor: accent }}
                  >
                    <Crown className="h-4 w-4" />
                    {t('POPULAIRE')}
                  </div>
                ) : plan.id === 'vipdebout' ? (
                  <div
                    className="absolute -top-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full px-5 py-1 text-sm font-bold text-black shadow-lg"
                    style={{ backgroundColor: accent }}
                  >
                    <Crown className="h-4 w-4" />
                    {t('MEILLEURE OFFRE')}
                  </div>
                ) : null}

                <div className="relative z-10 flex flex-1 flex-col">
                {/* Medaillon couronne ornemente : logo VIP premium (VIP DEBOUT) */}
                {isVipDebout && (
                  <div className="mb-4 flex flex-col items-center">
                    <div className="relative flex h-16 w-16 items-center justify-center">
                      {/* Anneau dore exterieur */}
                      <span className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-600 shadow-[0_0_24px_rgba(250,204,21,0.6)]" />
                      {/* Disque interieur sombre */}
                      <span className="absolute inset-[3px] rounded-full bg-[#12100b]" />
                      <Crown className="relative h-8 w-8 text-amber-300" strokeWidth={2} fill="rgba(250,204,21,0.25)" />
                    </div>
                    <span className="mt-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.15em] text-amber-300">
                      {t('Édition VIP')}
                    </span>
                  </div>
                )}

                <div className={`text-sm font-medium text-emerald-400 ${isVipDebout ? 'text-center' : ''}`}>{t(plan.duration)}</div>
                <h3 className={`mt-2 flex items-center gap-2 text-3xl font-bold text-foreground ${isVipDebout ? 'justify-center' : ''}`}>
                  {isVipPro && (
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-[0_0_16px_rgba(249,115,22,0.5)]"
                      style={{ backgroundColor: accent }}
                    >
                      <Crown className="h-5 w-5 text-black" strokeWidth={2.5} />
                    </span>
                  )}
                  {plan.name}
                </h3>

                <div className="mb-2 mt-8">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xl text-text-faint line-through">
                      {formatXof(plan.oldPrice)}
                    </span>
                    <span className="text-sm font-semibold text-red-400">-{plan.discount}%</span>
                  </div>
                  <span
                    className="text-5xl font-bold text-primary"
                    style={plan.id === 'vipdebout' ? { color: '#facc15' } : undefined}
                  >
                    {formatXof(plan.price)}
                  </span>
                  <span className="text-2xl text-muted-foreground"> FCFA</span>
                  {formatConverted(plan.price, currency, rates) && (
                    <p className="mt-1 text-sm font-medium" style={{ color: accent }}>
                      ≈ {formatConverted(plan.price, currency, rates)}
                    </p>
                  )}
                </div>

                {/* Statut du logo (watermark) mis en avant */}
                {plan.watermark === 'with' ? (
                  <div className="mt-8 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <Droplet className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-bold text-foreground">{t('Avec logo ChapCam')}</p>
                      <p className="text-xs text-muted-foreground">{t('Filigrane visible sur le rendu')}</p>
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
                        {plan.watermark === 'auto' ? t('Sans logo (automatique)') : t('Sans logo (sur demande)')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {plan.watermark === 'auto'
                          ? t('Retrait du logo inclus, active automatiquement')
                          : t('Retrait du logo active par notre equipe')}
                      </p>
                    </div>
                  </div>
                )}

                {/* Cadeau physique offert (uniquement VIP DEBOUT) */}
                {isVipDebout && (
                  <div className="mt-6 flex items-center gap-4 rounded-2xl border border-amber-400/50 bg-amber-400/10 p-4">
                    <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-black/40">
                      <Image
                        src="/images/voice-changer-i9.png"
                        alt="Appareil changeur de voix i9 offert avec l'offre VIP DEBOUT"
                        width={64}
                        height={64}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div>
                      <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-black">
                        <Gift className="h-3 w-3" />
                        {t('Cadeau inclus')}
                      </div>
                      <p className="text-sm font-bold text-foreground">{t('Changeur de voix i9 offert')}</p>
                      <p className="text-xs text-muted-foreground">{t('Boîtier + accessoires livrés')}</p>
                    </div>
                  </div>
                )}

                <ul className="mt-6 flex-1 space-y-4 text-muted-foreground">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <Check className="h-5 w-5 flex-shrink-0 text-emerald-400" />
                      {t(feature)}
                    </li>
                  ))}
                  <li className="flex items-center gap-3">
                    <Check className="h-5 w-5 flex-shrink-0 text-emerald-400" />
                    {formatXof(plan.points)} {t('points')} ({plan.minutes})
                  </li>
                  <li className="flex items-center gap-3 rounded-xl bg-primary/10 px-3 py-2 font-medium text-foreground">
                    <Clapperboard className="h-5 w-5 flex-shrink-0 text-primary" />
                    {t('Studio Photo en Vidéo :')} {t('{n} vidéos de 30s incluses').replace('{n}', String(plan.photoVideoQuota))}
                  </li>
                </ul>

                <motion.button
                  onClick={() => startCheckout(plan.id)}
                  disabled={!!pendingKey}
                  // Animation du bouton : grossit au survol, s'enfonce au clic.
                  // On desactive l'animation quand un paiement est en cours (disabled).
                  whileHover={pendingKey ? undefined : { scale: 1.04 }}
                  whileTap={pendingKey ? undefined : { scale: 0.97 }}
                  // Leger pulse continu sur le forfait mis en avant pour attirer l'oeil.
                  animate={
                    plan.highlight && !pendingKey
                      ? { scale: [1, 1.02, 1] }
                      : { scale: 1 }
                  }
                  transition={
                    plan.highlight && !pendingKey
                      ? { duration: 2, repeat: Infinity, ease: 'easeInOut' }
                      : { type: 'spring', stiffness: 400, damping: 25 }
                  }
                  className={`mt-10 flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                    plan.highlight
                      ? 'bg-primary text-black hover:bg-primary/90'
                      : 'bg-white text-black hover:bg-gray-200'
                  }`}
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      {t('Recharger')}
                      <CreditCard className="h-4 w-4" />
                    </>
                  )}
                </motion.button>
                </div>
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
              {t('Activation automatique et immediate apres confirmation du paiement.')}
            </p>
          </div>
          <div className="mt-6">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-700 bg-card px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
            >
              {t('Retour au tableau de bord')}
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
