'use client'

import Link from 'next/link'
import { useNumbers } from '@/components/numbers/numbers-provider'
import { UsageChart } from '@/components/numbers/usage-chart'
import { getCountry, getProvider, formatPrice, timeAgo } from '@/lib/numbers/data'
import {
  Phone,
  MessageSquareText,
  CreditCard,
  Globe2,
  ArrowRight,
  Plus,
  ShieldCheck,
} from 'lucide-react'

export default function OverviewPage() {
  const { ownedNumbers, messages, unreadCount } = useNumbers()

  const monthlySpend = ownedNumbers.reduce((acc, n) => acc + n.monthlyPrice, 0)
  const countries = new Set(ownedNumbers.map((n) => n.countryCode)).size
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const messagesToday = messages.filter((m) => new Date(m.receivedAt) >= startOfToday).length

  const stats = [
    { icon: Phone, label: 'Active numbers', value: String(ownedNumbers.length), sub: `${countries} countries` },
    { icon: MessageSquareText, label: 'Messages today', value: String(messagesToday), sub: `${unreadCount} unread` },
    { icon: CreditCard, label: 'Monthly spend', value: formatPrice(monthlySpend), sub: 'Across all numbers' },
    { icon: Globe2, label: 'Coverage', value: '150+', sub: 'Countries available' },
  ]

  const recentMessages = messages.slice(0, 5)

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
      {/* header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">Welcome back. Here is what is happening across your numbers.</p>
        </div>
        <Link
          href="/numbers/app/marketplace"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Buy a number
        </Link>
      </div>

      {/* stats */}
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-hairline bg-card p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <s.icon className="h-[18px] w-[18px]" />
            </div>
            <p className="mt-4 text-2xl font-bold tracking-tight text-foreground md:text-3xl">{s.value}</p>
            <p className="mt-1 text-sm font-medium text-foreground">{s.label}</p>
            <p className="text-xs text-muted-foreground">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* chart + numbers */}
      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <UsageChart />
        </div>

        <div className="rounded-2xl border border-hairline bg-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-foreground">Active numbers</h3>
            <Link href="/numbers/app/numbers" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          <ul className="mt-4 space-y-3">
            {ownedNumbers.slice(0, 4).map((n) => {
              const country = getCountry(n.countryCode)
              return (
                <li key={n.id} className="flex items-center gap-3">
                  <span className="text-xl leading-none">{country?.flag}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-sm font-medium text-foreground">{n.number}</p>
                    <p className="truncate text-xs text-muted-foreground">{n.label}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      n.status === 'expiring'
                        ? 'bg-yellow-500/15 text-yellow-500'
                        : 'bg-primary/15 text-primary'
                    }`}
                  >
                    {n.status === 'expiring' ? 'Expiring' : 'Active'}
                  </span>
                </li>
              )
            })}
            {ownedNumbers.length === 0 && (
              <li className="rounded-xl border border-dashed border-hairline p-6 text-center text-sm text-muted-foreground">
                No numbers yet.{' '}
                <Link href="/numbers/app/marketplace" className="font-medium text-primary hover:underline">
                  Buy your first number
                </Link>
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* recent messages */}
      <div className="mt-6 rounded-2xl border border-hairline bg-card">
        <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
          <h3 className="text-base font-semibold text-foreground">Recent messages</h3>
          <Link
            href="/numbers/app/messages"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Open inbox
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <ul className="divide-y divide-hairline">
          {recentMessages.map((m) => {
            const number = ownedNumbers.find((n) => n.id === m.numberId)
            const country = number ? getCountry(number.countryCode) : undefined
            return (
              <li key={m.id} className="flex items-start gap-4 px-6 py-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-foreground">
                  {m.sender.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{m.sender}</span>
                    {!m.read && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                    {m.kind !== 'general' && (
                      <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                        {m.kind}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">{m.body}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    {country?.flag} <span className="font-mono">{number?.number ?? 'Released number'}</span>
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(m.receivedAt)}</span>
              </li>
            )
          })}
        </ul>
      </div>

      {/* reliability note */}
      <div className="mt-6 flex items-center gap-3 rounded-2xl border border-hairline bg-card/40 px-6 py-4 text-sm text-muted-foreground">
        <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
        Numbers are routed across {getProvider('vertex')?.name} and 4 other carriers with automatic failover for
        99.99% delivery reliability.
      </div>
    </div>
  )
}
