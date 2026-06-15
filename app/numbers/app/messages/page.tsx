'use client'

import { useMemo, useState } from 'react'
import { useNumbers } from '@/components/numbers/numbers-provider'
import { countryByCode, timeAgo, type Message } from '@/lib/numbers/data'
import { Search, Copy, Check, Archive, Inbox, KeyRound, MailOpen } from 'lucide-react'

const card = 'rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl'

function extractCode(body: string): string | null {
  const m = body.match(/\b(\d[\d-]{3,7}\d)\b/)
  return m ? m[1].replace(/-/g, '') : null
}

export default function MessagesPage() {
  const { owned, messages, markRead, markAllRead, archiveMessage, unreadCount } = useNumbers()
  const [activeNumber, setActiveNumber] = useState<string>('all')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const visible = useMemo(() => {
    return messages
      .filter((m) => !m.archived)
      .filter((m) => (activeNumber === 'all' ? true : m.numberId === activeNumber))
      .filter((m) =>
        query ? `${m.sender} ${m.body}`.toLowerCase().includes(query.toLowerCase()) : true,
      )
      .sort((a, b) => b.receivedAt - a.receivedAt)
  }, [messages, activeNumber, query])

  const current = selected ? messages.find((m) => m.id === selected) : null

  function open(m: Message) {
    setSelected(m.id)
    if (!m.read) markRead(m.id)
  }

  function copy(text: string) {
    navigator.clipboard?.writeText(text)
    setCopied(text)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Messages</h1>
          <p className="text-sm text-white/50">{unreadCount} unread across all numbers</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm text-white/70 hover:bg-white/5"
          >
            <MailOpen className="h-4 w-4" /> Mark all read
          </button>
        )}
      </div>

      {/* Number tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveNumber('all')}
          className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
            activeNumber === 'all' ? 'bg-blue-600 text-white' : 'border border-white/10 text-white/60 hover:text-white'
          }`}
        >
          All numbers
        </button>
        {owned.map((n) => {
          const c = countryByCode(n.countryCode)
          return (
            <button
              key={n.id}
              onClick={() => setActiveNumber(n.id)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors ${
                activeNumber === n.id
                  ? 'bg-blue-600 text-white'
                  : 'border border-white/10 text-white/60 hover:text-white'
              }`}
            >
              <span>{c?.flag}</span>
              <span className="font-mono text-xs">{n.e164}</span>
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr]">
        {/* List */}
        <div className={`${card} flex flex-col`}>
          <div className="border-b border-white/5 p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search messages..."
                className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <ul className="max-h-[60vh] divide-y divide-white/5 overflow-y-auto">
            {visible.map((m) => {
              const num = owned.find((n) => n.id === m.numberId)
              const c = num ? countryByCode(num.countryCode) : undefined
              const code = extractCode(m.body)
              return (
                <li key={m.id}>
                  <button
                    onClick={() => open(m)}
                    className={`flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-white/[0.03] ${
                      selected === m.id ? 'bg-blue-500/10' : ''
                    }`}
                  >
                    <span className="mt-0.5 text-lg leading-none">{c?.flag ?? '🌐'}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium text-white">{m.sender}</p>
                        <span className="shrink-0 text-xs text-white/40">{timeAgo(m.receivedAt)}</span>
                      </div>
                      <p className="mt-0.5 truncate text-sm text-white/55">{m.body}</p>
                      {code && (
                        <span className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-blue-500/15 px-2 py-0.5 text-xs font-medium text-blue-300">
                          <KeyRound className="h-3 w-3" /> {code}
                        </span>
                      )}
                    </div>
                    {!m.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
                  </button>
                </li>
              )
            })}
            {visible.length === 0 && (
              <li className="flex flex-col items-center justify-center py-16 text-center">
                <Inbox className="h-8 w-8 text-white/20" />
                <p className="mt-2 text-sm text-white/50">No messages</p>
              </li>
            )}
          </ul>
        </div>

        {/* Detail */}
        <div className={`${card} p-5`}>
          {!current ? (
            <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-center">
              <MailOpen className="h-10 w-10 text-white/15" />
              <p className="mt-3 text-white/50">Select a message to read it</p>
            </div>
          ) : (
            <div className="flex h-full flex-col">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-white/40">From</p>
                  <p className="text-lg font-semibold text-white">{current.sender}</p>
                </div>
                <button
                  onClick={() => {
                    archiveMessage(current.id)
                    setSelected(null)
                  }}
                  className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-white/60 hover:bg-white/5"
                >
                  <Archive className="h-3.5 w-3.5" /> Archive
                </button>
              </div>

              {(() => {
                const num = owned.find((n) => n.id === current.numberId)
                const c = num ? countryByCode(num.countryCode) : undefined
                return (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-white/40">
                    <span>{c?.flag}</span>
                    received on {num?.e164} · {timeAgo(current.receivedAt)}
                  </p>
                )
              })()}

              {extractCode(current.body) && (
                <div className="mt-4 flex items-center justify-between rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-blue-300/70">Verification code</p>
                    <p className="font-mono text-2xl font-semibold text-white">{extractCode(current.body)}</p>
                  </div>
                  <button
                    onClick={() => copy(extractCode(current.body)!)}
                    className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500"
                  >
                    {copied === extractCode(current.body) ? (
                      <>
                        <Check className="h-4 w-4" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" /> Copy
                      </>
                    )}
                  </button>
                </div>
              )}

              <div className="mt-4 rounded-xl bg-white/[0.02] p-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/80">{current.body}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
