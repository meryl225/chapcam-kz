'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Download,
  RefreshCw,
  Search,
  Check,
  X,
  Clock,
  Loader2,
  MapPin,
  Phone,
  Mail,
  Smartphone,
  ArrowLeft,
} from 'lucide-react'
import Link from 'next/link'

interface InstallationRequest {
  id: string
  user_id: string | null
  email: string | null
  full_name: string | null
  phone: string
  location: string
  apps: string[]
  note: string | null
  status: 'pending' | 'done' | 'cancelled'
  created_at: string
}

const STATUS_FILTERS = [
  { id: 'pending', label: 'En attente' },
  { id: 'done', label: 'Installees' },
  { id: 'cancelled', label: 'Annulees' },
  { id: '', label: 'Toutes' },
]

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  done: 'bg-[#00ff88]/15 text-[#00ff88] border-[#00ff88]/30',
  cancelled: 'bg-red-500/15 text-red-400 border-red-500/30',
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'En attente',
  done: 'Installee',
  cancelled: 'Annulee',
}

export default function AdminInstallationsPage() {
  const [requests, setRequests] = useState<InstallationRequest[]>([])
  const [counts, setCounts] = useState<{ total: number; pending: number; done: number; cancelled: number } | null>(null)
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
      const res = await fetch(`/api/admin/installations?${params.toString()}`)
      const data = await res.json()
      if (res.ok) {
        setRequests(data.requests || [])
        if (data.counts) setCounts(data.counts)
      } else setToast({ type: 'err', msg: data.error || 'Erreur de chargement' })
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

  const handleAction = async (id: string, newStatus: 'done' | 'cancelled' | 'pending') => {
    setActioningId(id)
    try {
      const res = await fetch('/api/admin/installations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      })
      const data = await res.json()
      if (res.ok) {
        setToast({ type: 'ok', msg: data.message || 'Statut mis a jour' })
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
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2563eb]/15">
              <Download className="h-6 w-6 text-[#3b82f6]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Demandes d&apos;installation</h1>
              <p className="text-sm text-gray-400">
                Installez ChapCam chez vos clients (WhatsApp, Telegram, Teams...)
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/payments"
              className="flex items-center gap-2 rounded-xl border border-gray-700 bg-[#111] px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:border-[#00ff88] hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Paiements
            </Link>
            <Link
              href="/admin/email"
              className="flex items-center gap-2 rounded-xl border border-gray-700 bg-[#111] px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:border-[#00ff88] hover:text-white"
            >
              <Mail className="h-4 w-4" />
              Email aux inscrits
            </Link>
            <button
              onClick={load}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1d4ed8] disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
          </div>
        </div>

        {/* Compteurs */}
        {counts && (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-gray-800 bg-[#111] p-4">
              <p className="text-2xl font-bold text-white">{counts.total}</p>
              <p className="text-xs text-gray-400">Demandes au total</p>
            </div>
            <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-4">
              <p className="text-2xl font-bold text-yellow-400">{counts.pending}</p>
              <p className="text-xs text-gray-400">En attente</p>
            </div>
            <div className="rounded-2xl border border-[#00ff88]/30 bg-[#00ff88]/5 p-4">
              <p className="text-2xl font-bold text-[#00ff88]">{counts.done}</p>
              <p className="text-xs text-gray-400">Installees</p>
            </div>
            <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
              <p className="text-2xl font-bold text-red-400">{counts.cancelled}</p>
              <p className="text-xs text-gray-400">Annulees</p>
            </div>
          </div>
        )}

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
              placeholder="Rechercher par email, numero ou lieu..."
              className="w-full rounded-xl border border-gray-700 bg-[#111] py-3 pl-10 pr-4 text-white outline-none transition-colors focus:border-[#3b82f6]"
            />
          </form>
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.id || 'all'}
                onClick={() => setStatus(f.id)}
                className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                  status === f.id
                    ? 'border-[#3b82f6] bg-[#2563eb]/10 text-[#3b82f6]'
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
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-white">
                        {r.full_name || r.email || 'Client'}
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[r.status]}`}
                      >
                        {STATUS_LABEL[r.status]}
                      </span>
                    </div>

                    {/* Apps demandees */}
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {r.apps.map((app) => (
                        <span
                          key={app}
                          className="inline-flex items-center gap-1.5 rounded-full border border-[#3b82f6]/30 bg-[#2563eb]/10 px-2.5 py-0.5 text-xs font-medium text-[#3b82f6]"
                        >
                          <Smartphone className="h-3 w-3" />
                          {app}
                        </span>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm text-gray-400 sm:grid-cols-2">
                      <p className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-gray-500" />
                        <span className="font-medium text-white">{r.phone}</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-gray-500" />
                        {r.location}
                      </p>
                      {r.email && (
                        <p className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-gray-500" />
                          {r.email}
                        </p>
                      )}
                      <p className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-gray-500" />
                        {new Date(r.created_at).toLocaleString('fr-FR')}
                      </p>
                    </div>

                    {r.note && (
                      <p className="mt-3 rounded-lg border border-gray-800 bg-[#0a0a0a] px-3 py-2 text-sm text-gray-400">
                        <span className="text-gray-500">Note :</span> {r.note}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 lg:flex-col xl:flex-row">
                    {r.status !== 'done' && (
                      <button
                        onClick={() => handleAction(r.id, 'done')}
                        disabled={actioningId === r.id}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#00ff88] px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[#00dd77] disabled:opacity-60"
                      >
                        {actioningId === r.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        Installee
                      </button>
                    )}
                    {r.status !== 'cancelled' && (
                      <button
                        onClick={() => handleAction(r.id, 'cancelled')}
                        disabled={actioningId === r.id}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-5 py-2.5 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-60"
                      >
                        <X className="h-4 w-4" />
                        Annuler
                      </button>
                    )}
                    {r.status !== 'pending' && (
                      <button
                        onClick={() => handleAction(r.id, 'pending')}
                        disabled={actioningId === r.id}
                        className="flex items-center justify-center gap-2 rounded-xl border border-gray-700 bg-[#0a0a0a] px-5 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:border-[#3b82f6] hover:text-white disabled:opacity-60"
                      >
                        <Clock className="h-4 w-4" />
                        En attente
                      </button>
                    )}
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
