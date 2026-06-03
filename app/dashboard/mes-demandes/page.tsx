'use client'

import { useEffect, useState } from 'react'
import { Clock, CheckCircle, XCircle, Loader2, RefreshCw, ReceiptText, Wrench, CreditCard } from 'lucide-react'
import Link from 'next/link'
import { PAYMENT_METHOD_LABELS, PAYMENT_METHOD_LOGOS } from '@/lib/payment-methods'
import { getPlan } from '@/lib/plans'
import { INSTALL_FEE } from '@/lib/install-offer'

interface MyRequest {
  id: string
  plan: string
  amount: number
  paid_amount: number | null
  payment_method: string
  status: 'pending' | 'approved' | 'rejected'
  wave_transaction_reference: string
  created_at: string
  validated_at: string | null
}

interface InstallationReq {
  id: string
  location: string
  apps: string[] | null
  status: 'pending' | 'done' | 'cancelled'
  paid: boolean | null
  paid_at: string | null
  created_at: string
}

const STATUS_META: Record<
  string,
  { label: string; icon: React.ElementType; badge: string; text: string }
> = {
  pending: {
    label: 'En attente de validation',
    icon: Clock,
    badge: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400',
    text: 'Votre paiement est en cours de verification.',
  },
  approved: {
    label: 'Validee',
    icon: CheckCircle,
    badge: 'border-[#00ff88]/30 bg-[#00ff88]/10 text-[#00ff88]',
    text: 'Votre abonnement a ete active. Bon swap !',
  },
  rejected: {
    label: 'Refusee',
    icon: XCircle,
    badge: 'border-red-500/30 bg-red-500/10 text-red-400',
    text: 'Votre demande a ete refusee. Verifiez vos informations ou contactez le support.',
  },
}

export default function MyRequestsPage() {
  const [requests, setRequests] = useState<MyRequest[]>([])
  const [installs, setInstalls] = useState<InstallationReq[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // id de la demande en cours de redirection vers PayDunya (loader par bouton)
  const [payingId, setPayingId] = useState<string | null>(null)
  const [payError, setPayError] = useState<string | null>(null)

  const load = async () => {
    setRefreshing(true)
    try {
      const [resPay, resInstall] = await Promise.all([
        fetch('/api/subscription/my-requests'),
        fetch('/api/installation-request'),
      ])
      const dataPay = await resPay.json()
      if (resPay.ok) setRequests(dataPay.requests || [])
      else setError(dataPay.error || 'Erreur de chargement')

      const dataInstall = await resInstall.json()
      if (resInstall.ok) setInstalls(dataInstall.requests || [])
    } catch {
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Lance le paiement PayDunya des frais d'installation (8500 FCFA).
  const payInstallation = async (reqId: string) => {
    setPayError(null)
    setPayingId(reqId)
    try {
      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: INSTALL_FEE.id }),
      })
      const data = await res.json()
      if (res.ok && data.success && data.invoice_url) {
        window.location.href = data.invoice_url
        return
      }
      setPayError(data.error || 'Impossible de demarrer le paiement. Reessayez.')
    } catch {
      setPayError('Erreur de connexion. Reessayez.')
    } finally {
      setPayingId(null)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="min-h-screen bg-[#050505] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#00ff88]/15">
              <ReceiptText className="h-6 w-6 text-[#00ff88]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Mes demandes</h1>
              <p className="text-sm text-gray-400">Suivez l&apos;etat de vos paiements</p>
            </div>
          </div>
          <button
            onClick={load}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-xl border border-gray-700 bg-[#111] px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:border-[#00ff88] hover:text-white disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>

        {/* Demandes d'installation a domicile */}
        {!loading && installs.length > 0 && (
          <div className="mb-10">
            <div className="mb-4 flex items-center gap-2">
              <Wrench className="h-5 w-5 text-[#00ff88]" />
              <h2 className="text-lg font-semibold text-white">Mes demandes d&apos;installation</h2>
            </div>

            {payError && (
              <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {payError}
              </div>
            )}

            <div className="flex flex-col gap-4">
              {installs.map((req) => {
                const isPaid = !!req.paid
                const isCancelled = req.status === 'cancelled'
                return (
                  <div key={req.id} className="rounded-2xl border border-gray-800 bg-[#111] p-5">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-white">Installation a domicile</span>
                      {isCancelled ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-400">
                          <XCircle className="h-3.5 w-3.5" />
                          Annulee
                        </span>
                      ) : isPaid ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#00ff88]/30 bg-[#00ff88]/10 px-2.5 py-0.5 text-xs font-medium text-[#00ff88]">
                          <CheckCircle className="h-3.5 w-3.5" />
                          Frais regles
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-0.5 text-xs font-medium text-yellow-400">
                          <Clock className="h-3.5 w-3.5" />
                          Paiement requis
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm text-gray-400 sm:grid-cols-2">
                      <p>
                        <span className="text-gray-500">Lieu :</span> {req.location}
                      </p>
                      <p>
                        <span className="text-gray-500">Frais :</span>{' '}
                        {INSTALL_FEE.price.toLocaleString()} FCFA
                      </p>
                      {req.apps && req.apps.length > 0 && (
                        <p className="sm:col-span-2">
                          <span className="text-gray-500">Apps :</span> {req.apps.join(', ')}
                        </p>
                      )}
                      <p className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(req.created_at).toLocaleString('fr-FR')}
                      </p>
                    </div>

                    {isPaid ? (
                      <p className="mt-3 text-sm text-gray-300">
                        Vos frais d&apos;installation sont regles. Notre equipe va vous contacter pour fixer le rendez-vous.
                      </p>
                    ) : isCancelled ? (
                      <p className="mt-3 text-sm text-gray-300">Cette demande a ete annulee.</p>
                    ) : (
                      <div className="mt-4">
                        <p className="mb-3 text-sm text-gray-300">
                          Pour confirmer votre demande, reglez les frais d&apos;installation de{' '}
                          <span className="font-semibold text-white">
                            {INSTALL_FEE.price.toLocaleString()} FCFA
                          </span>{' '}
                          via PayDunya. Notre equipe vous contactera ensuite.
                        </p>
                        <button
                          onClick={() => payInstallation(req.id)}
                          disabled={payingId !== null}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#00ff88] px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-[#00dd77] disabled:opacity-60"
                        >
                          {payingId === req.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CreditCard className="h-4 w-4" />
                          )}
                          Confirmer ma demande d&apos;installation
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-500">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-400">
            {error}
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-2xl border border-gray-800 bg-[#111] py-16 text-center">
            <p className="text-gray-500">Vous n&apos;avez encore aucune demande de paiement.</p>
            <Link
              href="/dashboard/plans"
              className="mt-4 inline-block rounded-xl bg-[#00ff88] px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[#00dd77]"
            >
              Choisir une formule
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {requests.map((r) => {
              const meta = STATUS_META[r.status] ?? STATUS_META.pending
              const Icon = meta.icon
              const planName = getPlan(r.plan)?.name ?? r.plan
              return (
                <div
                  key={r.id}
                  className="rounded-2xl border border-gray-800 bg-[#111] p-5"
                >
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-white">Formule {planName}</span>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.badge}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {meta.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm text-gray-400 sm:grid-cols-2">
                    <p className="flex items-center gap-1.5">
                      <span className="text-gray-500">Mode :</span>
                      {PAYMENT_METHOD_LOGOS[r.payment_method] && (
                        <span className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-white p-0.5">
                          <img
                            src={PAYMENT_METHOD_LOGOS[r.payment_method] || '/placeholder.svg'}
                            alt=""
                            className="h-full w-full object-contain"
                          />
                        </span>
                      )}
                      {PAYMENT_METHOD_LABELS[r.payment_method] ?? r.payment_method}
                    </p>
                    <p>
                      <span className="text-gray-500">Montant :</span>{' '}
                      {(r.paid_amount ?? r.amount).toLocaleString()} FCFA
                    </p>
                    <p className="break-all">
                      <span className="text-gray-500">Reference :</span>{' '}
                      {r.wave_transaction_reference}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {new Date(r.created_at).toLocaleString('fr-FR')}
                    </p>
                  </div>
                  <p className="mt-3 text-sm text-gray-300">{meta.text}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
