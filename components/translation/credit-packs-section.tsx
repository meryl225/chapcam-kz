'use client'

import { Check, Loader2, Languages, ArrowRight } from 'lucide-react'
import { TRANSLATION_OFFERS } from '@/lib/translation-offers'
import { usePaymentCheckout } from '@/components/payment/use-payment-checkout'

// Section d'achat de credits Traduction Video, achetables SANS forfait.
// Reutilise le tunnel de paiement partage (PayDunya / crypto).
export function TranslationCreditPacksSection() {
  const { startCheckout, pendingKey, error, modal } = usePaymentCheckout()

  return (
    <section className="mt-6 rounded-2xl border border-hairline bg-card p-5 lg:p-6">
      {modal}
      <div className="mb-1 flex items-center gap-2">
        <Languages className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Acheter des traductions</h2>
      </div>
      <p className="mb-5 text-sm text-muted-foreground text-pretty">
        Pas de forfait ? Achète directement des crédits Traduction. 1 crédit = 1 vidéo traduite
        (jusqu&apos;à 60s) dans la langue de ton choix, avec voix clonée et synchro labiale.
        Paiement sécurisé par mobile money, carte ou crypto.
      </p>

      {error && (
        <p className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {TRANSLATION_OFFERS.map((offer) => {
          const isPending = pendingKey === offer.id
          const pricePer = Math.round(offer.price / offer.credits)
          return (
            <div
              key={offer.id}
              className={`relative flex flex-col rounded-2xl border bg-secondary/30 p-5 ${
                offer.highlight ? 'border-primary' : 'border-hairline'
              }`}
            >
              {offer.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary-foreground">
                  Populaire
                </span>
              )}
              <h3 className="text-base font-semibold text-foreground">{offer.name}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-foreground">{offer.credits}</span>
                <span className="text-sm text-muted-foreground">
                  {offer.credits > 1 ? 'traductions' : 'traduction'}
                </span>
              </div>
              <p className="mt-1 text-lg font-semibold text-primary">
                {offer.price.toLocaleString('fr-FR')} FCFA
              </p>
              <p className="text-xs text-text-faint">
                soit {pricePer.toLocaleString('fr-FR')} FCFA / vidéo
              </p>

              <ul className="mt-4 flex flex-1 flex-col gap-2">
                {offer.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => startCheckout(offer.id)}
                disabled={isPending}
                className={`mt-5 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 ${
                  offer.highlight
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'border border-hairline bg-card text-foreground hover:bg-muted'
                }`}
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Redirection...
                  </>
                ) : (
                  <>
                    Acheter <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
