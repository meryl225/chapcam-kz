'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useNumbers } from '@/components/numbers/numbers-provider'
import {
  countryByCode,
  providerById,
  formatUSD,
  formatDate,
  timeLeft,
  type OwnedNumber,
  type Capability,
} from '@/lib/numbers/data'
import {
  Copy,
  Check,
  Trash2,
  Plus,
  Pencil,
  MessageSquareText,
  Phone as PhoneIcon,
  Image as ImageIcon,
  RefreshCw,
  X,
  Search,
} from 'lucide-react'

const card = 'rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl'

const capIcon: Record<Capability, typeof MessageSquareText> = {
  sms: MessageSquareText,
  voice: PhoneIcon,
  mms: ImageIcon,
}

const statusStyle: Record<OwnedNumber['status'], string> = {
  active: 'bg-emerald-500/15 text-emerald-400',
  expiring: 'bg-amber-500/15 text-amber-400',
  expired: 'bg-red-500/15 text-red-400',
}

const STATUS_FR: Record<OwnedNumber['status'], string> = {
  active: 'Actif',
  expiring: 'Bientôt expiré',
  expired: 'Expiré',
}

const TYPE_FR: Record<OwnedNumber['type'], string> = {
  temporary: 'Temporaire',
  'long-term': 'Longue durée',
}

export default function NumbersPage() {
  const { owned, toggleAutoRenew, releaseNumber, renameNumber } = useNumbers()
  const [copied, setCopied] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [confirmRelease, setConfirmRelease] = useState<OwnedNumber | null>(null)
  const [filter, setFilter] = useState('')

  const list = owned.filter((n) => {
    if (!filter) return true
    const c = countryByCode(n.countryCode)
    return `${n.e164} ${n.label} ${c?.name}`.toLowerCase().includes(filter.toLowerCase())
  })

  function copy(text: string) {
    navigator.clipboard?.writeText(text)
    setCopied(text)
    setTimeout(() => setCopied(null), 1500)
  }

  function saveLabel(id: string) {
    renameNumber(id, draft)
    setEditing(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Mes numéros</h1>
          <p className="text-sm text-white/50">{owned.length} numéros sur votre compte</p>
        </div>
        <Link
          href="/numbers/app/marketplace"
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
        >
          <Plus className="h-4 w-4" /> Acheter un numéro
        </Link>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Rechercher vos numéros..."
          className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {list.map((n) => {
          const c = countryByCode(n.countryCode)
          const p = providerById(n.providerId)
          return (
            <div key={n.id} className={`${card} p-5`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl leading-none">{c?.flag}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-base text-white">{n.e164}</p>
                      <button
                        onClick={() => copy(n.e164)}
                        className="text-white/40 transition-colors hover:text-blue-400"
                        aria-label="Copy number"
                      >
                        {copied === n.e164 ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                    {editing === n.id ? (
                      <div className="mt-1 flex items-center gap-1">
                        <input
                          autoFocus
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && saveLabel(n.id)}
                          className="w-40 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-white outline-none focus:border-blue-500"
                        />
                        <button onClick={() => saveLabel(n.id)} className="text-emerald-400">
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setEditing(null)} className="text-white/40">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditing(n.id)
                          setDraft(n.label)
                        }}
                        className="mt-0.5 flex items-center gap-1 text-xs text-white/50 transition-colors hover:text-white"
                      >
                        {n.label}
                        <Pencil className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyle[n.status]}`}>
                  {STATUS_FR[n.status]}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-white/40">Opérateur</p>
                  <p className="text-white/80">{p?.name}</p>
                </div>
                <div>
                  <p className="text-xs text-white/40">Type</p>
                  <p className="text-white/80">{TYPE_FR[n.type]}</p>
                </div>
                <div>
                  <p className="text-xs text-white/40">Messages</p>
                  <p className="text-white/80">{n.messageCount}</p>
                </div>
                <div>
                  <p className="text-xs text-white/40">{n.status === 'expired' ? 'Expiré le' : 'Renouvellement dans'}</p>
                  <p className="text-white/80">{n.status === 'expired' ? formatDate(n.expiresAt) : timeLeft(n.expiresAt)}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                {(['sms', 'voice', 'mms'] as Capability[]).map((cap) => {
                  const Icon = capIcon[cap]
                  return (
                    <span
                      key={cap}
                      className="flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-[11px] uppercase text-white/50"
                    >
                      <Icon className="h-3 w-3" />
                      {cap}
                    </span>
                  )
                })}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-4">
                <button
                  onClick={() => toggleAutoRenew(n.id)}
                  className="flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-white"
                >
                  <span
                    className={`relative h-5 w-9 rounded-full transition-colors ${n.autoRenew ? 'bg-blue-600' : 'bg-white/15'}`}
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${n.autoRenew ? 'translate-x-4' : 'translate-x-0.5'}`}
                    />
                  </span>
                  <RefreshCw className="h-3.5 w-3.5" /> Renouvellement auto
                </button>
                <div className="flex items-center gap-3">
                  <Link
                    href="/numbers/app/messages"
                    className="text-sm text-blue-400 transition-colors hover:text-blue-300"
                  >
                    Messages
                  </Link>
                  <button
                    onClick={() => setConfirmRelease(n)}
                    className="flex items-center gap-1 text-sm text-white/50 transition-colors hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Libérer
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {owned.length === 0 && (
        <div className={`${card} flex flex-col items-center justify-center py-16 text-center`}>
          <PhoneIcon className="h-8 w-8 text-white/20" />
          <p className="mt-3 text-white/60">Vous ne possédez encore aucun numéro</p>
          <Link
            href="/numbers/app/marketplace"
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            Parcourir les numéros
          </Link>
        </div>
      )}

      {/* Release confirm modal */}
      {confirmRelease && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setConfirmRelease(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0b1220] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-500/15 text-red-400">
              <Trash2 className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-white">Libérer ce numéro ?</h2>
            <p className="mt-1 text-sm text-white/50">
              <span className="font-mono text-white/80">{confirmRelease.e164}</span> sera définitivement supprimé et
              vous ne recevrez plus de messages. Cette action est irréversible.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setConfirmRelease(null)}
                className="flex-1 rounded-lg border border-white/10 py-2 text-sm text-white/70 hover:bg-white/5"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  releaseNumber(confirmRelease.id)
                  setConfirmRelease(null)
                }}
                className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-500"
              >
                Libérer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
