'use client'

import { useCallback, useState, type ReactNode } from 'react'
import Image from 'next/image'
import { ChevronRight, CreditCard, Loader2, ShieldCheck, X, Zap, Headphones, Lock, BadgeCheck, Plus, Globe } from 'lucide-react'
import { isInAppBrowser } from '@/lib/in-app-browser'
import { InAppBrowserNotice } from '@/components/in-app-browser-notice'

export type PaymentMethod = 'paydunya' | 'trybit' | 'nowpayments' | 'geniuspay'

interface StartOptions {
  phoneNumber?: string
  // Cle utilisee pour l'etat de chargement du bouton (defaut : productId).
  loaderKey?: string
}

interface Chooser {
  productId: string
  phoneNumber?: string
  loaderKey: string
}

const ENDPOINTS: Record<PaymentMethod, string> = {
  paydunya: '/api/payment/create',
  trybit: '/api/payment/trybit/create',
  nowpayments: '/api/payment/nowpayments/create',
  geniuspay: '/api/payment/geniuspay/create',
}

// Hook partage de paiement ChapCam. Presente un choix de methode
// (Mobile Money / Carte via PayDunya OU Crypto via Trybit) puis redirige vers
// la page de paiement correspondante. Gere aussi les navigateurs in-app.
export function usePaymentCheckout() {
  const [chooser, setChooser] = useState<Chooser | null>(null)
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [pendingMethod, setPendingMethod] = useState<PaymentMethod | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [inAppUrl, setInAppUrl] = useState<string | null>(null)

  const startCheckout = useCallback((productId: string, opts?: StartOptions) => {
    setError(null)
    setChooser({
      productId,
      phoneNumber: opts?.phoneNumber,
      loaderKey: opts?.loaderKey || productId,
    })
  }, [])

  const close = useCallback(() => {
    if (pendingKey) return // on ne ferme pas pendant une redirection en cours
    setChooser(null)
    setError(null)
  }, [pendingKey])

  const pay = useCallback(
    async (method: PaymentMethod) => {
      if (!chooser) return
      setError(null)
      setPendingKey(chooser.loaderKey)
      setPendingMethod(method)
      try {
        const res = await fetch(ENDPOINTS[method], {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: chooser.productId,
            phoneNumber: chooser.phoneNumber,
          }),
        })
        const data = await res.json().catch(() => null)
        if (res.ok && data?.success && data?.invoice_url) {
          if (isInAppBrowser()) {
            setInAppUrl(data.invoice_url)
            setPendingKey(null)
            setPendingMethod(null)
            return
          }
          window.location.href = data.invoice_url
          return
        }
        setError(data?.error || 'Impossible de demarrer le paiement. Reessayez.')
      } catch {
        setError('Erreur de connexion. Reessayez.')
      } finally {
        setPendingKey(null)
        setPendingMethod(null)
      }
    },
    [chooser],
  )

  const modal: ReactNode = (
    <>
      {inAppUrl && <InAppBrowserNotice url={inAppUrl} onClose={() => setInAppUrl(null)} />}
      {chooser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-md duration-300 animate-in fade-in-0">
          <div className="relative my-auto w-full max-w-md overflow-hidden rounded-[24px] border border-white/10 bg-[#0b0e14] text-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] duration-300 animate-in zoom-in-95 fade-in-0">
            {/* Halo bleu decoratif en haut */}
            <div className="pointer-events-none absolute -top-24 left-1/2 h-56 w-72 -translate-x-1/2 rounded-full bg-[#2f6bff]/25 blur-3xl" />
            <div className="pointer-events-none absolute inset-0 rounded-[24px] ring-1 ring-inset ring-white/5" />

            <button
              onClick={close}
              disabled={!!pendingKey}
              className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 backdrop-blur transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>

            {/* En-tete */}
            <div className="relative px-6 pb-6 pt-8 sm:px-8">
              <div className="relative flex h-16 w-16 items-center justify-center">
                <span className="absolute inset-0 rounded-full bg-[#2f6bff]/20 blur-lg" />
                <span className="absolute inset-0 rounded-full border border-[#2f6bff]/40" />
                <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#3b82f6] to-[#1d4ed8] text-white shadow-lg shadow-[#2f6bff]/40">
                  <ShieldCheck className="h-6 w-6" />
                </span>
              </div>
              <h3 className="mt-5 pr-8 text-2xl font-bold leading-tight tracking-tight text-balance">
                Finalisez votre{' '}
                <span className="bg-gradient-to-r from-[#60a5fa] to-[#3b82f6] bg-clip-text text-transparent">
                  paiement
                </span>
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-white/50 text-pretty">
                Votre compte sera crédité automatiquement dès la confirmation du paiement.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
                  <Zap className="h-3.5 w-3.5 text-[#60a5fa]" />
                  Rapide
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  100% Sécurisé
                </span>
              </div>
            </div>

            <div className="relative px-6 pb-6 sm:px-8">
              {error && (
                <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </p>
              )}

              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/35">
                Choisissez une méthode de paiement
              </p>

              <div className="flex flex-col gap-3.5">
                {/* PayDunya : mobile money / carte */}
                <button
                  onClick={() => pay('paydunya')}
                  disabled={!!pendingKey}
                  className="group relative flex items-center gap-4 rounded-[20px] border border-[#2f6bff]/30 bg-gradient-to-br from-[#111726] to-[#0d1220] p-4 text-left shadow-[0_0_0_1px_rgba(47,107,255,0.04)] transition-all duration-200 hover:border-[#3b82f6]/70 hover:shadow-[0_10px_40px_-12px_rgba(47,107,255,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] disabled:opacity-60"
                >
                  <span className="absolute -top-2.5 left-4 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#3b82f6] to-[#2563eb] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-lg shadow-[#2f6bff]/40">
                    <BadgeCheck className="h-3 w-3" />
                    Recommandé
                  </span>
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#3b82f6]/20 to-[#1d4ed8]/10 text-[#60a5fa] ring-1 ring-inset ring-[#3b82f6]/20">
                    {pendingMethod === 'paydunya' ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <CreditCard className="h-6 w-6" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-semibold text-white">Mobile Money ou Carte</span>
                    <span className="mt-0.5 block text-xs text-white/45">Paiement rapide et sécurisé</span>
                    <span className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      {[
                        { src: '/images/wave-logo.png', alt: 'Wave' },
                        { src: '/images/orange-money-logo.png', alt: 'Orange Money' },
                        { src: '/images/mtn-momo-logo.jpg', alt: 'MTN MoMo' },
                        { src: '/images/djamo-logo.png', alt: 'Djamo' },
                      ].map((logo) => (
                        <span
                          key={logo.alt}
                          className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-white/10"
                        >
                          <Image src={logo.src} alt={logo.alt} width={22} height={22} className="h-5 w-5 object-contain" />
                        </span>
                      ))}
                      <span className="ml-0.5 inline-flex items-center gap-1 text-xs font-medium text-[#60a5fa]">
                        <Plus className="h-3 w-3" />
                        Carte bancaire
                      </span>
                    </span>
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-white/30 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[#60a5fa]" />
                </button>

                {/* GeniusPay : carte bancaire internationale + mobile money */}
                <button
                  onClick={() => pay('geniuspay')}
                  disabled={!!pendingKey}
                  className="group flex items-center gap-4 rounded-[20px] border border-white/10 bg-gradient-to-br from-[#111726] to-[#0d1220] p-4 text-left transition-all duration-200 hover:border-[#06b6d4]/60 hover:shadow-[0_10px_40px_-12px_rgba(6,182,212,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#06b6d4] disabled:opacity-60"
                >
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#06b6d4]/20 to-[#0e7490]/15 text-[#22d3ee] ring-1 ring-inset ring-[#06b6d4]/20">
                    {pendingMethod === 'geniuspay' ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <Globe className="h-6 w-6" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-base font-semibold text-white">Carte bancaire internationale</span>
                    </span>
                    <span className="mt-1 block text-sm text-white/45">
                      Visa, Mastercard et mobile money — paiement hors zone CFA
                    </span>
                    <span className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/70 ring-1 ring-inset ring-white/10">
                        Visa
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/70 ring-1 ring-inset ring-white/10">
                        Mastercard
                      </span>
                    </span>
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-white/30 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[#22d3ee]" />
                </button>

                {/* NOWPayments : crypto (seule option crypto active) */}
                <button
                  onClick={() => pay('nowpayments')}
                  disabled={!!pendingKey}
                  className="group flex items-center gap-4 rounded-[20px] border border-white/10 bg-gradient-to-br from-[#111726] to-[#0d1220] p-4 text-left transition-all duration-200 hover:border-[#f7931a]/60 hover:shadow-[0_10px_40px_-12px_rgba(247,147,26,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f7931a] disabled:opacity-60"
                >
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#f7931a]/20 to-[#9333ea]/15 text-[#f7931a] ring-1 ring-inset ring-[#f7931a]/20">
                    {pendingMethod === 'nowpayments' ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <Image src="/images/bitcoin-logo.png" alt="Crypto" width={30} height={30} className="h-8 w-8 object-contain" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-base font-semibold text-white">Cryptomonnaie</span>
                      <span className="rounded-full bg-[#7c3aed]/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#c4b5fd]">
                        En EUR
                      </span>
                    </span>
                    <span className="mt-1 block text-sm text-white/45">
                      Bitcoin, USDT, ETH et 200+ cryptos acceptées
                    </span>
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-white/30 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[#f7931a]" />
                </button>
              </div>

              {/* Gages de confiance - footer 3 colonnes */}
              <div className="mt-5 grid grid-cols-3 gap-2 rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                {[
                  { icon: ShieldCheck, color: 'text-emerald-400', title: 'Paiement 100% sécurisé', sub: 'Vos données protégées' },
                  { icon: Zap, color: 'text-[#60a5fa]', title: 'Activation instantanée', sub: 'Crédit immédiat' },
                  { icon: Headphones, color: 'text-[#c4b5fd]', title: 'Support 24/7', sub: 'Nous sommes là pour vous' },
                ].map((item) => (
                  <div key={item.title} className="flex flex-col items-center gap-1.5 text-center">
                    <item.icon className={`h-5 w-5 ${item.color}`} />
                    <span className="text-[11px] font-semibold leading-tight text-white/85 text-pretty">{item.title}</span>
                    <span className="text-[10px] leading-tight text-white/35 text-pretty">{item.sub}</span>
                  </div>
                ))}
              </div>

              {/* Barre plateforme verifiee */}
              <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <span className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/50">
                    <Lock className="h-4 w-4" />
                  </span>
                  <span className="text-[11px] leading-tight text-white/45 text-pretty">
                    Vos données sont protégées par un chiffrement de niveau bancaire.
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <BadgeCheck className="h-4 w-4 text-[#3b82f6]" />
                  <span className="flex flex-col leading-tight">
                    <span className="text-[11px] font-semibold text-white">chapcam.com</span>
                    <span className="text-[10px] text-emerald-400">Plateforme vérifiée</span>
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )

  return { startCheckout, pendingKey, error, setError, modal }
}
