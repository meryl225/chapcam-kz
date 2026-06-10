'use client'

import { useState } from 'react'
import { Check, Download, Loader2, Lock } from 'lucide-react'
import { PC_OFFER } from '@/lib/pc-offer'
import { isInAppBrowser } from '@/lib/in-app-browser'
import { InAppBrowserNotice } from '@/components/in-app-browser-notice'

export function ChapCamPcCard() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inAppUrl, setInAppUrl] = useState<string | null>(null)

  const buy = async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: PC_OFFER.id }),
      })
      const data = await res.json().catch(() => null)
      if (res.ok && data?.success && data?.invoice_url) {
        if (isInAppBrowser()) {
          setInAppUrl(data.invoice_url)
          return
        }
        window.location.href = data.invoice_url
        return
      }
      setError(data?.error || 'Impossible de demarrer le paiement. Reessaie.')
    } catch {
      setError('Erreur de connexion. Reessaie.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-hairline bg-card p-5">
      {inAppUrl && <InAppBrowserNotice url={inAppUrl} onClose={() => setInAppUrl(null)} />}
      {/* Bouton principal : telecharger = lancer le paiement */}
      <button
        onClick={buy}
        disabled={loading}
        className="group inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-primary px-5 py-4 text-base font-extrabold text-black shadow-lg shadow-primary/30 transition-all hover:brightness-110 disabled:opacity-60"
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>
            <Download className="h-5 w-5" />
            Telecharger ChapCam PC
          </>
        )}
      </button>

      <p className="mt-2.5 flex items-center justify-center gap-1.5 text-center text-xs text-text-faint">
        <Lock className="h-3.5 w-3.5" />
        Paiement unique securise · cle de licence envoyee par email
      </p>

      {error && (
        <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {error}
        </p>
      )}

      {/* Ce qui est inclus */}
      <ul className="mt-5 grid gap-2 border-t border-hairline pt-5 text-sm text-muted-foreground">
        {PC_OFFER.features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
