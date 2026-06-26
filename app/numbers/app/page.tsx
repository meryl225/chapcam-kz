'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useNumbers } from '@/components/numbers/numbers-provider'
import { ActivityChart, RevenueChart } from '@/components/numbers/charts'
import { timeAgo } from '@/lib/numbers/data'
import { countryByCode, serviceBySlug } from '@/lib/numbers/catalog'
import { formatXOF, type Activation } from '@/lib/numbers/types'
import {
  Phone,
  MessageSquareText,
  Wallet,
  Globe2,
  ArrowUpRight,
  Plus,
  Inbox,
  Loader2,
  CheckCircle2,
} from 'lucide-react'

const card = 'rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl'

const STATUS_FR: Record<Activation['status'], string> = {
  waiting: 'En attente',
  received: 'Code reçu',
  cancelled: 'Annulée',
  expired: 'Expirée',
}

const STATUS_COLOR: Record<Activation['status'], string> = {
  waiting: 'bg-blue-500/15 text-blue-300',
  received: 'bg-emerald-500/15 text-emerald-400',
  cancelled: 'bg-amber-500/15 text-amber-400',
  expired: 'bg-red-500/15 text-red-400',
}

const DAY = 86400_000
const startOfDay = (ms: number) => {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export default function DashboardPage() {
  const { balanceXof, activations, transactions, unreadCount, loading } = useNumbers()

  const waitingNumbers = activations.filter((a) => a.status === 'waiting')
  const receivedCodes = activations.filter((a) => a.code)

  // Activité réelle (activations + codes reçus) sur 14 jours.
  const activityData = useMemo(() => {
    const today = startOfDay(Date.now())
    const buckets = Array.from({ length: 14 }, (_, i) => {
      const dayMs = today - (13 - i) * DAY
      return {
        day: new Date(dayMs).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }),
        messages: 0,
        orders: 0,
      }
    })
    const idxFor = (ms: number) => 13 - Math.floor((today - startOfDay(ms)) / DAY)
    for (const a of activations) {
      const i = idxFor(a.createdAt)
      if (i >= 0 && i < 14) {
        buckets[i].orders++
        if (a.code) buckets[i].messages++
      }
    }
    return buckets
  }, [activations])

  // Dépenses réelles par mois (achats) sur 12 mois.
  const revenueData = useMemo(() => {
    const base = new Date()
    const buckets = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(base.getFullYear(), base.getMonth() - (11 - i), 1)
      return { key: `${d.getFullYear()}-${d.getMonth()}`, month: d.toLocaleDateString('fr-FR', { month: 'short' }), revenue: 0 }
    })
    for (const t of transactions) {
      if (t.kind !== 'purchase') continue
      const d = new Date(t.createdAt)
      const b = buckets.find((x) => x.key === `${d.getFullYear()}-${d.getMonth()}`)
      if (b) b.revenue += Math.abs(t.amountXof)
    }
    return buckets.map(({ month, revenue }) => ({ month, revenue: Math.round(revenue) }))
  }, [transactions])

  // Répartition réelle par pays.
  const topCountries = useMemo(() => {
    const counts = new Map<string, number>()
    for (const a of activations) counts.set(a.countryCode, (counts.get(a.countryCode) ?? 0) + 1)
    const total = Array.from(counts.values()).reduce((a, b) => a + b, 0)
    if (total === 0) return [] as { code: string; share: number }[]
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([code, count]) => ({ code, share: Math.round((count / total) * 100) }))
  }, [activations])

  const recentCodes = [...receivedCodes].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5)
  const recentActivations = [...activations].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5)

  const stats = [
    {
      label: 'En attente de SMS',
      value: waitingNumbers.length.toString(),
      sub: `${activations.length} activations`,
      icon: Phone,
      href: '/numbers/app/numbers',
    },
    {
      label: 'Codes reçus (24h)',
      value: receivedCodes.filter((a) => Date.now() - a.createdAt < DAY).length.toString(),
      sub: `${unreadCount} non lus`,
      icon: MessageSquareText,
      href: '/numbers/app/messages',
    },
    {
      label: 'Solde du portefeuille',
      value: formatXOF(balanceXof),
      sub: 'Disponible',
      icon: Wallet,
      href: '/numbers/app/wallet',
    },
    {
      label: 'Pays utilisés',
      value: new Set(activations.map((a) => a.countryCode)).size.toString(),
      sub: 'Distincts',
      icon: Globe2,
      href: '/numbers/app/marketplace',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Cartes statistiques */}
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

      {/* Graphiques */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className={`${card} p-5 lg:col-span-2`}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-white">Activité</h2>
              <p className="text-sm text-white/50">Activations et codes reçus des 14 derniers jours</p>
            </div>
          </div>
          <ActivityChart data={activityData} />
        </div>

        <div className={`${card} p-5`}>
          <h2 className="font-semibold text-white">Dépenses</h2>
          <p className="text-sm text-white/50">12 derniers mois (FCFA)</p>
          <div className="mt-4">
            <RevenueChart data={revenueData} />
          </div>
        </div>
      </div>

      {/* Grille basse */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Codes récents */}
        <div className={`${card} p-5 lg:col-span-2`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-white">Codes récents</h2>
            <Link href="/numbers/app/messages" className="text-sm text-blue-400 hover:text-blue-300">
              Tout voir
            </Link>
          </div>
          {recentCodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Inbox className="h-8 w-8 text-white/20" />
              <p className="mt-2 text-sm text-white/50">
                {loading ? 'Chargement...' : 'Aucun code reçu pour le moment'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {recentCodes.map((a) => {
                const c = countryByCode(a.countryCode)
                const svc = serviceBySlug(a.serviceSlug)
                return (
                  <li key={a.id} className="flex items-start gap-3 py-3">
                    <span className="text-lg leading-none">{c?.flag ?? '🌐'}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium text-white">{svc?.label ?? a.serviceLabel}</p>
                        <span className="shrink-0 text-xs text-white/40">{timeAgo(a.createdAt)}</span>
                      </div>
                      <p className="truncate text-sm text-white/55">{a.fullSms ?? `Code : ${a.code}`}</p>
                    </div>
                    <span className="font-mono text-sm font-semibold text-emerald-400">{a.code}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Numéros en attente + pays */}
        <div className="space-y-4">
          <div className={`${card} p-5`}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-white">En attente</h2>
              <Link
                href="/numbers/app/marketplace"
                className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300"
              >
                <Plus className="h-3.5 w-3.5" /> Acheter
              </Link>
            </div>
            {waitingNumbers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Phone className="h-7 w-7 text-white/20" />
                <p className="mt-2 text-sm text-white/50">Aucun numéro en attente</p>
                <Link href="/numbers/app/marketplace" className="mt-1 text-xs text-blue-400 hover:text-blue-300">
                  Acheter un numéro
                </Link>
              </div>
            ) : (
              <ul className="space-y-3">
                {waitingNumbers.slice(0, 4).map((a) => {
                  const c = countryByCode(a.countryCode)
                  const svc = serviceBySlug(a.serviceSlug)
                  return (
                    <li key={a.id} className="flex items-center gap-3">
                      <span className="text-lg leading-none">{c?.flag}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-sm text-white">{a.phone}</p>
                        <p className="truncate text-xs text-white/40">{svc?.label ?? a.serviceLabel}</p>
                      </div>
                      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-amber-400" />
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className={`${card} p-5`}>
            <h2 className="mb-3 font-semibold text-white">Pays principaux</h2>
            {topCountries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-4 text-center">
                <Globe2 className="h-6 w-6 text-white/20" />
                <p className="mt-2 text-xs text-white/50">Aucune donnée pour le moment</p>
              </div>
            ) : (
              <ul className="space-y-2.5">
                {topCountries.map((t) => {
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
            )}
          </div>
        </div>
      </div>

      {/* Activations récentes */}
      <div className={`${card} p-5`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-white">Activations récentes</h2>
          <Link href="/numbers/app/history" className="text-sm text-blue-400 hover:text-blue-300">
            Voir l&apos;historique
          </Link>
        </div>
        {recentActivations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Inbox className="h-8 w-8 text-white/20" />
            <p className="mt-2 text-sm text-white/50">Aucune activation pour le moment</p>
            <Link href="/numbers/app/marketplace" className="mt-1 text-xs text-blue-400 hover:text-blue-300">
              Acheter votre premier numéro
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-white/40">
                  <th className="pb-3 font-medium">Numéro</th>
                  <th className="pb-3 font-medium">Service</th>
                  <th className="pb-3 font-medium">Montant</th>
                  <th className="pb-3 font-medium">Statut</th>
                  <th className="pb-3 text-right font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentActivations.map((a) => {
                  const c = countryByCode(a.countryCode)
                  const svc = serviceBySlug(a.serviceSlug)
                  return (
                    <tr key={a.id} className="text-white/70">
                      <td className="py-3">
                        <span className="flex items-center gap-2">
                          <span>{c?.flag}</span>
                          <span className="font-mono text-white">{a.phone}</span>
                        </span>
                      </td>
                      <td className="py-3">{svc?.label ?? a.serviceLabel}</td>
                      <td className="py-3 text-white">{formatXOF(a.priceXof)}</td>
                      <td className="py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[a.status]}`}>
                          {a.status === 'received' && <CheckCircle2 className="h-3 w-3" />}
                          {STATUS_FR[a.status]}
                        </span>
                      </td>
                      <td className="py-3 text-right text-white/40">{timeAgo(a.createdAt)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
