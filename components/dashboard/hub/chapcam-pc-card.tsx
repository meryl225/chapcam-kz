'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Monitor, Check, CreditCard, Loader2, Eye } from 'lucide-react'
import { PC_OFFER } from '@/lib/pc-offer'

export function ChapCamPcCard() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const buy = async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: PC_OFFER.id }),
      })
      const data = await res.json()
      if (res.ok && data.success && data.invoice_url) {
        window.location.href = data.invoice_url
        return
      }
      setError(data.error || 'Impossible de demarrer le paiement. Reessayez.')
    } catch {
      setError('Erreur de connexion. Reessayez.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section
      aria-label="Offre ChapCam PC"
      className="overflow-hidden rounded-2xl border border-hairline bg-card"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2">
        {/* Contenu */}
        <div className="p-6 md:p-8">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15">
              <Monitor className="h-6 w-6 text-primary" />
            </div>
            <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-bold uppercase text-primary">
              Nouveau
            </span>
          </div>

          <h3 className="text-xl font-bold text-foreground text-balance md:text-2xl">
            ChapCam PC — Mode Gamer
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
            {PC_OFFER.description}
          </p>

          <ul className="mt-5 grid gap-2.5 text-sm text-muted-foreground sm:grid-cols-2">
            {PC_OFFER.features.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                <span>{f}</span>
              </li>
            ))}
          </ul>

          {error && (
            <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {error}
            </p>
          )}
        </div>

        {/* Prix + actions */}
        <div className="flex flex-col justify-center gap-4 border-t border-hairline bg-background/40 p-6 md:p-8 lg:border-l lg:border-t-0">
          <div>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-black text-primary">
                {PC_OFFER.price.toLocaleString()}
              </span>
              <span className="pb-1 text-lg text-muted-foreground">FCFA</span>
            </div>
            <p className="text-xs text-text-faint">Paiement unique, licence a vie</p>
          </div>

          <button
            onClick={buy}
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 font-bold text-black transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                Acheter ChapCam PC — {PC_OFFER.price.toLocaleString()} FCFA
                <CreditCard className="h-4 w-4" />
              </>
            )}
          </button>

          <Link
            href="/desktop"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-hairline bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-primary/40"
          >
            <Eye className="h-4 w-4" />
            Voir l&apos;interface du logiciel
          </Link>

          <p className="text-center text-xs text-text-faint text-pretty">
            Apres paiement, tu recois ta cle de licence par email + lien de telechargement.
          </p>
        </div>
      </div>
    </section>
  )
}
