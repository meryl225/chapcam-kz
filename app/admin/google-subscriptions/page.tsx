'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { AlertCircle, ArrowLeft, Check, FlaskConical, Loader2, Play, RefreshCw, Search } from 'lucide-react'

type GoogleAccount = {
  email: string
  userId: string | null
  plan: string | null
  planName: string
  state: 'active' | 'expired' | 'revoked'
  likelyTest: boolean
  expiresAt: string | null
  lastOrderId: string | null
  lastPurchaseAt: string
  purchases: number
  totalAmount: number
}

const TABS = [
  { id: 'all', label: 'Tous' },
  { id: 'active', label: 'Actifs' },
  { id: 'expired', label: 'Expirés' },
  { id: 'revoked', label: 'Remboursés' },
  { id: 'test', label: 'Tests' },
] as const

type TabId = (typeof TABS)[number]['id']

const STATE_STYLE: Record<GoogleAccount['state'], { label: string; className: string }> = {
  active: { label: 'Actif', className: 'border-[#00ff88]/40 bg-[#0d2018] text-[#00ff88]' },
  expired: { label: 'Expiré', className: 'border-gray-700 bg-[#1a1a1a] text-gray-400' },
  revoked: { label: 'Remboursé', className: 'border-red-500/40 bg-[#2a0d0d] text-red-400' },
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Erreur')
  return data as { accounts: GoogleAccount[] }
}

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const formatAmount = (value: number) => `${value.toLocaleString('fr-FR')} FCFA`

const matchesTab = (account: GoogleAccount, tab: TabId) =>
  tab === 'all' || (tab === 'test' ? account.likelyTest : account.state === tab)

export default function AdminGoogleSubscriptionsPage() {
  const [tab, setTab] = useState<TabId>('all')
  const [query, setQuery] = useState('')
  const [busyEmail, setBusyEmail] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)
  const { data, error, isLoading, isValidating, mutate } = useSWR('/api/admin/google-subscriptions', fetcher)

  const accounts = useMemo(() => data?.accounts ?? [], [data])
  const counts = useMemo(
    () => Object.fromEntries(TABS.map((t) => [t.id, accounts.filter((a) => matchesTab(a, t.id)).length])) as Record<TabId, number>,
    [accounts],
  )
  const realRevenue = useMemo(
    () => accounts.filter((a) => !a.likelyTest && a.state !== 'revoked').reduce((sum, a) => sum + a.totalAmount, 0),
    [accounts],
  )
  const visible = accounts.filter((a) => matchesTab(a, tab) && a.email.includes(query.trim().toLowerCase()))

  const verify = async (email: string) => {
    setBusyEmail(email)
    setToast(null)
    try {
      const res = await fetch('/api/admin/google-subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const body = await res.json()
      setToast(res.ok ? { type: 'ok', msg: `${email} : ${body.message}` } : { type: 'err', msg: body.error || 'Erreur' })
      await mutate()
    } catch {
      setToast({ type: 'err', msg: 'Erreur de connexion' })
    } finally {
      setBusyEmail(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/admin/payments"
          className="mb-6 inline-flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux paiements
        </Link>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#00ff88]/15">
              <Play className="h-6 w-6 text-[#00ff88]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Abonnements Google Play</h1>
              <p className="text-sm text-gray-400">Comptes abonnés via l’achat intégré de l’app Android.</p>
            </div>
          </div>
          <button
            onClick={() => mutate()}
            disabled={isValidating}
            className="inline-flex items-center gap-2 rounded-xl bg-[#00ff88] px-4 py-2.5 text-sm font-bold text-black transition-colors hover:bg-[#00dd77] disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>

        {data && (
          <dl className="mb-6 grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-gray-800 bg-[#111] p-4">
              <dt className="text-xs text-gray-500">Abonnés actifs</dt>
              <dd className="text-xl font-bold text-[#00ff88]">{counts.active}</dd>
            </div>
            <div className="rounded-2xl border border-gray-800 bg-[#111] p-4">
              <dt className="text-xs text-gray-500">Comptes</dt>
              <dd className="text-xl font-bold text-white">{counts.all}</dd>
            </div>
            <div className="rounded-2xl border border-gray-800 bg-[#111] p-4">
              <dt className="text-xs text-gray-500">Revenu réel</dt>
              <dd className="text-base font-bold text-white sm:text-xl">{formatAmount(realRevenue)}</dd>
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
                className={`shrink-0 rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                  tab === item.id ? 'border-[#00ff88] bg-[#0d2018] text-[#00ff88]' : 'border-gray-800 bg-[#111] text-gray-400 hover:text-white'
                }`}
              >
                {item.label} ({counts[item.id]})
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 rounded-xl border border-gray-800 bg-[#111] px-3 py-2 md:w-72">
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

        {toast && (
          <div
            role="status"
            className={`mb-6 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
              toast.type === 'ok' ? 'border-[#00ff88]/40 bg-[#0d2018] text-[#00ff88]' : 'border-red-500/40 bg-[#2a0d0d] text-red-400'
            }`}
          >
            {toast.type === 'ok' ? <Check className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
            <span>{toast.msg}</span>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-16 text-gray-400">
            <Loader2 className="h-6 w-6 animate-spin" aria-label="Chargement" />
          </div>
        ) : error ? (
          <p className="rounded-2xl border border-red-500/40 bg-[#2a0d0d] p-6 text-sm text-red-400">{error.message}</p>
        ) : visible.length === 0 ? (
          <p className="rounded-2xl border border-gray-800 bg-[#111] p-10 text-center text-sm text-gray-400">Aucun compte.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {visible.map((account) => {
              const state = STATE_STYLE[account.state]
              const busy = busyEmail === account.email
              return (
                <li key={account.email} className="flex flex-col gap-4 rounded-2xl border border-gray-800 bg-[#111] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-white">{account.email}</p>
                      {account.userId && <p className="truncate font-mono text-xs text-gray-500">{account.userId}</p>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {account.likelyTest && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#ffb300]/40 bg-[#1a1405] px-3 py-1 text-xs font-medium text-[#ffb300]">
                          <FlaskConical className="h-3 w-3" aria-hidden="true" />
                          Test
                        </span>
                      )}
                      <span className={`rounded-full border px-3 py-1 text-xs font-medium ${state.className}`}>{state.label}</span>
                    </div>
                  </div>

                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
                    <div>
                      <dt className="text-xs text-gray-500">Formule</dt>
                      <dd className="font-medium text-white">{account.planName}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Expire le</dt>
                      <dd className="font-medium text-white">{formatDate(account.expiresAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Dernier achat</dt>
                      <dd className="font-medium text-white">{formatDate(account.lastPurchaseAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">
                        {account.purchases} achat{account.purchases > 1 ? 's' : ''}
                      </dt>
                      <dd className={`font-medium ${account.likelyTest ? 'text-gray-500 line-through' : 'text-white'}`}>
                        {formatAmount(account.totalAmount)}
                      </dd>
                    </div>
                  </dl>

                  <div className="flex flex-col gap-3 border-t border-gray-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="truncate font-mono text-xs text-gray-500">Commande : {account.lastOrderId || '—'}</p>
                    <button
                      onClick={() => verify(account.email)}
                      disabled={busy}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#00ff88]/40 bg-[#0d2018] px-4 py-2 text-sm font-medium text-[#00ff88] transition-colors hover:border-[#00ff88] hover:text-white disabled:opacity-50"
                    >
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      Vérifier auprès de Google Play
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
