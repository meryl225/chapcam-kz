'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { ArrowLeft, HandCoins, Loader2, RefreshCw, Search } from 'lucide-react'
import type { ManualCredit, ManualCreditKind } from '@/app/api/admin/manual-credits/route'

const TABS: { id: 'all' | ManualCreditKind; label: string }[] = [
  { id: 'all', label: 'Tous' },
  { id: 'subscription', label: 'Abonnements' },
  { id: 'geniuspay', label: 'GeniusPay' },
  { id: 'live', label: 'Live' },
  { id: 'voice', label: 'Voice' },
  { id: 'jetons', label: 'Jetons' },
]

type TabId = (typeof TABS)[number]['id']

const KIND_STYLE: Record<ManualCreditKind, { label: string; className: string }> = {
  subscription: { label: 'Abonnement', className: 'border-[#00ff88]/40 bg-[#0d2018] text-[#00ff88]' },
  geniuspay: { label: 'GeniusPay', className: 'border-[#ffb300]/40 bg-[#1a1405] text-[#ffb300]' },
  live: { label: 'Live', className: 'border-[#00d4ff]/40 bg-[#0a1620] text-[#00d4ff]' },
  voice: { label: 'Voice', className: 'border-[#00d4ff]/40 bg-[#0a1620] text-[#00d4ff]' },
  jetons: { label: 'Jetons', className: 'border-gray-700 bg-[#1a1a1a] text-gray-300' },
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Erreur')
  return data as { credits: ManualCredit[] }
}

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export default function AdminManualCreditsPage() {
  const [tab, setTab] = useState<TabId>('all')
  const [query, setQuery] = useState('')
  const { data, error, isLoading, isValidating, mutate } = useSWR('/api/admin/manual-credits', fetcher)

  const credits = useMemo(() => data?.credits ?? [], [data])
  const counts = useMemo(
    () => Object.fromEntries(TABS.map((t) => [t.id, t.id === 'all' ? credits.length : credits.filter((c) => c.kind === t.id).length])) as Record<TabId, number>,
    [credits],
  )
  const uniqueEmails = useMemo(() => new Set(credits.map((c) => c.email).filter(Boolean)).size, [credits])
  const last30Days = useMemo(() => {
    const since = Date.now() - 30 * 86_400_000
    return credits.filter((c) => new Date(c.creditedAt).getTime() >= since).length
  }, [credits])

  const needle = query.trim().toLowerCase()
  const visible = credits.filter((c) => (tab === 'all' || c.kind === tab) && c.email.includes(needle))

  return (
    <div className="min-h-screen bg-[#050505] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/admin/payments"
          className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux paiements
        </Link>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#ffb300]/15">
              <HandCoins className="h-6 w-6 text-[#ffb300]" />
            </div>
            <div>
              <h1 className="text-balance text-2xl font-bold text-white">Crédits manuels</h1>
              <p className="text-pretty text-sm text-gray-400">Tout ce qui a été crédité à la main depuis l’admin.</p>
            </div>
          </div>
          <button
            onClick={() => mutate()}
            disabled={isValidating}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#00ff88] px-4 py-2.5 text-sm font-bold text-black transition-colors hover:bg-[#00dd77] disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>

        {data && (
          <dl className="mb-6 grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-gray-800 bg-[#111] p-4">
              <dt className="text-xs text-gray-500">Crédits</dt>
              <dd className="text-xl font-bold text-[#ffb300]">{counts.all}</dd>
            </div>
            <div className="rounded-2xl border border-gray-800 bg-[#111] p-4">
              <dt className="text-xs text-gray-500">E-mails</dt>
              <dd className="text-xl font-bold text-white">{uniqueEmails}</dd>
            </div>
            <div className="rounded-2xl border border-gray-800 bg-[#111] p-4">
              <dt className="text-xs text-gray-500">30 derniers jours</dt>
              <dd className="text-xl font-bold text-white">{last30Days}</dd>
            </div>
          </dl>
        )}

        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0" role="tablist">
            {TABS.map((item) => (
              <button
                key={item.id}
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => setTab(item.id)}
                className={`min-h-11 shrink-0 rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                  tab === item.id ? 'border-[#ffb300] bg-[#1a1405] text-[#ffb300]' : 'border-gray-800 bg-[#111] text-gray-400 hover:text-white'
                }`}
              >
                {item.label} ({counts[item.id]})
              </button>
            ))}
          </div>
          <label className="flex min-h-11 items-center gap-2 rounded-xl border border-gray-800 bg-[#111] px-3 py-2 md:w-72">
            <Search className="h-4 w-4 text-gray-500" aria-hidden="true" />
            <span className="sr-only">Rechercher un e-mail</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un e-mail"
              className="w-full bg-transparent text-base text-white placeholder:text-gray-500 focus:outline-none md:text-sm"
            />
          </label>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16 text-gray-400">
            <Loader2 className="h-6 w-6 animate-spin" aria-label="Chargement" />
          </div>
        ) : error ? (
          <p className="rounded-2xl border border-red-500/40 bg-[#2a0d0d] p-6 text-sm text-red-400">{error.message}</p>
        ) : visible.length === 0 ? (
          <p className="rounded-2xl border border-gray-800 bg-[#111] p-10 text-center text-sm text-gray-400">Aucun crédit manuel.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {visible.map((credit) => {
              const kind = KIND_STYLE[credit.kind]
              return (
                <li key={credit.id} className="flex flex-col gap-4 rounded-2xl border border-gray-800 bg-[#111] p-5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 flex-1 truncate font-semibold text-white">{credit.email || 'E-mail inconnu'}</p>
                    <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${kind.className}`}>{kind.label}</span>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
                    <div>
                      <dt className="text-xs text-gray-500">Abonnement crédité</dt>
                      <dd className="font-medium text-white">{credit.label}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Détail</dt>
                      <dd className="font-medium text-white">{credit.detail}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Crédité le</dt>
                      <dd className="font-medium text-white">{formatDateTime(credit.creditedAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Expire le</dt>
                      <dd className="font-medium text-white">{formatDate(credit.endDate)}</dd>
                    </div>
                  </dl>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
