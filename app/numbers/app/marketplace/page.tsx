'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useNumbers } from '@/components/numbers/numbers-provider'
import {
  AVAILABLE_NUMBERS,
  COUNTRIES,
  getCountry,
  getProvider,
  capabilityLabel,
  formatPrice,
  type AvailableNumber,
  type NumberType,
  type Capability,
} from '@/lib/numbers/data'
import { cn } from '@/lib/utils'
import {
  Search,
  Check,
  X,
  MessageSquare,
  Phone as PhoneIcon,
  Image as ImageIcon,
  Signal,
  ShoppingCart,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react'

const TYPE_FILTERS: { value: NumberType | 'all'; label: string }[] = [
  { value: 'all', label: 'All types' },
  { value: 'temporary', label: 'Temporary' },
  { value: 'long-term', label: 'Long-term' },
]

const CAP_ICON: Record<Capability, typeof MessageSquare> = {
  sms: MessageSquare,
  voice: PhoneIcon,
  mms: ImageIcon,
}

export default function MarketplacePage() {
  const { buyNumber } = useNumbers()
  const [country, setCountry] = useState<string>('all')
  const [type, setType] = useState<NumberType | 'all'>('all')
  const [cap, setCap] = useState<Capability | 'all'>('all')
  const [query, setQuery] = useState('')

  const [selected, setSelected] = useState<AvailableNumber | null>(null)
  const [label, setLabel] = useState('')
  const [purchased, setPurchased] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return AVAILABLE_NUMBERS.filter((n) => {
      if (country !== 'all' && n.countryCode !== country) return false
      if (type !== 'all' && n.type !== type) return false
      if (cap !== 'all' && !n.capabilities.includes(cap)) return false
      if (query && !n.number.replace(/\s/g, '').includes(query.replace(/\s/g, ''))) return false
      return true
    })
  }, [country, type, cap, query])

  function openBuy(n: AvailableNumber) {
    setSelected(n)
    setLabel('')
    setPurchased(null)
  }

  function confirmBuy() {
    if (!selected) return
    buyNumber(selected, label)
    setPurchased(selected.number)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Marketplace</h1>
        <p className="text-sm text-muted-foreground">
          Browse available virtual numbers across {COUNTRIES.length} countries and multiple carriers.
        </p>
      </div>

      {/* filters */}
      <div className="mt-8 space-y-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by number…"
            className="w-full rounded-xl border border-hairline bg-card py-3 pl-10 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {TYPE_FILTERS.map((t) => (
            <button
              key={t.value}
              onClick={() => setType(t.value)}
              className={cn(
                'rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors',
                type === t.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-hairline text-muted-foreground hover:text-foreground',
              )}
            >
              {t.label}
            </button>
          ))}
          <span className="mx-1 h-6 w-px bg-hairline" />
          {(['all', 'sms', 'voice', 'mms'] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCap(c)}
              className={cn(
                'rounded-lg border px-3.5 py-2 text-sm font-medium capitalize transition-colors',
                cap === c
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-hairline text-muted-foreground hover:text-foreground',
              )}
            >
              {c === 'all' ? 'All capabilities' : capabilityLabel(c as Capability)}
            </button>
          ))}
        </div>

        {/* country chips */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCountry('all')}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
              country === 'all'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-hairline text-muted-foreground hover:text-foreground',
            )}
          >
            All countries
          </button>
          {COUNTRIES.map((c) => (
            <button
              key={c.code}
              onClick={() => setCountry(c.code)}
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                country === c.code
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-hairline text-muted-foreground hover:text-foreground',
              )}
            >
              <span>{c.flag}</span>
              {c.code}
            </button>
          ))}
        </div>
      </div>

      {/* results */}
      <p className="mt-6 text-sm text-muted-foreground">{filtered.length} numbers available</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((n) => {
          const c = getCountry(n.countryCode)
          const provider = getProvider(n.providerId)
          return (
            <div
              key={n.id}
              className="flex flex-col rounded-2xl border border-hairline bg-card p-5 transition-colors hover:border-primary/30"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl leading-none">{c?.flag}</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{c?.name}</p>
                    <p className="text-xs text-muted-foreground">{n.region}</p>
                  </div>
                </div>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize',
                    n.type === 'temporary' ? 'bg-secondary text-foreground' : 'bg-primary/15 text-primary',
                  )}
                >
                  {n.type}
                </span>
              </div>

              <p className="mt-4 font-mono text-lg font-semibold tracking-tight text-foreground">{n.number}</p>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {n.capabilities.map((cap) => {
                  const Icon = CAP_ICON[cap]
                  return (
                    <span
                      key={cap}
                      className="inline-flex items-center gap-1 rounded-md border border-hairline px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                    >
                      <Icon className="h-3 w-3" />
                      {capabilityLabel(cap)}
                    </span>
                  )
                })}
              </div>

              <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Signal className="h-3.5 w-3.5 text-primary" />
                {provider?.name} · {provider?.reliability}% uptime
              </div>

              <div className="mt-5 flex items-end justify-between border-t border-hairline pt-4">
                <div>
                  <p className="text-lg font-bold text-foreground">
                    {formatPrice(n.monthlyPrice)}
                    <span className="text-xs font-normal text-muted-foreground">/mo</span>
                  </p>
                  {n.setupPrice > 0 && (
                    <p className="text-[11px] text-muted-foreground">+ {formatPrice(n.setupPrice)} setup</p>
                  )}
                </div>
                <button
                  onClick={() => openBuy(n)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Buy
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-hairline p-12 text-center">
          <p className="text-sm text-muted-foreground">No numbers match your filters. Try widening your search.</p>
        </div>
      )}

      {/* buy modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-md rounded-2xl border border-hairline bg-card p-6 shadow-2xl">
            <button
              onClick={() => setSelected(null)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            {!purchased ? (
              <>
                <h2 className="text-lg font-semibold text-foreground">Confirm purchase</h2>
                <p className="mt-1 text-sm text-muted-foreground">Activate this number on your account instantly.</p>

                <div className="mt-5 rounded-xl border border-hairline bg-background/50 p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl leading-none">{getCountry(selected.countryCode)?.flag}</span>
                    <span className="font-mono text-base font-semibold text-foreground">{selected.number}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Monthly</span>
                    <span className="font-medium text-foreground">{formatPrice(selected.monthlyPrice)}</span>
                  </div>
                  {selected.setupPrice > 0 && (
                    <div className="mt-1 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">One-time setup</span>
                      <span className="font-medium text-foreground">{formatPrice(selected.setupPrice)}</span>
                    </div>
                  )}
                  <div className="mt-3 flex items-center justify-between border-t border-hairline pt-3 text-sm">
                    <span className="font-medium text-foreground">Due today</span>
                    <span className="text-lg font-bold text-foreground">
                      {formatPrice(selected.monthlyPrice + selected.setupPrice)}
                    </span>
                  </div>
                </div>

                <label className="mt-4 block">
                  <span className="text-sm font-medium text-foreground">Label (optional)</span>
                  <input
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="e.g. Production — Auth OTP"
                    className="mt-1.5 w-full rounded-lg border border-hairline bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50"
                  />
                </label>

                <button
                  onClick={confirmBuy}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <Check className="h-4 w-4" />
                  Confirm and activate
                </button>
              </>
            ) : (
              <div className="py-4 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <h2 className="mt-4 text-lg font-semibold text-foreground">Number activated</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  <span className="font-mono text-foreground">{purchased}</span> is ready to receive messages.
                </p>
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setSelected(null)}
                    className="flex-1 rounded-xl border border-hairline px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-primary/40"
                  >
                    Keep browsing
                  </button>
                  <Link
                    href="/numbers/app/numbers"
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    My Numbers
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
