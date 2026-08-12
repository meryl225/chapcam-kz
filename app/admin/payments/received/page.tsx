'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Wallet,
  RefreshCw,
  Search,
  Loader2,
  ArrowLeft,
  Receipt,
  CheckCircle2,
  Hash,
  Mail,
  Calendar,
  Layers,
} from 'lucide-react'
import Link from 'next/link'

interface ReceivedPayment {
  id: string
  email: string | null
  productId: string | null
  amount: number
  token: string | null
  transactionId: string | null
  fullName: string | null
  userLinked: boolean
  credited: boolean
  creditKind: string | null
  createdAt: string
  logCount: number
}

interface ReceivedStats {
  totalCount: number
  totalAmount: number
  creditedCount: number
  rawCount: number
}

function fmtDateTime(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export default function ReceivedPaymentsPage() {
  const [payments, setPayments] = useState<ReceivedPayment[]>([])
  const [stats, setStats] = useState<ReceivedStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/payments/received', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erreur de chargement.')
        return
      }
      setPayments(data.payments || [])
      setStats(data.stats || null)
    } catch {
      setError('Erreur de connexion.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return payments
    return payments.filter(
      (p) =>
        p.email?.toLowerCase().includes(q) ||
        p.productId?.toLowerCase().includes(q) ||
        p.token?.toLowerCase().includes(q) ||
        p.transactionId?.toLowerCase().includes(q) ||
        p.fullName?.toLowerCase().includes(q),
    )
  }, [payments, search])

  // Total du sous-ensemble filtre (utile quand on recherche un client precis).
  const filteredTotal = useMemo(
    () => filtered.reduce((sum, p) => sum + p.amount, 0),
    [filtered],
  )

  return (
    <div className="min-h-screen bg-[#050505] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#00ff88]/15">
              <Wallet className="h-6 w-6 text-[#00ff88]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Paiements reçus (réels)</h1>
              <p className="text-sm text-gray-500">
                Transactions PayDunya dédupliquées — chiffre réellement encaissé
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/payments"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[#111] px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:border-[#00ff88] hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Paiements
            </Link>
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl bg-[#00ff88] px-4 py-2.5 text-sm font-bold text-black transition-colors hover:bg-[#00dd77] disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              icon={Wallet}
              label="Total encaissé"
              value={`${stats.totalAmount.toLocaleString('fr-FR')} F`}
              color="text-[#00ff88]"
            />
            <StatCard
              icon={Receipt}
              label="Transactions réelles"
              value={stats.totalCount.toLocaleString('fr-FR')}
              color="text-white"
            />
            <StatCard
              icon={CheckCircle2}
              label="Crédités"
              value={stats.creditedCount.toLocaleString('fr-FR')}
              color="text-[#00d4ff]"
            />
            <StatCard
              icon={Layers}
              label="Lignes brutes fusionnées"
              value={stats.rawCount.toLocaleString('fr-FR')}
              color="text-gray-400"
            />
          </div>
        )}

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par email, nom, produit, token, transaction..."
            className="w-full rounded-xl border border-white/10 bg-[#111] py-3 pl-12 pr-4 text-white placeholder-gray-600 outline-none transition-colors focus:border-[#00ff88]"
          />
        </div>

        {/* Résumé du filtre courant */}
        {!loading && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#0d0d0d] px-4 py-3 text-sm">
            <span className="text-gray-400">
              {search.trim()
                ? `${filtered.length} transaction(s) trouvée(s)`
                : `${filtered.length} transaction(s)`}
            </span>
            <span className="font-bold text-[#00ff88]">
              {filteredTotal.toLocaleString('fr-FR')} FCFA
            </span>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Liste */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#00ff88]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#111] py-16 text-center text-gray-500">
            Aucun paiement reçu.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((p) => (
              <div
                key={p.id}
                className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#111] p-5 transition-colors hover:border-white/20 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 truncate font-semibold text-white">
                      <Mail className="h-4 w-4 shrink-0 text-gray-500" />
                      {p.email || 'Inconnu'}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                        p.credited
                          ? 'border-[#00ff88]/30 bg-[#00ff88]/15 text-[#00ff88]'
                          : 'border-yellow-500/30 bg-yellow-500/15 text-yellow-400'
                      }`}
                    >
                      {p.credited ? 'Crédité' : 'Non crédité'}
                    </span>
                    {p.productId && (
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-medium text-gray-400">
                        {p.productId}
                      </span>
                    )}
                    {p.logCount > 1 && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                        <Layers className="h-3 w-3" />
                        {p.logCount} logs
                      </span>
                    )}
                  </div>

                  {p.fullName && (
                    <p className="mt-1.5 text-sm text-gray-400">{p.fullName}</p>
                  )}

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {fmtDateTime(p.createdAt)}
                    </span>
                    {p.token && (
                      <span className="inline-flex items-center gap-1.5 font-mono">
                        <Hash className="h-3.5 w-3.5" />
                        {p.token}
                      </span>
                    )}
                    {p.transactionId && (
                      <span className="inline-flex items-center gap-1.5 font-mono">
                        <Receipt className="h-3.5 w-3.5" />
                        {p.transactionId}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-lg font-bold text-white">
                    {p.amount.toLocaleString('fr-FR')} F
                  </p>
                  {p.creditKind && (
                    <p className="text-xs text-gray-500">{p.creditKind}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType
  label: string
  value: string
  color: string
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111] p-5">
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4 text-gray-500" />
        <span className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  )
}
