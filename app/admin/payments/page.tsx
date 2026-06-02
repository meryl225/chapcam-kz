'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Shield,
  RefreshCw,
  Search,
  Check,
  X,
  ExternalLink,
  Clock,
  Loader2,
  Settings,
  Mail,
  UserPlus,
  Download,
  CheckCircle2,
  AlertTriangle,
  UserX,
} from 'lucide-react'
import Link from 'next/link'
import { PAYMENT_METHOD_LABELS, PAYMENT_METHOD_LOGOS } from '@/lib/payment-methods'

interface PaymentRequest {
  id: string
  full_name: string
  email: string
  phone_number: string
  plan: string
  amount: number
  payment_method: string
  paid_amount: number | null
  paid_at: string | null
  comment: string | null
  wave_transaction_reference: string
  screenshot_url: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  validated_at: string | null
  account?: {
    status: 'credited' | 'not_credited' | 'no_account'
    kind: 'plan' | 'live' | null
    label: string
  }
}

const STATUS_FILTERS = [
  { id: 'pending', label: 'En attente' },
  { id: 'approved', label: 'Valides' },
  { id: 'rejected', label: 'Refuses' },
  { id: '', label: 'Tous' },
]

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  approved: 'bg-[#00ff88]/15 text-[#00ff88] border-[#00ff88]/30',
  rejected: 'bg-red-500/15 text-red-400 border-red-500/30',
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'En attente',
  approved: 'Valide',
  rejected: 'Refuse',
}

const PLAN_DISPLAY: Record<string, string> = {
  live15: 'Live Pro 15 min',
}

export default function AdminPaymentsPage() {
  const [requests, setRequests] = useState<PaymentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('pending')
  const [actioningId, setActioningId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

  const load = useCallback(async () => {
    setRefreshing(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (status) params.set('status', status)
      const res = await fetch(`/api/admin/payments?${params.toString()}`)
      const data = await res.json()
      if (res.ok) setRequests(data.requests || [])
      else setToast({ type: 'err', msg: data.error || 'Erreur de chargement' })
    } catch {
      setToast({ type: 'err', msg: 'Erreur de connexion' })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [search, status])

  useEffect(() => {
    load()
  }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(t)
    }
  }, [toast])

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    let reason: string | undefined
    if (action === 'reject') {
      reason = window.prompt('Motif du refus (facultatif) :') || undefined
    }
    setActioningId(id)
    try {
      const res = await fetch('/api/admin/payments/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, reason }),
      })
      const data = await res.json()
      if (res.ok) {
        setToast({ type: 'ok', msg: data.message || 'Action effectuee' })
        load()
      } else {
        setToast({ type: 'err', msg: data.error || 'Erreur' })
      }
    } catch {
      setToast({ type: 'err', msg: 'Erreur de connexion' })
    } finally {
      setActioningId(null)
    }
  }

  const handleRelink = async (id: string, currentEmail: string) => {
    const newEmail = window.prompt(
      `Corriger l'email et crediter les points.\n\nEmail actuel : ${currentEmail}\n\nSaisissez le bon email (celui du compte ChapCam de l'utilisateur) :`,
      currentEmail,
    )
    if (!newEmail || !newEmail.trim()) return
    setActioningId(id)
    try {
      const res = await fetch('/api/admin/payments/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'relink', newEmail: newEmail.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        setToast({ type: 'ok', msg: data.message || 'Points credites' })
        load()
      } else {
        setToast({ type: 'err', msg: data.error || 'Erreur' })
      }
    } catch {
      setToast({ type: 'err', msg: 'Erreur de connexion' })
    } finally {
      setActioningId(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#00ff88]/15">
              <Shield className="h-6 w-6 text-[#00ff88]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Paiements Wave</h1>
              <p className="text-sm text-gray-400">Validez les demandes d&apos;abonnement</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/installations"
              className="flex items-center gap-2 rounded-xl border border-gray-700 bg-[#111] px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:border-[#3b82f6] hover:text-white"
            >
              <Download className="h-4 w-4" />
              Installations
            </Link>
            <Link
              href="/admin/subscriptions"
              className="flex items-center gap-2 rounded-xl border border-gray-700 bg-[#111] px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:border-[#00ff88] hover:text-white"
            >
              <UserPlus className="h-4 w-4" />
              Ajouter un abonnement
            </Link>
            <Link
              href="/admin/settings"
              className="flex items-center gap-2 rounded-xl border border-gray-700 bg-[#111] px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:border-[#00ff88] hover:text-white"
            >
              <Settings className="h-4 w-4" />
              Liens Wave
            </Link>
            <button
              onClick={load}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-xl bg-[#00ff88] px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[#00dd77] disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
          </div>
        </div>

        {/* Filtres */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              load()
            }}
            className="relative flex-1"
          >
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par email ou numero Wave..."
              className="w-full rounded-xl border border-gray-700 bg-[#111] py-3 pl-10 pr-4 text-white outline-none transition-colors focus:border-[#00ff88]"
            />
          </form>
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.id || 'all'}
                onClick={() => setStatus(f.id)}
                className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                  status === f.id
                    ? 'border-[#00ff88] bg-[#00ff88]/10 text-[#00ff88]'
                    : 'border-gray-700 bg-[#111] text-gray-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Liste */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-500">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-2xl border border-gray-800 bg-[#111] py-16 text-center text-gray-500">
            Aucune demande dans cette categorie.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {requests.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl border border-gray-800 bg-[#111] p-5 transition-colors hover:border-gray-700"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-white">{r.full_name}</span>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[r.status]}`}
                      >
                        {STATUS_LABEL[r.status]}
                      </span>
                      <span className="rounded-full border border-gray-700 bg-[#0a0a0a] px-2.5 py-0.5 text-xs font-medium capitalize text-gray-300">
                        {(PLAN_DISPLAY[r.plan] ?? r.plan)} — {r.amount.toLocaleString()} FCFA
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#00ff88]/30 bg-[#00ff88]/10 py-0.5 pl-1 pr-2.5 text-xs font-medium text-[#00ff88]">
                        {PAYMENT_METHOD_LOGOS[r.payment_method] && (
                          <span className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-white p-0.5">
                            <img
                              src={PAYMENT_METHOD_LOGOS[r.payment_method] || '/placeholder.svg'}
                              alt=""
                              className="h-full w-full object-contain"
                            />
                          </span>
                        )}
                        {PAYMENT_METHOD_LABELS[r.payment_method] ?? r.payment_method ?? 'Wave'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm text-gray-400 sm:grid-cols-2">
                      <p>
                        <span className="text-gray-500">Email :</span> {r.email}
                      </p>
                      <p>
                        <span className="text-gray-500">Numero payeur :</span> {r.phone_number}
                      </p>
                      <p className="break-all">
                        <span className="text-gray-500">Ref :</span>{' '}
                        {r.wave_transaction_reference}
                      </p>
                      <p>
                        <span className="text-gray-500">Montant declare :</span>{' '}
                        {(r.paid_amount ?? r.amount).toLocaleString()} FCFA
                      </p>
                      {r.paid_at && (
                        <p>
                          <span className="text-gray-500">Paye le :</span>{' '}
                          {new Date(r.paid_at).toLocaleString('fr-FR')}
                        </p>
                      )}
                      <p className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(r.created_at).toLocaleString('fr-FR')}
                      </p>
                    </div>
                    {r.account && (
                      <div
                        className={`mt-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${
                          r.account.status === 'credited'
                            ? 'border-[#00ff88]/30 bg-[#00ff88]/10 text-[#00ff88]'
                            : r.account.status === 'not_credited'
                              ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400'
                              : 'border-red-500/30 bg-red-500/10 text-red-400'
                        }`}
                      >
                        {r.account.status === 'credited' ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                        ) : r.account.status === 'not_credited' ? (
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        ) : (
                          <UserX className="mt-0.5 h-4 w-4 shrink-0" />
                        )}
                        <span>
                          {r.account.status === 'credited'
                            ? 'Compte credite — '
                            : r.account.status === 'not_credited'
                              ? 'Non credite — '
                              : ''}
                          {r.account.label}
                        </span>
                      </div>
                    )}
                    {r.comment && (
                      <p className="mt-2 rounded-lg border border-gray-800 bg-[#0a0a0a] px-3 py-2 text-sm text-gray-400">
                        <span className="text-gray-500">Commentaire :</span> {r.comment}
                      </p>
                    )}
                    {r.screenshot_url && (
                      <a
                        href={r.screenshot_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 text-sm text-[#00ff88] hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Voir la capture
                      </a>
                    )}
                  </div>

                  <div className="flex gap-2 lg:flex-col xl:flex-row">
                    {r.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleAction(r.id, 'approve')}
                          disabled={actioningId === r.id}
                          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#00ff88] px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[#00dd77] disabled:opacity-60"
                        >
                          {actioningId === r.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                          Valider
                        </button>
                        <button
                          onClick={() => handleAction(r.id, 'reject')}
                          disabled={actioningId === r.id}
                          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-5 py-2.5 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-60"
                        >
                          <X className="h-4 w-4" />
                          Refuser
                        </button>
                      </>
                    )}
                    {r.status === 'rejected' && (
                      <button
                        onClick={() => {
                          if (
                            window.confirm(
                              `Confirmer que ${r.full_name} (${r.email}) a bien paye ?\n\nCela credite immediatement son compte ChapCam.`,
                            )
                          ) {
                            handleAction(r.id, 'approve')
                          }
                        }}
                        disabled={actioningId === r.id}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#00ff88] px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[#00dd77] disabled:opacity-60"
                      >
                        {actioningId === r.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        Valider et crediter
                      </button>
                    )}
                    <button
                      onClick={() => handleRelink(r.id, r.email)}
                      disabled={actioningId === r.id}
                      className="flex items-center justify-center gap-2 rounded-xl border border-gray-700 bg-[#0a0a0a] px-5 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:border-[#00ff88] hover:text-white disabled:opacity-60"
                      title="Corriger l'email et crediter les points sur le bon compte"
                    >
                      {actioningId === r.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Mail className="h-4 w-4" />
                      )}
                      Corriger l&apos;email
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border px-5 py-3 text-sm font-medium shadow-lg ${
            toast.type === 'ok'
              ? 'border-[#00ff88]/40 bg-[#0a1f15] text-[#00ff88]'
              : 'border-red-500/40 bg-[#1f0a0a] text-red-400'
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  )
}
