'use client'

import { useMemo, useState } from 'react'
import { useNumbers } from '@/components/numbers/numbers-provider'
import { countryByCode, serviceBySlug } from '@/lib/numbers/catalog'
import { timeAgo } from '@/lib/numbers/data'
import type { Activation } from '@/lib/numbers/types'
import { Search, Copy, Check, Inbox, KeyRound, MailOpen, Loader2 } from 'lucide-react'

const card = 'rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl'

export default function MessagesPage() {
  const { activations, markRead, markAllRead, unreadCount, loading } = useNumbers()
  const [activeNumber, setActiveNumber] = useState<string>('all')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<number | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  // Les activations avec code reçu constituent la boîte de réception.
  const withCode = useMemo(() => activations.filter((a) => a.code), [activations])
  const waiting = useMemo(() => activations.filter((a) => a.status === 'waiting'), [activations])

  const visible = useMemo(() => {
    return withCode
      .filter((a) => (activeNumber === 'all' ? true : a.phone === activeNumber))
      .filter((a) =>
        query ? `${a.serviceLabel} ${a.code} ${a.fullSms ?? ''}`.toLowerCase().includes(query.toLowerCase()) : true,
      )
      .sort((a, b) => b.createdAt - a.createdAt)
  }, [withCode, activeNumber, query])

  const current = selected ? activations.find((a) => a.id === selected) : null

  function open(a: Activation) {
    setSelected(a.id)
    markRead(a.id)
  }

  function copy(text: string) {
    navigator.clipboard?.writeText(text)
    setCopied(text)
    setTimeout(() => setCopied(null), 1500)
  }

  const uniquePhones = useMemo(() => {
    const seen = new Map<string, Activation>()
    for (const a of activations) if (!seen.has(a.phone)) seen.set(a.phone, a)
    return Array.from(seen.values())
  }, [activations])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Messages</h1>
          <p className="text-sm text-white/50">{unreadCount} code(s) non lu(s)</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm text-white/70 hover:bg-white/5"
          >
            <MailOpen className="h-4 w-4" /> Tout marquer comme lu
          </button>
        )}
      </div>

      {/* Onglets numéros */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveNumber('all')}
          className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
            activeNumber === 'all' ? 'bg-blue-600 text-white' : 'border border-white/10 text-white/60 hover:text-white'
          }`}
        >
          Tous les numéros
        </button>
        {uniquePhones.map((a) => {
          const c = countryByCode(a.countryCode)
          return (
            <button
              key={a.phone}
              onClick={() => setActiveNumber(a.phone)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors ${
                activeNumber === a.phone
                  ? 'bg-blue-600 text-white'
                  : 'border border-white/10 text-white/60 hover:text-white'
              }`}
            >
              <span>{c?.flag}</span>
              <span className="font-mono text-xs">{a.phone}</span>
            </button>
          )
        })}
      </div>

      {/* Bannière en attente */}
      {waiting.length > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-300">
          <Loader2 className="h-4 w-4 animate-spin" />
          {waiting.length} numéro(s) en attente d&apos;un SMS — les codes apparaîtront ici automatiquement.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr]">
        {/* Liste */}
        <div className={`${card} flex flex-col`}>
          <div className="border-b border-white/5 p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher des codes..."
                className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <ul className="max-h-[60vh] divide-y divide-white/5 overflow-y-auto">
            {visible.map((a) => {
              const c = countryByCode(a.countryCode)
              const svc = serviceBySlug(a.serviceSlug)
              return (
                <li key={a.id}>
                  <button
                    onClick={() => open(a)}
                    className={`flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-white/[0.03] ${
                      selected === a.id ? 'bg-blue-500/10' : ''
                    }`}
                  >
                    <span className="mt-0.5 text-lg leading-none">{c?.flag ?? '🌐'}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium text-white">{svc?.label ?? a.serviceLabel}</p>
                        <span className="shrink-0 text-xs text-white/40">{timeAgo(a.createdAt)}</span>
                      </div>
                      <p className="mt-0.5 truncate text-sm text-white/55">{a.fullSms ?? `Code : ${a.code}`}</p>
                      <span className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-blue-500/15 px-2 py-0.5 text-xs font-medium text-blue-300">
                        <KeyRound className="h-3 w-3" /> {a.code}
                      </span>
                    </div>
                  </button>
                </li>
              )
            })}
            {visible.length === 0 && (
              <li className="flex flex-col items-center justify-center py-16 text-center">
                <Inbox className="h-8 w-8 text-white/20" />
                <p className="mt-2 text-sm text-white/50">
                  {loading ? 'Chargement...' : 'Aucun code reçu pour le moment'}
                </p>
              </li>
            )}
          </ul>
        </div>

        {/* Détail */}
        <div className={`${card} p-5`}>
          {!current ? (
            <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-center">
              <MailOpen className="h-10 w-10 text-white/15" />
              <p className="mt-3 text-white/50">Sélectionnez un code pour le consulter</p>
            </div>
          ) : (
            <div className="flex h-full flex-col">
              <div>
                <p className="text-sm text-white/40">Service</p>
                <p className="text-lg font-semibold text-white">
                  {serviceBySlug(current.serviceSlug)?.label ?? current.serviceLabel}
                </p>
              </div>

              <p className="mt-1 flex items-center gap-1.5 text-xs text-white/40">
                <span>{countryByCode(current.countryCode)?.flag}</span>
                reçu sur {current.phone} · {timeAgo(current.createdAt)}
              </p>

              {current.code && (
                <div className="mt-4 flex items-center justify-between rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-blue-300/70">Code de vérification</p>
                    <p className="font-mono text-2xl font-semibold text-white">{current.code}</p>
                  </div>
                  <button
                    onClick={() => copy(current.code!)}
                    className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500"
                  >
                    {copied === current.code ? (
                      <>
                        <Check className="h-4 w-4" /> Copié
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" /> Copier
                      </>
                    )}
                  </button>
                </div>
              )}

              {current.fullSms && (
                <div className="mt-4 rounded-xl bg-white/[0.02] p-4">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/80">{current.fullSms}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
