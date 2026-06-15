'use client'

import { useMemo, useState } from 'react'
import { useNumbers } from '@/components/numbers/numbers-provider'
import { getCountry, timeAgo, type SmsMessage } from '@/lib/numbers/data'
import { cn } from '@/lib/utils'
import { Search, Copy, Check, Trash2, MailOpen, Inbox, KeyRound } from 'lucide-react'

function extractCode(body: string): string | null {
  const m = body.match(/\b(\d[\d-]{3,7}\d)\b/)
  return m ? m[1].replace(/-/g, '') : null
}

function MessageRow({ m }: { m: SmsMessage }) {
  const { markRead, deleteMessage, ownedNumbers } = useNumbers()
  const [copied, setCopied] = useState(false)
  const number = ownedNumbers.find((n) => n.id === m.numberId)
  const country = number ? getCountry(number.countryCode) : undefined
  const code = extractCode(m.body)

  function copyCode() {
    if (!code) return
    navigator.clipboard?.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <li
      onClick={() => !m.read && markRead(m.id)}
      className={cn(
        'group flex cursor-default items-start gap-4 px-5 py-4 transition-colors',
        !m.read && 'bg-primary/[0.04]',
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-foreground">
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
          <span className="ml-auto text-xs text-muted-foreground">{timeAgo(m.receivedAt)}</span>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-foreground/90">{m.body}</p>
        <div className="mt-2 flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {country?.flag} <span className="font-mono">{number?.number ?? 'Released'}</span>
          </span>
          {code && (
            <button
              onClick={copyCode}
              className="inline-flex items-center gap-1.5 rounded-md border border-hairline px-2 py-1 font-mono text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
            >
              {copied ? <Check className="h-3 w-3" /> : <KeyRound className="h-3 w-3" />}
              {copied ? 'Copied' : code}
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              deleteMessage(m.id)
            }}
            className="ml-auto flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all hover:bg-secondary hover:text-destructive group-hover:opacity-100"
            aria-label="Delete message"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </li>
  )
}

export default function MessagesPage() {
  const { messages, ownedNumbers, markAllRead, unreadCount } = useNumbers()
  const [activeNumber, setActiveNumber] = useState<string>('all')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    return messages
      .filter((m) => (activeNumber === 'all' ? true : m.numberId === activeNumber))
      .filter((m) =>
        query
          ? (m.sender + m.body).toLowerCase().includes(query.toLowerCase())
          : true,
      )
  }, [messages, activeNumber, query])

  function unreadFor(numberId: string) {
    return messages.filter((m) => m.numberId === numberId && !m.read).length
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Messages</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread messages` : 'All caught up'} · new SMS arrive in realtime.
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead(activeNumber === 'all' ? undefined : activeNumber)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-hairline px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-primary/40"
          >
            <MailOpen className="h-4 w-4" />
            Mark all read
          </button>
        )}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-4">
        {/* number selector */}
        <aside className="lg:col-span-1">
          <div className="rounded-2xl border border-hairline bg-card p-2">
            <button
              onClick={() => setActiveNumber('all')}
              className={cn(
                'flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                activeNumber === 'all' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span className="flex items-center gap-2">
                <Inbox className="h-4 w-4" />
                All numbers
              </span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
                  {unreadCount}
                </span>
              )}
            </button>
            {ownedNumbers.map((n) => {
              const u = unreadFor(n.id)
              const country = getCountry(n.countryCode)
              return (
                <button
                  key={n.id}
                  onClick={() => setActiveNumber(n.id)}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
                    activeNumber === n.id ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="leading-none">{country?.flag}</span>
                    <span className="min-w-0">
                      <span className="block truncate font-mono text-[13px] text-foreground">{n.number}</span>
                      <span className="block truncate text-xs text-muted-foreground">{n.label}</span>
                    </span>
                  </span>
                  {u > 0 && (
                    <span className="shrink-0 rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
                      {u}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </aside>

        {/* messages */}
        <section className="lg:col-span-3">
          <div className="relative mb-4">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search messages…"
              className="w-full rounded-xl border border-hairline bg-card py-3 pl-10 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50"
            />
          </div>

          <div className="overflow-hidden rounded-2xl border border-hairline bg-card">
            {filtered.length > 0 ? (
              <ul className="divide-y divide-hairline">
                {filtered.map((m) => (
                  <MessageRow key={m.id} m={m} />
                ))}
              </ul>
            ) : (
              <div className="p-12 text-center">
                <Inbox className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">
                  {query ? 'No messages match your search.' : 'No messages yet for this number.'}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
