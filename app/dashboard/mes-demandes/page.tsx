'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ClipboardList,
  Loader2,
  CheckCircle2,
  Clock,
  MapPin,
  CreditCard,
} from 'lucide-react'
import { usePaymentCheckout } from '@/components/payment/use-payment-checkout'

interface InstallRequest {
  id: string
  location: string | null
  apps: string[] | null
  status: string
  paid: boolean
  paid_at: string | null
  created_at: string
}

const INSTALL_FEE = 8500

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export default function MesDemandesPage() {
  const [requests, setRequests] = useState<InstallRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Paiement partage : choix PayDunya (mobile money/carte) ou Crypto (Trybit).
  const { startCheckout, pendingKey, error: payError, modal } = usePaymentCheckout()

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/installation-request')
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erreur de chargement.')
        return
      }
      setRequests(data.requests || [])
    } catch {
      setError('Erreur de connexion.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handlePay = (id: string) => {
    setError(null)
    // La cle de chargement est l'id de la demande pour cibler le bon bouton.
    startCheckout('install', { loaderKey: id })
  }

  return (
    <div className="p-6">
      {modal}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/dashboard"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-hairline bg-secondary text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <ClipboardList className="h-6 w-6 text-primary" />
            Mes demandes d&apos;installation
          </h1>
          <p className="text-sm text-muted-foreground">Suivez l&apos;etat de vos demandes et reglez les frais</p>
        </div>
      </div>

      {(error || payError) && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error || payError}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-text-faint">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-2xl border border-hairline bg-card py-16 text-center">
          <ClipboardList className="mx-auto mb-3 h-10 w-10 text-text-faint" />
          <p className="text-muted-foreground">Vous n&apos;avez aucune demande d&apos;installation.</p>
          <Link
            href="/dashboard"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1d4ed8]"
          >
            Faire une demande
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div
              key={r.id}
              className="flex flex-col gap-3 rounded-2xl border border-hairline bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {r.paid ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/15 px-2.5 py-0.5 text-xs font-bold text-primary">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Paye · {INSTALL_FEE.toLocaleString()} F
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-orange-500/30 bg-orange-500/15 px-2.5 py-0.5 text-xs font-bold text-orange-400">
                      <Clock className="h-3.5 w-3.5" />
                      En attente de paiement
                    </span>
                  )}
                  <span className="rounded-full border border-hairline bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    {r.status}
                  </span>
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 text-text-faint" />
                  {r.location || 'Lieu non precise'}
                </p>
                {r.apps && r.apps.length > 0 && (
                  <p className="mt-1 text-xs text-text-faint">{r.apps.join(' · ')}</p>
                )}
                <p className="mt-1 text-xs text-text-faint">Demande le {fmtDate(r.created_at)}</p>
              </div>

              {!r.paid && (
                <button
                  onClick={() => handlePay(r.id)}
                  disabled={pendingKey === r.id}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-600 disabled:opacity-60"
                >
                  {pendingKey === r.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CreditCard className="h-4 w-4" />
                  )}
                  Payer {INSTALL_FEE.toLocaleString()} F
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
