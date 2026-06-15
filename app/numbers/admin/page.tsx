'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ADMIN_USERS,
  ADMIN_RISK_EVENTS,
  ADMIN_LOGS,
  PROVIDERS,
  formatUSD,
  timeAgo,
} from '@/lib/numbers/data'
import {
  ShieldAlert,
  Lock,
  Users,
  DollarSign,
  Phone,
  AlertTriangle,
  Activity,
  Search,
  ArrowLeft,
  Ban,
  CheckCircle2,
} from 'lucide-react'

const card = 'rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl'
const PASSCODE = 'chapcam-admin'

const riskColor: Record<string, string> = {
  low: 'bg-emerald-500/15 text-emerald-400',
  medium: 'bg-amber-500/15 text-amber-400',
  high: 'bg-red-500/15 text-red-400',
}

const sevColor: Record<string, string> = {
  low: 'text-white/50',
  medium: 'text-amber-400',
  high: 'text-red-400',
}

const RISK_FR: Record<string, string> = {
  low: 'faible',
  medium: 'moyen',
  high: 'élevé',
}

export default function AdminPage() {
  const [unlocked, setUnlocked] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState(false)
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState(ADMIN_USERS)

  function unlock() {
    if (code === PASSCODE) {
      setUnlocked(true)
      setError(false)
    } else {
      setError(true)
    }
  }

  function toggleStatus(id: string) {
    setUsers((u) =>
      u.map((x) => (x.id === id ? { ...x, status: x.status === 'active' ? 'suspended' : 'active' } : x)),
    )
  }

  if (!unlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070b14] p-4">
        <div className={`${card} w-full max-w-sm p-8 text-center`}>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-400">
            <Lock className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-lg font-semibold text-white">Accès administrateur</h1>
          <p className="mt-1 text-sm text-white/50">Zone restreinte. Saisissez votre code administrateur pour continuer.</p>
          <input
            type="password"
            value={code}
            autoFocus
            onChange={(e) => {
              setCode(e.target.value)
              setError(false)
            }}
            onKeyDown={(e) => e.key === 'Enter' && unlock()}
            placeholder="Code d'accès"
            className={`mt-5 w-full rounded-lg border bg-white/5 px-3 py-2.5 text-center text-sm text-white outline-none ${
              error ? 'border-red-500' : 'border-white/10 focus:border-blue-500'
            }`}
          />
          {error && <p className="mt-2 text-xs text-red-400">Code incorrect. Indice : chapcam-admin</p>}
          <button
            onClick={unlock}
            className="mt-4 w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-500"
          >
            Déverrouiller
          </button>
          <Link href="/numbers/app" className="mt-4 inline-block text-xs text-white/40 hover:text-white">
            Retour à l&apos;application
          </Link>
        </div>
      </div>
    )
  }

  const filteredUsers = users.filter((u) =>
    query ? `${u.name} ${u.email} ${u.id}`.toLowerCase().includes(query.toLowerCase()) : true,
  )

  const totalRevenue = 48230
  const kpis = [
    { label: 'Utilisateurs', value: '12 480', icon: Users, sub: '+184 cette semaine' },
    { label: 'MRR', value: formatUSD(totalRevenue), icon: DollarSign, sub: '+8,2 %' },
    { label: 'Numéros actifs', value: '34 902', icon: Phone, sub: 'dans 150 pays' },
    { label: 'Événements à risque ouverts', value: ADMIN_RISK_EVENTS.length.toString(), icon: AlertTriangle, sub: '2 de gravité élevée' },
  ]

  return (
    <div className="min-h-screen bg-[#070b14] text-white">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#070b14]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-blue-400" />
            <span className="font-semibold">ChapCam Admin</span>
            <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-medium text-red-400">
              Restreint
            </span>
          </div>
          <Link
            href="/numbers/app"
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/70 hover:bg-white/5"
          >
            <ArrowLeft className="h-4 w-4" /> Quitter
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.label} className={`${card} p-5`}>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
                <k.icon className="h-5 w-5" />
              </span>
              <p className="mt-4 text-2xl font-semibold">{k.value}</p>
              <p className="text-sm text-white/50">{k.label}</p>
              <p className="mt-1 text-xs text-white/40">{k.sub}</p>
            </div>
          ))}
        </div>

        {/* Users */}
        <section className={`${card} overflow-hidden`}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 p-5">
            <h2 className="flex items-center gap-2 font-semibold">
              <Users className="h-4 w-4 text-blue-400" /> Gestion des utilisateurs
            </h2>
            <div className="relative max-w-xs flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher des utilisateurs..."
                className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/5 text-xs uppercase tracking-wider text-white/40">
                <tr>
                  <th className="p-4 font-medium">Utilisateur</th>
                  <th className="p-4 font-medium">Forfait</th>
                  <th className="p-4 font-medium">Solde</th>
                  <th className="p-4 font-medium">Numéros</th>
                  <th className="p-4 font-medium">Risque</th>
                  <th className="p-4 font-medium">Statut</th>
                  <th className="p-4 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="text-white/70">
                    <td className="p-4">
                      <p className="font-medium text-white">{u.name}</p>
                      <p className="text-xs text-white/40">{u.email}</p>
                    </td>
                    <td className="p-4">{u.plan}</td>
                    <td className="p-4 text-white">{formatUSD(u.balance)}</td>
                    <td className="p-4">{u.numbers}</td>
                    <td className="p-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${riskColor[u.risk]}`}>
                        {RISK_FR[u.risk]}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          u.status === 'active' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                        }`}
                      >
                        {u.status === 'active' ? 'actif' : 'suspendu'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => toggleStatus(u.id)}
                        className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                          u.status === 'active'
                            ? 'border-white/10 text-white/60 hover:border-red-500/40 hover:text-red-400'
                            : 'border-white/10 text-white/60 hover:border-emerald-500/40 hover:text-emerald-400'
                        }`}
                      >
                        {u.status === 'active' ? (
                          <>
                            <Ban className="h-3.5 w-3.5" /> Suspendre
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" /> Réactiver
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Risk monitoring */}
          <section className={`${card} overflow-hidden`}>
            <div className="border-b border-white/5 p-5">
              <h2 className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4 text-amber-400" /> Surveillance des risques et fraudes
              </h2>
            </div>
            <ul className="divide-y divide-white/5">
              {ADMIN_RISK_EVENTS.map((e) => (
                <li key={e.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-white">{e.type}</p>
                    <span className={`text-xs font-medium ${sevColor[e.severity]}`}>{RISK_FR[e.severity]}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-white/55">{e.detail}</p>
                  <p className="mt-1 text-xs text-white/40">
                    {e.user} · {timeAgo(e.at)}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          {/* Provider health + audit logs */}
          <div className="space-y-4">
            <section className={`${card} p-5`}>
              <h2 className="mb-3 flex items-center gap-2 font-semibold">
                <Activity className="h-4 w-4 text-blue-400" /> État des opérateurs
              </h2>
              <ul className="space-y-2.5">
                {PROVIDERS.map((p) => (
                  <li key={p.id}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-white/70">{p.name}</span>
                      <span className={p.reliability >= 98 ? 'text-emerald-400' : 'text-amber-400'}>
                        {p.reliability}%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                      <div
                        className={`h-full rounded-full ${p.reliability >= 98 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                        style={{ width: `${p.reliability}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className={`${card} p-5`}>
              <h2 className="mb-3 font-semibold">Journal d&apos;audit</h2>
              <ul className="space-y-3">
                {ADMIN_LOGS.map((l) => (
                  <li key={l.id} className="flex items-start gap-3 text-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                    <div>
                      <p className="text-white/80">{l.action}</p>
                      <p className="text-xs text-white/40">
                        {l.actor} · {timeAgo(l.at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
