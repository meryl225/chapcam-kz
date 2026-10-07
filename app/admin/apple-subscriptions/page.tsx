'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { AlertCircle, ArrowLeft, Check, Loader2, RefreshCw, Search, Smartphone } from 'lucide-react'

type AppleAccount = {
  email: string
  userId: string | null
  plan: string | null
  planName: string
  state: 'active' | 'expired' | 'revoked'
  expiresAt: string | null
  lastTransactionId: string | null
  lastPurchaseAt: string
  purchases: number
  totalAmount: number
}

const TABS = [
  { id: 'all', label: 'Tous' },
  { id: 'active', label: 'Actifs' },
  { id: 'expired', label: 'Expirés' },
  { id: 'revoked', label: 'Remboursés' },
] as const

const STATE_STYLE: Record<AppleAccount['state'], { label: string; className: string }> = {
  active: { label: 'Actif', className: 'border-[#00ff88]/40 bg-[#0d2018] text-[#00ff88]' },
  expired: { label: 'Expiré', className: 'border-gray-700 bg-[#1a1a1a] text-gray-400' },
  revoked: { label: 'Remboursé', className: 'border-red-500/40 bg-[#2a0d0d] text-red-400' },
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Erreur')
  return data as { accounts: AppleAccount[] }
}

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const formatAmount = (value: number) => `${value.toLocaleString('fr-FR')} FCFA`

export default function AdminAppleSubscriptionsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('all')
  const [query, setQuery] = useState('')
  const [busyEmail, setBusyEmail] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)
  const { data, error, isLoading, isValidating, mutate } = useSWR('/api/admin/apple-subscriptions', fetcher)

  const accounts = data?.accounts ?? []
  const counts = useMemo(
    () => ({
      all: accounts.length,
      active: accounts.filter((a) => a.state === 'active').length,
      expired: accounts.filter((a) => a.state === 'expired').length,
      revoked: accounts.filter((a) => a.state === 'revoked').length,
    }),
    [accounts],
  )
  const visible = accounts.filter(
    (a) => (tab === 'all' || a.state === tab) && a.email.includes(query.trim().toLowerCase()),
  )

  const verify = async (email: string) => {
    setBusyEmail(email)
    setToast(null)
    try {
      const res = await fetch('/api/admin/apple-subscriptions', {
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
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#00d4ff]/15">
              <Smartphone className="h-6 w-6 text-[#00d4ff]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Abonnements Apple</h1>
              <p className="text-sm text-gray-400">Comptes abonnés via l’achat intégré de l’app iOS.</p>
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

        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2" role="tablist">
            {TABS.map((item) => (
              <button
                key={item.id}
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => setTab(item.id)}
                className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                  tab === item.id ? 'border-[#00d4ff] bg-[#0a1620] text-[#00d4ff]' : 'border-gray-800 bg-[#111] text-gray-400 hover:text-white'
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
              className="w-full bg-transparent text-sm text-white placeholder:text-gray-500 focus:outline-none"
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
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">{account.email}</p>
                      {account.userId && <p className="truncate font-mono text-xs text-gray-500">{account.userId}</p>}
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${state.className}`}>{state.label}</span>
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
                      <dd className="font-medium text-white">{formatAmount(account.totalAmount)}</dd>
                    </div>
                  </dl>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-800 pt-4">
                    <p className="truncate font-mono text-xs text-gray-500">
                      Transaction Apple : {account.lastTransactionId || '—'}
                    </p>
                    <button
                      onClick={() => verify(account.email)}
                      disabled={busy}
                      className="inline-flex items-center gap-2 rounded-xl border border-[#00d4ff]/40 bg-[#0a1620] px-4 py-2 text-sm font-medium text-[#00d4ff] transition-colors hover:border-[#00d4ff] hover:text-white disabled:opacity-50"
                    >
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      Vérifier auprès d’Apple
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
