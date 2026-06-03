'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Shield,
  RefreshCw,
  Search,
  Loader2,
  Battery,
  Users,
  CheckCircle2,
  Clock,
  Wallet,
  ArrowLeft,
} from 'lucide-react'
import Link from 'next/link'

interface CreditedClient {
  id: string
  email: string
  plan: string
  planName: string
  amount: number
  points: number
  maxPoints: number
  active: boolean
  expired: boolean
  startDate: string | null
  expiresAt: string | null
}

interface Stats {
  total: number
  active: number
  expired: number
  totalRevenue: number
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function AdminPaymentsPage() {
  const [clients, setClients] = useState<CreditedClient[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/payments', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erreur de chargement.')
        return
      }
      setClients(data.clients || [])
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
    if (!q) return clients
    return clients.filter(
      (c) => c.email?.toLowerCase().includes(q) || c.planName?.toLowerCase().includes(q),
    )
  }, [clients, search])

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
              <h1 className="text-2xl font-bold text-white">Paiements credites</h1>
              <p className="text-sm text-gray-500">Clients avec abonnement actif et solde de points</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/subscriptions"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[#111] px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:border-[#00ff88] hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Abonnements
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
            <StatCard icon={Users} label="Clients credites" value={stats.total.toString()} color="text-white" />
            <StatCard icon={CheckCircle2} label="Abonnements actifs" value={stats.active.toString()} color="text-[#00ff88]" />
            <StatCard icon={Clock} label="Expires" value={stats.expired.toString()} color="text-yellow-400" />
            <StatCard icon={Wallet} label="Revenu total" value={`${stats.totalRevenue.toLocaleString()} F`} color="text-[#00ff88]" />
          </div>
        )}

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par email ou formule..."
            className="w-full rounded-xl border border-white/10 bg-[#111] py-3 pl-12 pr-4 text-white placeholder-gray-600 outline-none transition-colors focus:border-[#00ff88]"
          />
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm text-red-400">
            {error}
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#00ff88]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#111] py-16 text-center text-gray-500">
            Aucun client credite pour le moment.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((c) => {
              const pct = c.maxPoints > 0 ? Math.round((c.points / c.maxPoints) * 100) : 0
              return (
                <div
                  key={c.id}
                  className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#111] p-5 transition-colors hover:border-white/20 sm:flex-row sm:items-center sm:justify-between"
                >
                  {/* Client + plan */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-semibold text-white">{c.email}</span>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                          c.active
                            ? 'border-[#00ff88]/30 bg-[#00ff88]/15 text-[#00ff88]'
                            : 'border-yellow-500/30 bg-yellow-500/15 text-yellow-400'
                        }`}
                      >
                        {c.active ? 'Actif' : 'Expire'}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      {c.planName} · {c.amount.toLocaleString()} FCFA · expire le {fmtDate(c.expiresAt)}
                    </p>
                  </div>

                  {/* Points balance */}
                  <div className="sm:w-56">
                    <div className="mb-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Battery className="h-4 w-4 text-[#00ff88]" />
                        <span className="text-xs font-medium text-gray-400">Solde points</span>
                      </div>
                      <span className="text-sm font-bold text-white">
                        {c.points.toLocaleString()}/{c.maxPoints.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-[#00ff88] transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-1 text-right text-xs text-gray-600">
                      = {Math.floor(c.points / 2 / 60)} min de swap
                    </p>
                  </div>
                </div>
              )
            })}
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
