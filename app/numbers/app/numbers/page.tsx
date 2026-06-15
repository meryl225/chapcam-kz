'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useNumbers } from '@/components/numbers/numbers-provider'
import { countryByCode, serviceBySlug } from '@/lib/numbers/catalog'
import { formatXOF, type Activation } from '@/lib/numbers/types'
import {
  Copy,
  Check,
  Plus,
  Phone as PhoneIcon,
  Loader2,
  X,
  Search,
  MessageSquareText,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react'

const card = 'rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl'

const statusStyle: Record<Activation['status'], string> = {
  waiting: 'bg-amber-500/15 text-amber-400',
  received: 'bg-emerald-500/15 text-emerald-400',
  cancelled: 'bg-white/10 text-white/50',
  expired: 'bg-red-500/15 text-red-400',
}

const STATUS_FR: Record<Activation['status'], string> = {
  waiting: 'En attente du SMS',
  received: 'Code reçu',
  cancelled: 'Annulé',
  expired: 'Expiré',
}

function CountdownLeft({ expiresAt }: { expiresAt: number | null }) {
  if (!expiresAt) return null
  const diff = expiresAt - Date.now()
  if (diff <= 0) return <span className="text-red-400">expiré</span>
  const mins = Math.floor(diff / 60000)
  const secs = Math.floor((diff % 60000) / 1000)
  return (
    <span>
      {mins}:{String(secs).padStart(2, '0')}
    </span>
  )
}

export default function NumbersPage() {
  const { activations, cancelActivation, loading } = useNumbers()
  const [copied, setCopied] = useState<string | null>(null)
  const [confirmCancel, setConfirmCancel] = useState<Activation | null>(null)
  const [filter, setFilter] = useState('')
  const [, force] = useState(0)

  // Rafraîchit l'affichage du compte à rebours chaque seconde.
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const list = activations.filter((a) => {
    if (!filter) return true
    const c = countryByCode(a.countryCode)
    return `${a.phone} ${a.serviceLabel} ${c?.name}`.toLowerCase().includes(filter.toLowerCase())
  })

  function copy(text: string) {
    navigator.clipboard?.writeText(text)
    setCopied(text)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Mes numéros</h1>
          <p className="text-sm text-white/50">{activations.length} activation(s) sur votre compte</p>
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

      {loading && activations.length === 0 ? (
        <div className={`${card} flex items-center justify-center py-16`}>
          <Loader2 className="h-6 w-6 animate-spin text-white/40" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {list.map((a) => {
            const c = countryByCode(a.countryCode)
            const svc = serviceBySlug(a.serviceSlug)
            return (
              <div key={a.id} className={`${card} p-5`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl leading-none">{c?.flag}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-base text-white">{a.phone}</p>
                        <button
                          onClick={() => copy(a.phone)}
                          className="text-white/40 transition-colors hover:text-blue-400"
                          aria-label="Copier le numéro"
                        >
                          {copied === a.phone ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                      <p className="mt-0.5 text-xs text-white/50">
                        {svc?.label ?? a.serviceLabel} · {c?.name}
                      </p>
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyle[a.status]}`}>
                    {STATUS_FR[a.status]}
                  </span>
                </div>

                {/* Zone code SMS */}
                <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  {a.status === 'received' && a.code ? (
                    <div>
                      <p className="text-xs uppercase tracking-wider text-white/40">Code reçu</p>
                      <div className="mt-1 flex items-center gap-3">
                        <span className="font-mono text-2xl font-bold tracking-widest text-emerald-400">{a.code}</span>
                        <button
                          onClick={() => copy(a.code!)}
                          className="rounded-lg bg-white/5 px-2.5 py-1.5 text-xs text-white/70 hover:bg-white/10"
                        >
                          {copied === a.code ? 'Copié' : 'Copier'}
                        </button>
                      </div>
                      {a.fullSms && <p className="mt-2 text-xs text-white/40">{a.fullSms}</p>}
                    </div>
                  ) : a.status === 'waiting' ? (
                    <div className="flex items-center gap-3 text-sm text-white/60">
                      <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                      <span>En attente du SMS...</span>
                      <span className="ml-auto flex items-center gap-1 font-mono text-white/50">
                        <Clock className="h-3.5 w-3.5" />
                        <CountdownLeft expiresAt={a.expiresAt} />
                      </span>
                    </div>
                  ) : a.status === 'cancelled' ? (
                    <div className="flex items-center gap-2 text-sm text-white/50">
                      <XCircle className="h-4 w-4" /> Annulé — remboursé sur votre solde
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-red-400">
                      <XCircle className="h-4 w-4" /> Expiré sans SMS — remboursé
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-4 text-sm">
                  <span className="text-white/50">{formatXOF(a.priceXof)}</span>
                  {a.status === 'waiting' ? (
                    <button
                      onClick={() => setConfirmCancel(a)}
                      className="flex items-center gap-1 text-white/50 transition-colors hover:text-red-400"
                    >
                      <X className="h-3.5 w-3.5" /> Annuler & rembourser
                    </button>
                  ) : a.status === 'received' ? (
                    <span className="flex items-center gap-1 text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Terminé
                    </span>
                  ) : (
                    <Link href="/numbers/app/messages" className="flex items-center gap-1 text-blue-400 hover:text-blue-300">
                      <MessageSquareText className="h-3.5 w-3.5" /> Messages
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!loading && activations.length === 0 && (
        <div className={`${card} flex flex-col items-center justify-center py-16 text-center`}>
          <PhoneIcon className="h-8 w-8 text-white/20" />
          <p className="mt-3 text-white/60">Vous n&apos;avez encore acheté aucun numéro</p>
          <Link
            href="/numbers/app/marketplace"
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            Acheter mon premier numéro
          </Link>
        </div>
      )}

      {/* Confirmation d'annulation */}
      {confirmCancel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setConfirmCancel(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0b1220] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-500/15 text-red-400">
              <X className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-white">Annuler cette activation ?</h2>
            <p className="mt-1 text-sm text-white/50">
              <span className="font-mono text-white/80">{confirmCancel.phone}</span> sera annulé. Si aucun SMS n&apos;a
              été reçu, le montant est recrédité sur votre solde.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setConfirmCancel(null)}
                className="flex-1 rounded-lg border border-white/10 py-2 text-sm text-white/70 hover:bg-white/5"
              >
                Garder
              </button>
              <button
                onClick={() => {
                  cancelActivation(confirmCancel.id)
                  setConfirmCancel(null)
                }}
                className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-500"
              >
                Annuler & rembourser
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
