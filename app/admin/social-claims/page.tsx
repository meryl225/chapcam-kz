'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { AlertCircle, ArrowLeft, Check, Gift, Loader2, X } from 'lucide-react'

type Claim = {
  id: string
  user_id: string
  email: string | null
  status: 'pending' | 'approved' | 'rejected'
  proof_signed_urls: string[]
  created_at: string
  reviewed_at: string | null
  reward_amount: number
}

const TABS = [
  { id: 'pending', label: 'En attente' },
  { id: 'approved', label: 'Approuvées' },
  { id: 'rejected', label: 'Refusées' },
  { id: 'all', label: 'Toutes' },
] as const

const STATUS_STYLE: Record<Claim['status'], { label: string; className: string }> = {
  pending: { label: 'En attente', className: 'border-[#ffb300]/40 bg-[#1a1405] text-[#ffb300]' },
  approved: { label: 'Approuvée', className: 'border-[#00ff88]/40 bg-[#0d2018] text-[#00ff88]' },
  rejected: { label: 'Refusée', className: 'border-red-500/40 bg-[#2a0d0d] text-red-400' },
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Erreur')
  return data as { claims: Claim[] }
}

const formatDate = (value: string) =>
  new Date(value).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export default function AdminSocialClaimsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('pending')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)
  const { data, error, isLoading, mutate } = useSWR(`/api/admin/social-claims?status=${tab}`, fetcher)

  const review = async (id: string, action: 'approve' | 'reject') => {
    setBusyId(id)
    setToast(null)
    try {
      const res = await fetch('/api/admin/social-claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      })
      const body = await res.json()
      setToast(res.ok ? { type: 'ok', msg: body.message } : { type: 'err', msg: body.error || 'Erreur' })
      await mutate()
    } catch {
      setToast({ type: 'err', msg: 'Erreur de connexion' })
    } finally {
      setBusyId(null)
    }
  }

  const claims = data?.claims ?? []

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

        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#ffb300]/15">
            <Gift className="h-6 w-6 text-[#ffb300]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Bonus réseaux sociaux</h1>
            <p className="text-sm text-gray-400">Vérifie les captures puis approuve (+5 jetons) ou refuse.</p>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-2" role="tablist">
          {TABS.map((item) => (
            <button
              key={item.id}
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
              className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                tab === item.id ? 'border-[#ffb300] bg-[#1a1405] text-[#ffb300]' : 'border-gray-800 bg-[#111] text-gray-400 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
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
        ) : claims.length === 0 ? (
          <p className="rounded-2xl border border-gray-800 bg-[#111] p-10 text-center text-sm text-gray-400">Aucune demande.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {claims.map((claim) => {
              const status = STATUS_STYLE[claim.status]
              const busy = busyId === claim.id
              return (
                <li key={claim.id} className="flex flex-col gap-4 rounded-2xl border border-gray-800 bg-[#111] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">{claim.email || 'E-mail inconnu'}</p>
                      <p className="truncate font-mono text-xs text-gray-500">{claim.user_id}</p>
                      <p className="mt-1 text-xs text-gray-400">
                        Envoyée le {formatDate(claim.created_at)}
                        {claim.reviewed_at ? ` · traitée le ${formatDate(claim.reviewed_at)}` : ''}
                      </p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${status.className}`}>{status.label}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {claim.proof_signed_urls.map((url, index) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block overflow-hidden rounded-xl border border-gray-800 bg-black"
                      >
                        <img src={url} alt={`Capture ${index + 1} de ${claim.email || 'l’utilisateur'}`} className="aspect-[9/16] w-full object-cover" />
                      </a>
                    ))}
                  </div>

                  {claim.status === 'pending' && (
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => review(claim.id, 'approve')}
                        disabled={busy}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#00ff88] px-4 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        Approuver (+{claim.reward_amount})
                      </button>
                      <button
                        onClick={() => review(claim.id, 'reject')}
                        disabled={busy}
                        className="inline-flex items-center gap-2 rounded-xl border border-red-500/40 bg-[#2a0d0d] px-4 py-2.5 text-sm font-semibold text-red-400 transition-colors hover:border-red-500 disabled:opacity-50"
                      >
                        <X className="h-4 w-4" />
                        Refuser
                      </button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
