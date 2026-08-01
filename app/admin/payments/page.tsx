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
  Wrench,
  MapPin,
  Phone,
  Receipt,
  AlertTriangle,
  RotateCcw,
  Megaphone,
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

interface Installation {
  id: string
  fullName: string | null
  email: string | null
  phone: string | null
  location: string | null
  status: string | null
  paid: boolean
  paidAt: string | null
  createdAt: string | null
}

interface PaydunyaLog {
  id: string
  source: string
  token: string | null
  transactionId: string | null
  email: string | null
  productId: string | null
  amount: number
  status: string | null
  credited: boolean
  alreadyDone: boolean
  creditKind: string | null
  userLinked: boolean
  failureReason: string | null
  createdAt: string
}

interface Stats {
  total: number
  active: number
  expired: number
  subRevenue: number
  installTotal: number
  installPaid: number
  installRevenue: number
  totalRevenue: number
  paydunyaToday: number
  paydunyaCreditedToday: number
  paydunyaFailed: number
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtDateTime(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AdminPaymentsPage() {
  const [clients, setClients] = useState<CreditedClient[]>([])
  const [installations, setInstallations] = useState<Installation[]>([])
  const [paydunyaLogs, setPaydunyaLogs] = useState<PaydunyaLog[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [tab, setTab] = useState<'abonnements' | 'installations' | 'paydunya'>('abonnements')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [installFilter, setInstallFilter] = useState<'all' | 'paid' | 'pending'>('all')
  const [error, setError] = useState<string | null>(null)
  const [recrediting, setRecrediting] = useState<string | null>(null)

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
      setInstallations(data.installations || [])
      setPaydunyaLogs(data.paydunyaLogs || [])
      setStats(data.stats || null)
    } catch {
      setError('Erreur de connexion.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  const handleRecredit = useCallback(
    async (token: string | null) => {
      if (!token) return
      setRecrediting(token)
      try {
        const res = await fetch('/api/admin/payments/recredit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        await res.json()
        await load(true)
      } catch {
        setError('Re-credit impossible.')
      } finally {
        setRecrediting(null)
      }
    },
    [load],
  )

  useEffect(() => {
    load()
  }, [load])

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return clients
    return clients.filter(
      (c) => c.email?.toLowerCase().includes(q) || c.planName?.toLowerCase().includes(q),
    )
  }, [clients, search])

  const filteredInstalls = useMemo(() => {
    const q = search.trim().toLowerCase()
    return installations.filter((i) => {
      if (installFilter === 'paid' && !i.paid) return false
      if (installFilter === 'pending' && i.paid) return false
      if (!q) return true
      return (
        i.email?.toLowerCase().includes(q) ||
        i.fullName?.toLowerCase().includes(q) ||
        i.phone?.toLowerCase().includes(q) ||
        i.location?.toLowerCase().includes(q)
      )
    })
  }, [installations, search, installFilter])

  const paidInstallsCount = useMemo(() => installations.filter((i) => i.paid).length, [installations])

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return paydunyaLogs
    return paydunyaLogs.filter(
      (l) =>
        l.email?.toLowerCase().includes(q) ||
        l.productId?.toLowerCase().includes(q) ||
        l.token?.toLowerCase().includes(q) ||
        l.transactionId?.toLowerCase().includes(q),
    )
  }, [paydunyaLogs, search])

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
              <h1 className="text-2xl font-bold text-white">Paiements</h1>
              <p className="text-sm text-gray-500">Abonnements credites et demandes d&apos;installation</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/campaign"
              className="inline-flex items-center gap-2 rounded-xl border border-[#00d4ff]/40 bg-[#0d2030] px-4 py-2.5 text-sm font-medium text-[#00d4ff] transition-colors hover:border-[#00d4ff] hover:text-white"
            >
              <Megaphone className="h-4 w-4" />
              Campagnes email
            </Link>
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
            <StatCard icon={Wrench} label="Demandes install." value={`${stats.installPaid}/${stats.installTotal}`} color="text-white" />
            <StatCard icon={Wallet} label="Revenu total" value={`${stats.totalRevenue.toLocaleString()} F`} color="text-[#00ff88]" />
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 flex gap-2">
          <TabButton active={tab === 'abonnements'} onClick={() => setTab('abonnements')}>
            Abonnements ({clients.length})
          </TabButton>
          <TabButton active={tab === 'installations'} onClick={() => setTab('installations')}>
            Installations ({installations.length})
          </TabButton>
          <TabButton active={tab === 'paydunya'} onClick={() => setTab('paydunya')}>
            Paiements PayDunya ({paydunyaLogs.length})
          </TabButton>
        </div>

        {/* Stats PayDunya (onglet dedie) */}
        {tab === 'paydunya' && stats && (
          <div className="mb-6 grid grid-cols-3 gap-4">
            <StatCard icon={Receipt} label="Recus aujourd'hui" value={stats.paydunyaToday.toString()} color="text-white" />
            <StatCard icon={CheckCircle2} label="Credites aujourd'hui" value={stats.paydunyaCreditedToday.toString()} color="text-[#00ff88]" />
            <StatCard icon={AlertTriangle} label="Echecs de credit" value={stats.paydunyaFailed.toString()} color="text-red-400" />
          </div>
        )}

        {/* Sous-filtre Installations : Tous / Payes / En attente */}
        {tab === 'installations' && (
          <div className="mb-4 flex flex-wrap gap-2">
            <SubFilterButton active={installFilter === 'all'} onClick={() => setInstallFilter('all')}>
              Tous ({installations.length})
            </SubFilterButton>
            <SubFilterButton active={installFilter === 'paid'} onClick={() => setInstallFilter('paid')}>
              Payes ({paidInstallsCount})
            </SubFilterButton>
            <SubFilterButton active={installFilter === 'pending'} onClick={() => setInstallFilter('pending')}>
              En attente ({installations.length - paidInstallsCount})
            </SubFilterButton>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              tab === 'abonnements'
                ? 'Rechercher par email ou formule...'
                : tab === 'installations'
                  ? 'Rechercher par nom, email, tel, ville...'
                  : 'Rechercher par email, produit, token...'
            }
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
        ) : tab === 'abonnements' ? (
          filteredClients.length === 0 ? (
            <EmptyState text="Aucun client credite pour le moment." />
          ) : (
            <div className="space-y-3">
              {filteredClients.map((c) => {
                const pct = c.maxPoints > 0 ? Math.round((c.points / c.maxPoints) * 100) : 0
                return (
                  <div
                    key={c.id}
                    className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#111] p-5 transition-colors hover:border-white/20 sm:flex-row sm:items-center sm:justify-between"
                  >
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
                        <div className="h-full rounded-full bg-[#00ff88] transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        ) : tab === 'installations' ? (
          filteredInstalls.length === 0 ? (
          <EmptyState
            text={
              installFilter === 'paid'
                ? 'Aucune installation payee.'
                : installFilter === 'pending'
                  ? 'Aucune demande en attente.'
                  : "Aucune demande d'installation."
            }
          />
        ) : (
          <div className="space-y-3">
            {filteredInstalls.map((i) => (
              <div
                key={i.id}
                className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#111] p-5 transition-colors hover:border-white/20 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-semibold text-white">{i.fullName || i.email || 'Client'}</span>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                        i.paid
                          ? 'border-[#00ff88]/30 bg-[#00ff88]/15 text-[#00ff88]'
                          : 'border-gray-500/30 bg-gray-500/15 text-gray-400'
                      }`}
                    >
                      {i.paid ? 'Paye · 8 500 F' : 'En attente'}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                    {i.email && <span className="truncate">{i.email}</span>}
                    {i.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" />
                        {i.phone}
                      </span>
                    )}
                    {i.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {i.location}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right text-xs text-gray-600">
                  <p>Demande le {fmtDate(i.createdAt)}</p>
                  {i.paid && i.paidAt && <p className="text-[#00ff88]">Paye le {fmtDate(i.paidAt)}</p>}
                </div>
              </div>
            ))}
          </div>
        )
        ) : filteredLogs.length === 0 ? (
          <EmptyState text="Aucun paiement PayDunya enregistre." />
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((l) => {
              const failed = l.status === 'completed' && !l.credited
              return (
                <div
                  key={l.id}
                  className={`flex flex-col gap-3 rounded-2xl border bg-[#111] p-5 transition-colors sm:flex-row sm:items-center sm:justify-between ${
                    failed ? 'border-red-500/40' : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-semibold text-white">{l.email || 'Inconnu'}</span>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                          l.credited
                            ? 'border-[#00ff88]/30 bg-[#00ff88]/15 text-[#00ff88]'
                            : l.status === 'completed'
                              ? 'border-red-500/30 bg-red-500/15 text-red-400'
                              : 'border-gray-500/30 bg-gray-500/15 text-gray-400'
                        }`}
                      >
                        {l.credited ? (l.alreadyDone ? 'Deja credite' : 'Credite') : l.status === 'completed' ? 'Echec credit' : l.status === 'cancelled' ? 'Annule' : 'En attente'}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-medium text-gray-400">
                        {l.source}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      {l.productId || '—'} · {Number(l.amount).toLocaleString()} FCFA
                      {l.creditKind ? ` · ${l.creditKind}` : ''} · {fmtDateTime(l.createdAt)}
                    </p>
                    {failed && l.failureReason && (
                      <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-red-400">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {l.failureReason}
                      </p>
                    )}
                  </div>
                  {failed && (
                    <button
                      onClick={() => handleRecredit(l.token)}
                      disabled={recrediting === l.token}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#00ff88] px-4 py-2.5 text-sm font-bold text-black transition-colors hover:bg-[#00dd77] disabled:opacity-60"
                    >
                      {recrediting === l.token ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCcw className="h-4 w-4" />
                      )}
                      Recrediter
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${
        active ? 'bg-[#00ff88] text-black' : 'border border-white/10 bg-[#111] text-gray-400 hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-white/10 bg-[#111] py-16 text-center text-gray-500">{text}</div>
}

function SubFilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${
        active
          ? 'bg-[#00ff88]/15 text-[#00ff88] ring-1 ring-[#00ff88]/40'
          : 'border border-white/10 bg-[#0d0d0d] text-gray-500 hover:text-white'
      }`}
    >
      {children}
    </button>
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
