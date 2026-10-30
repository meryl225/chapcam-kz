'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { AlertCircle, ArrowLeft, Check, Flag, Headset, Loader2, Mail, RotateCcw } from 'lucide-react'

type Report = {
  id: string
  kind: 'abuse' | 'support'
  status: 'new' | 'handled'
  user_id: string
  email: string
  name: string | null
  reason: string | null
  message: string
  creation_id: string | null
  creation_title: string | null
  content_url: string | null
  context: string | null
  platform: string | null
  email_sent: boolean
  created_at: string
  handled_at: string | null
}

const KINDS = [
  { id: 'all', label: 'Tout' },
  { id: 'abuse', label: 'Signalements' },
  { id: 'support', label: 'Service client' },
] as const

const STATUSES = [
  { id: 'new', label: 'À traiter' },
  { id: 'handled', label: 'Traités' },
  { id: 'all', label: 'Tous' },
] as const

const fetcher = async (url: string) => {
  const res = await fetch(url)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Erreur')
  return data as { reports: Report[] }
}

const formatDate = (value: string) =>
  new Date(value).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export default function AdminReportsPage() {
  const [kind, setKind] = useState<(typeof KINDS)[number]['id']>('all')
  const [status, setStatus] = useState<(typeof STATUSES)[number]['id']>('new')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)
  const { data, error, isLoading, mutate } = useSWR(`/api/admin/user-reports?kind=${kind}&status=${status}`, fetcher)

  const update = async (id: string, next: Report['status']) => {
    setBusyId(id)
    setToast(null)
    try {
      const res = await fetch('/api/admin/user-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: next }),
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

  const reports = data?.reports ?? []

  return (
    <div className="min-h-screen bg-[#050505] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/admin/payments" className="mb-6 inline-flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Retour aux paiements
        </Link>

        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/15">
            <Flag className="h-6 w-6 text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Signalements & service client</h1>
            <p className="text-sm text-gray-400">Demandes envoyées depuis l’application mobile (iOS et Android).</p>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap gap-2" role="tablist" aria-label="Type">
          {KINDS.map((item) => (
            <button
              key={item.id}
              role="tab"
              aria-selected={kind === item.id}
              onClick={() => setKind(item.id)}
              className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                kind === item.id ? 'border-red-400 bg-[#2a0d0d] text-red-300' : 'border-gray-800 bg-[#111] text-gray-400 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Statut">
          {STATUSES.map((item) => (
            <button
              key={item.id}
              role="tab"
              aria-selected={status === item.id}
              onClick={() => setStatus(item.id)}
              className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${
                status === item.id ? 'border-gray-500 bg-[#1a1a1a] text-white' : 'border-gray-800 bg-[#111] text-gray-500 hover:text-white'
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
        ) : reports.length === 0 ? (
          <p className="rounded-2xl border border-gray-800 bg-[#111] p-10 text-center text-sm text-gray-400">Aucune demande.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {reports.map((report) => {
              const busy = busyId === report.id
              const abuse = report.kind === 'abuse'
              return (
                <li key={report.id} className="flex flex-col gap-4 rounded-2xl border border-gray-800 bg-[#111] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                            abuse ? 'border-red-500/40 bg-[#2a0d0d] text-red-300' : 'border-sky-500/40 bg-[#07182a] text-sky-300'
                          }`}
                        >
                          {abuse ? <Flag className="h-3 w-3" /> : <Headset className="h-3 w-3" />}
                          {abuse ? 'Signalement' : 'Service client'}
                        </span>
                        {report.reason && <span className="rounded-full border border-gray-700 px-2.5 py-0.5 text-xs text-gray-200">{report.reason}</span>}
                        {report.platform && <span className="text-xs text-gray-500">{report.platform}</span>}
                      </div>
                      <p className="truncate font-semibold text-white">{report.email}</p>
                      <p className="truncate font-mono text-xs text-gray-500">{report.user_id}</p>
                      <p className="mt-1 text-xs text-gray-400">
                        Reçu le {formatDate(report.created_at)}
                        {report.handled_at ? ` · traité le ${formatDate(report.handled_at)}` : ''}
                        {report.email_sent ? ' · e-mail envoyé' : ' · e-mail non envoyé'}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-medium ${
                        report.status === 'new' ? 'border-[#ffb300]/40 bg-[#1a1405] text-[#ffb300]' : 'border-[#00ff88]/40 bg-[#0d2018] text-[#00ff88]'
                      }`}
                    >
                      {report.status === 'new' ? 'À traiter' : 'Traité'}
                    </span>
                  </div>

                  <p className="whitespace-pre-wrap rounded-xl border border-gray-800 bg-black p-4 text-sm leading-relaxed text-gray-200">{report.message}</p>

                  {abuse && (
                    <dl className="grid gap-2 text-xs sm:grid-cols-2">
                      <div>
                        <dt className="text-gray-500">Création concernée</dt>
                        <dd className="break-all font-mono text-gray-200">
                          {report.creation_id ? `${report.creation_id}${report.creation_title ? ` · ${report.creation_title}` : ''}` : '—'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-gray-500">Contexte</dt>
                        <dd className="text-gray-200">{report.context || '—'}</dd>
                      </div>
                      {report.content_url && (
                        <div className="sm:col-span-2">
                          <dt className="text-gray-500">Lien du contenu</dt>
                          <dd>
                            <a href={report.content_url} target="_blank" rel="noopener noreferrer" className="break-all text-sky-300 underline">
                              Ouvrir le contenu
                            </a>
                          </dd>
                        </div>
                      )}
                    </dl>
                  )}

                  <div className="flex flex-wrap gap-3">
                    <a
                      href={`mailto:${report.email}?subject=${encodeURIComponent(abuse ? 'Votre signalement ChapCam' : 'Votre demande ChapCam')}`}
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:border-gray-500"
                    >
                      <Mail className="h-4 w-4" />
                      Répondre
                    </a>
                    {report.status === 'new' ? (
                      <button
                        onClick={() => update(report.id, 'handled')}
                        disabled={busy}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#00ff88] px-4 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        Marquer comme traité
                      </button>
                    ) : (
                      <button
                        onClick={() => update(report.id, 'new')}
                        disabled={busy}
                        className="inline-flex items-center gap-2 rounded-xl border border-gray-700 px-4 py-2.5 text-sm font-semibold text-gray-300 transition-colors hover:text-white disabled:opacity-50"
                      >
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                        Remettre à traiter
                      </button>
                    )}
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
