'use client'

import { useCallback, useState, type ReactNode } from 'react'
import Image from 'next/image'
import { ChevronRight, CreditCard, Loader2, ShieldCheck, X, Zap } from 'lucide-react'
import { isInAppBrowser } from '@/lib/in-app-browser'
import { InAppBrowserNotice } from '@/components/in-app-browser-notice'

export type PaymentMethod = 'paydunya' | 'trybit' | 'nowpayments'

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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-hairline bg-card shadow-2xl">
            <button
              onClick={close}
              disabled={!!pendingKey}
              className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* En-tete */}
            <div className="border-b border-hairline px-6 pb-5 pt-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <h3 className="mt-3 pr-8 text-lg font-bold text-foreground">Finalisez votre paiement</h3>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Zap className="h-3.5 w-3.5 shrink-0 text-primary" />
                Compte credite automatiquement des la confirmation.
              </p>
            </div>

            <div className="px-6 pb-6 pt-5">
              {error && (
                <p className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}

              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-text-faint">
                Choisissez une methode
              </p>

              <div className="flex flex-col gap-3">
                {/* PayDunya : mobile money / carte */}
                <button
                  onClick={() => pay('paydunya')}
                  disabled={!!pendingKey}
                  className="group relative flex items-center gap-4 rounded-xl border border-hairline bg-muted/30 p-4 text-left transition-all hover:border-primary hover:bg-muted hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
                >
                  <span className="absolute -top-2 left-4 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground shadow-sm">
                    Recommande
                  </span>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    {pendingMethod === 'paydunya' ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <CreditCard className="h-5 w-5" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-foreground">Mobile Money ou Carte</span>
                    <span className="mt-2 flex flex-wrap items-center gap-1.5">
                      {[
                        { src: '/images/wave-logo.png', alt: 'Wave' },
                        { src: '/images/orange-money-logo.png', alt: 'Orange Money' },
                        { src: '/images/mtn-momo-logo.jpg', alt: 'MTN MoMo' },
                        { src: '/images/djamo-logo.png', alt: 'Djamo' },
                      ].map((logo) => (
                        <span
                          key={logo.alt}
                          className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-md bg-white ring-1 ring-hairline"
                        >
                          <Image src={logo.src} alt={logo.alt} width={20} height={20} className="h-5 w-5 object-contain" />
                        </span>
                      ))}
                      <span className="text-xs text-muted-foreground">+ carte bancaire</span>
                    </span>
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </button>

                {/* NOWPayments : crypto (seule option crypto active) */}
                <button
                  onClick={() => pay('nowpayments')}
                  disabled={!!pendingKey}
                  className="group flex items-center gap-4 rounded-xl border border-hairline bg-muted/30 p-4 text-left transition-all hover:border-[#f7931a] hover:bg-muted hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f7931a] disabled:opacity-60"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#f7931a]/15 text-[#f7931a]">
                    {pendingMethod === 'nowpayments' ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Image src="/images/bitcoin-logo.png" alt="Crypto" width={28} height={28} className="h-7 w-7 object-contain" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">Cryptomonnaie</span>
                      <span className="rounded-full bg-[#f7931a]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#f7931a]">
                        En EUR
                      </span>
                    </span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      Bitcoin, USDT, ETH et 200+ cryptos acceptees
                    </span>
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-[#f7931a]" />
                </button>
              </div>

              {/* Gages de confiance */}
              <div className="mt-5 flex items-center justify-center gap-4 border-t border-hairline pt-4 text-xs text-text-faint">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  100% securise
                </span>
                <span className="h-3 w-px bg-hairline" />
                <span className="flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-primary" />
                  Activation instantanee
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
