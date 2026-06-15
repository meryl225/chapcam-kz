'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useNumbers } from '@/components/numbers/numbers-provider'
import {
  getCountry,
  getProvider,
  capabilityLabel,
  formatPrice,
  formatDate,
  type OwnedNumber,
} from '@/lib/numbers/data'
import { cn } from '@/lib/utils'
import {
  Copy,
  Check,
  Trash2,
  Plus,
  Pencil,
  Signal,
  Calendar,
  X,
  AlertTriangle,
} from 'lucide-react'

function NumberCard({ n }: { n: OwnedNumber }) {
  const { toggleAutoRenew, relabel, releaseNumber, messages } = useNumbers()
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(n.label)
  const [confirmRelease, setConfirmRelease] = useState(false)

  const country = getCountry(n.countryCode)
  const provider = getProvider(n.providerId)
  const msgCount = messages.filter((m) => m.numberId === n.id).length

  function copy() {
    navigator.clipboard?.writeText(n.number.replace(/\s/g, ''))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function saveLabel() {
    relabel(n.id, draft.trim() || n.label)
    setEditing(false)
  }

  return (
    <div className="rounded-2xl border border-hairline bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl leading-none">{country?.flag}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-mono text-lg font-semibold tracking-tight text-foreground">{n.number}</p>
              <button
                onClick={copy}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                aria-label="Copy number"
              >
                {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>

            {editing ? (
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && saveLabel()}
                  className="rounded-md border border-hairline bg-background px-2 py-1 text-sm text-foreground outline-none focus:border-primary/50"
                />
                <button onClick={saveLabel} className="text-sm font-medium text-primary hover:underline">
                  Save
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setDraft(n.label)
                  setEditing(true)
                }}
                className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {n.label}
                <Pencil className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        <span
          className={cn(
            'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize',
            n.status === 'expiring' ? 'bg-yellow-500/15 text-yellow-500' : 'bg-primary/15 text-primary',
          )}
        >
          {n.status}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {n.capabilities.map((c) => (
          <span key={c} className="rounded-md border border-hairline px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {capabilityLabel(c)}
          </span>
        ))}
        <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium capitalize text-foreground">
          {n.type}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-y-2.5 text-sm">
        <dt className="flex items-center gap-1.5 text-muted-foreground">
          <Signal className="h-3.5 w-3.5" /> Carrier
        </dt>
        <dd className="text-right font-medium text-foreground">{provider?.name}</dd>
        <dt className="flex items-center gap-1.5 text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" /> Renews
        </dt>
        <dd className="text-right font-medium text-foreground">{formatDate(n.renewsAt)}</dd>
        <dt className="text-muted-foreground">Messages</dt>
        <dd className="text-right font-medium text-foreground">{msgCount}</dd>
        <dt className="text-muted-foreground">Price</dt>
        <dd className="text-right font-medium text-foreground">{formatPrice(n.monthlyPrice)}/mo</dd>
      </dl>

      <div className="mt-4 flex items-center justify-between border-t border-hairline pt-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
          <button
            role="switch"
            aria-checked={n.autoRenew}
            onClick={() => toggleAutoRenew(n.id)}
            className={cn(
              'relative h-5 w-9 rounded-full transition-colors',
              n.autoRenew ? 'bg-primary' : 'bg-secondary',
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform',
                n.autoRenew ? 'translate-x-4' : 'translate-x-0.5',
              )}
            />
          </button>
          Auto-renew
        </label>

        <button
          onClick={() => setConfirmRelease(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-hairline px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Release
        </button>
      </div>

      {confirmRelease && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmRelease(false)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-hairline bg-card p-6 shadow-2xl">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-destructive/15 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-foreground">Release this number?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-mono text-foreground">{n.number}</span> will stop receiving messages and its
              history will be removed. This cannot be undone.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setConfirmRelease(false)}
                className="flex-1 rounded-xl border border-hairline px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-primary/40"
              >
                Cancel
              </button>
              <button
                onClick={() => releaseNumber(n.id)}
                className="flex-1 rounded-xl bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90"
              >
                Release
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function MyNumbersPage() {
  const { ownedNumbers } = useNumbers()

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">My Numbers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {ownedNumbers.length} active {ownedNumbers.length === 1 ? 'number' : 'numbers'} on your account.
          </p>
        </div>
        <Link
          href="/numbers/app/marketplace"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Buy a number
        </Link>
      </div>

      {ownedNumbers.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-hairline p-12 text-center">
          <p className="text-sm text-muted-foreground">You have no active numbers.</p>
          <Link
            href="/numbers/app/marketplace"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            Browse the marketplace
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ownedNumbers.map((n) => (
            <NumberCard key={n.id} n={n} />
          ))}
        </div>
      )}
    </div>
  )
}
