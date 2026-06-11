'use client'

import { useState } from 'react'
import { Check, Loader2, Zap, ArrowRight, ExternalLink } from 'lucide-react'
import { VOICE_OFFERS } from '@/lib/voice-offers'

// Detecte les navigateurs in-app (TikTok, Instagram, Facebook, Snapchat...) ou
// PayDunya ne se charge pas correctement : on propose alors d'ouvrir le lien.
function isInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  return /FBAN|FBAV|Instagram|TikTok|Snapchat|Line|Twitter|Pinterest|Musical/i.test(ua)
}

export function VoiceOffersSection() {
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [inAppUrl, setInAppUrl] = useState('')

  const startCheckout = async (productId: string) => {
    setError('')
    setPendingId(productId)
    try {
      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      })
      const data = await res.json()
      if (res.ok && data.success && data.invoice_url) {
        if (isInAppBrowser()) {
          setInAppUrl(data.invoice_url)
          return
        }
        // Redirection directe vers la page de paiement securisee PayDunya.
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

  return (
    <section className="rounded-2xl border border-hairline bg-card p-6">
      <div className="mb-1 flex items-center gap-2">
        <Zap className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Offres ChapVoice</h2>
      </div>
      <p className="mb-5 text-sm text-muted-foreground">
        Rechargez vos minutes de changement de voix temps reel. Paiement securise via PayDunya.
      </p>

      {error && (
        <p className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
          {error}
        </p>
      )}

      {inAppUrl && (
        <div className="mb-4 rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm">
          <p className="mb-2 text-foreground">
            Ouvrez ce lien dans votre navigateur (Chrome, Safari) pour finaliser le paiement :
          </p>
          <a
            href={inAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-medium text-primary underline"
          >
            Ouvrir la page de paiement <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {VOICE_OFFERS.map((offer) => {
          const isPending = pendingId === offer.id
          return (
            <div
              key={offer.id}
              className={`relative flex flex-col rounded-2xl border bg-muted/30 p-5 ${
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
                <span className="text-2xl font-bold text-foreground">{offer.minutes}</span>
                <span className="text-sm text-muted-foreground">min/mois</span>
              </div>
              <p className="mt-1 text-lg font-semibold text-primary">
                {offer.price.toLocaleString('fr-FR')} FCFA
                <span className="ml-1 text-xs font-normal text-muted-foreground">/mois</span>
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
                    Recharger <ArrowRight className="h-4 w-4" />
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
