'use client'

import { useCallback, useState, type ReactNode } from 'react'
import Image from 'next/image'
import { CreditCard, Loader2, ShieldCheck, X } from 'lucide-react'
import { isInAppBrowser } from '@/lib/in-app-browser'
import { InAppBrowserNotice } from '@/components/in-app-browser-notice'

export type PaymentMethod = 'paydunya' | 'trybit'

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
          <div className="relative w-full max-w-md rounded-2xl border border-hairline bg-card p-6 shadow-2xl">
            <button
              onClick={close}
              disabled={!!pendingKey}
              className="absolute right-4 top-4 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-foreground">Choisissez votre moyen de paiement</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Votre compte est credite automatiquement des la confirmation.
            </p>

            {error && (
              <p className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="mt-5 flex flex-col gap-3">
              {/* PayDunya : mobile money / carte */}
              <button
                onClick={() => pay('paydunya')}
                disabled={!!pendingKey}
                className="flex items-center gap-4 rounded-xl border border-hairline bg-muted/40 p-4 text-left transition-colors hover:border-primary hover:bg-muted disabled:opacity-60"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  {pendingMethod === 'paydunya' ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <CreditCard className="h-5 w-5" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-foreground">Mobile Money ou Carte</span>
                  <span className="block text-sm text-muted-foreground">
                    Wave, Orange, MTN, Moov, Djamo, carte bancaire — via PayDunya
                  </span>
                </span>
              </button>

              {/* Trybit : crypto */}
              <button
                onClick={() => pay('trybit')}
                disabled={!!pendingKey}
                className="flex items-center gap-4 rounded-xl border border-hairline bg-muted/40 p-4 text-left transition-colors hover:border-amber-500 hover:bg-muted disabled:opacity-60"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#f7931a]/15 text-[#f7931a]">
                  {pendingMethod === 'trybit' ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Image src="/images/bitcoin-logo.png" alt="Bitcoin" width={28} height={28} className="h-7 w-7 object-contain" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-foreground">Cryptomonnaie</span>
                  <span className="block text-sm text-muted-foreground">
                    Bitcoin, USDT, ETH et plus — via Trybit (montant en EUR)
                  </span>
                </span>
              </button>
            </div>

            <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-text-faint">
              <ShieldCheck className="h-3.5 w-3.5" />
              Paiement 100% securise
            </p>
          </div>
        </div>
      )}
    </>
  )

  return { startCheckout, pendingKey, error, setError, modal }
}
