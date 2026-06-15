'use client'

import Link from 'next/link'
import { useNumbers } from '@/components/numbers/numbers-provider'
import { ActivityChart, RevenueChart } from '@/components/numbers/charts'
import {
  countryByCode,
  providerById,
  formatUSD,
  timeAgo,
  timeLeft,
  DAILY_ACTIVITY,
  REVENUE_SERIES,
  TOP_COUNTRIES,
} from '@/lib/numbers/data'
import {
  Phone,
  MessageSquareText,
  Wallet,
  Globe2,
  ArrowUpRight,
  TrendingUp,
  Plus,
  Inbox,
} from 'lucide-react'

const card =
  'rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl'

const ORDER_STATUS_FR: Record<string, string> = {
  completed: 'Terminée',
  active: 'Active',
  refunded: 'Remboursée',
  failed: 'Échouée',
  pending: 'En attente',
}

export default function DashboardPage() {
  const { balance, owned, messages, orders, unreadCount } = useNumbers()

  const activeNumbers = owned.filter((n) => n.status !== 'expired')
  const recentMessages = [...messages]
    .filter((m) => !m.archived)
    .sort((a, b) => b.receivedAt - a.receivedAt)
    .slice(0, 5)
  const recentOrders = [...orders].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5)

  const stats = [
    {
      label: 'Numéros actifs',
      value: activeNumbers.length.toString(),
      sub: `${owned.length} au total`,
      icon: Phone,
      href: '/numbers/app/numbers',
    },
    {
      label: 'Messages (24h)',
      value: messages.filter((m) => Date.now() - m.receivedAt < 86400_000).length.toString(),
      sub: `${unreadCount} non lus`,
      icon: MessageSquareText,
      href: '/numbers/app/messages',
    },
    {
      label: 'Solde du portefeuille',
      value: formatUSD(balance),
      sub: 'Disponible',
      icon: Wallet,
      href: '/numbers/app/wallet',
    },
    {
      label: 'Pays',
      value: new Set(activeNumbers.map((n) => n.countryCode)).size.toString(),
      sub: 'Utilisés',
      icon: Globe2,
      href: '/numbers/app/marketplace',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className={`${card} group p-5 transition-colors hover:border-blue-500/40`}
          >
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
                <s.icon className="h-5 w-5" />
              </span>
              <ArrowUpRight className="h-4 w-4 text-white/30 transition-colors group-hover:text-blue-400" />
            </div>
            <p className="mt-4 text-2xl font-semibold text-white">{s.value}</p>
            <div className="mt-1 flex items-center justify-between">
              <p className="text-sm text-white/50">{s.label}</p>
              <p className="text-xs text-white/40">{s.sub}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className={`${card} p-5 lg:col-span-2`}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-white">Activité</h2>
              <p className="text-sm text-white/50">Messages et commandes des 14 derniers jours</p>
            </div>
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-400">
              <TrendingUp className="h-3.5 w-3.5" /> +18%
            </span>
          </div>
          <ActivityChart data={DAILY_ACTIVITY} />
        </div>

        <div className={`${card} p-5`}>
          <h2 className="font-semibold text-white">Dépenses</h2>
          <p className="text-sm text-white/50">12 derniers mois</p>
          <div className="mt-4">
            <RevenueChart data={REVENUE_SERIES} />
          </div>
        </div>
      </div>

      {/* Lower grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Recent messages */}
        <div className={`${card} p-5 lg:col-span-2`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-white">Messages récents</h2>
            <Link href="/numbers/app/messages" className="text-sm text-blue-400 hover:text-blue-300">
              Tout voir
            </Link>
          </div>
          {recentMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Inbox className="h-8 w-8 text-white/20" />
              <p className="mt-2 text-sm text-white/50">Aucun message pour le moment</p>
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {recentMessages.map((m) => {
                const num = owned.find((n) => n.id === m.numberId)
                const c = num ? countryByCode(num.countryCode) : undefined
                return (
                  <li key={m.id} className="flex items-start gap-3 py-3">
                    <span className="text-lg leading-none">{c?.flag ?? '🌐'}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium text-white">{m.sender}</p>
                        <span className="shrink-0 text-xs text-white/40">{timeAgo(m.receivedAt)}</span>
                      </div>
                      <p className="truncate text-sm text-white/55">{m.body}</p>
                    </div>
                    {!m.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Active numbers + top countries */}
        <div className="space-y-4">
          <div className={`${card} p-5`}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-white">Numéros actifs</h2>
              <Link
                href="/numbers/app/marketplace"
                className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300"
              >
                <Plus className="h-3.5 w-3.5" /> Acheter
              </Link>
            </div>
            <ul className="space-y-3">
              {activeNumbers.slice(0, 4).map((n) => {
                const c = countryByCode(n.countryCode)
                const p = providerById(n.providerId)
                return (
                  <li key={n.id} className="flex items-center gap-3">
                    <span className="text-lg leading-none">{c?.flag}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-sm text-white">{n.e164}</p>
                      <p className="truncate text-xs text-white/40">{p?.name}</p>
                    </div>
                    <span className="shrink-0 text-xs text-white/40">{timeLeft(n.expiresAt)}</span>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className={`${card} p-5`}>
            <h2 className="mb-3 font-semibold text-white">Pays principaux</h2>
            <ul className="space-y-2.5">
              {TOP_COUNTRIES.map((t) => {
                const c = countryByCode(t.code)
                return (
                  <li key={t.code}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-white/70">
                        <span>{c?.flag}</span>
                        {c?.name}
                      </span>
                      <span className="text-white/40">{t.share}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                      <div className="h-full rounded-full bg-blue-500" style={{ width: `${t.share}%` }} />
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </div>

      {/* Recent orders */}
      <div className={`${card} p-5`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-white">Commandes récentes</h2>
          <Link href="/numbers/app/history" className="text-sm text-blue-400 hover:text-blue-300">
            Voir l&apos;historique
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-white/40">
                <th className="pb-3 font-medium">Numéro</th>
                <th className="pb-3 font-medium">Opérateur</th>
                <th className="pb-3 font-medium">Montant</th>
                <th className="pb-3 font-medium">Statut</th>
                <th className="pb-3 text-right font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {recentOrders.map((o) => {
                const c = countryByCode(o.countryCode)
                const p = providerById(o.providerId)
                const statusColor =
                  o.status === 'completed' || o.status === 'active'
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : o.status === 'refunded'
                      ? 'bg-amber-500/15 text-amber-400'
                      : 'bg-red-500/15 text-red-400'
                return (
                  <tr key={o.id} className="text-white/70">
                    <td className="py-3">
                      <span className="flex items-center gap-2">
                        <span>{c?.flag}</span>
                        <span className="font-mono text-white">{o.e164}</span>
                      </span>
                    </td>
                    <td className="py-3">{p?.name}</td>
                    <td className="py-3 text-white">{formatUSD(o.amount)}</td>
                    <td className="py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor}`}>
                        {ORDER_STATUS_FR[o.status] ?? o.status}
                      </span>
                    </td>
                    <td className="py-3 text-right text-white/40">{timeAgo(o.createdAt)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
