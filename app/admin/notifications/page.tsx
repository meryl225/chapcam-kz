'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { AlertCircle, ArrowLeft, Bell, Check, Loader2, Send, Smartphone } from 'lucide-react'

type Audience = { devices: number; users: number; byPlatform: Record<string, number> }
type SendResult = { devices: number; sent: number; failed: number; removed: number }

const TITLE_MAX = 65
const BODY_MAX = 240

const fetcher = async (url: string) => {
  const res = await fetch(url)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Erreur')
  return data as Audience
}

const PLATFORM_LABEL: Record<string, string> = { ios: 'iPhone', android: 'Android' }

export default function AdminNotificationsPage() {
  const { data, error, isLoading, mutate } = useSWR('/api/admin/push-broadcast', fetcher)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<SendResult | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)

  const canSend = title.trim().length > 0 && body.trim().length > 0 && !sending && (data?.devices ?? 0) > 0

  async function send() {
    setSending(true)
    setSendError(null)
    setResult(null)
    try {
      const res = await fetch('/api/admin/push-broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), body: body.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Envoi impossible')
      setResult(json as SendResult)
      setTitle('')
      setBody('')
      mutate()
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Envoi impossible')
    } finally {
      setSending(false)
      setConfirming(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] px-4 py-8 text-white">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <header className="flex flex-col gap-3">
          <Link
            href="/admin/payments"
            className="inline-flex w-fit items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour admin
          </Link>
          <div className="flex items-center gap-3">
            <Bell className="h-6 w-6 text-[#00ff88]" />
            <h1 className="text-2xl font-bold text-balance">Notifications push</h1>
          </div>
          <p className="text-sm leading-relaxed text-gray-400 text-pretty">
            Le message arrive en notification sur tous les téléphones où l&apos;app ChapCam est installée, connectée et
            avec les notifications autorisées.
          </p>
        </header>

        <section className="flex flex-col gap-3 rounded-2xl border border-gray-800 bg-[#111] p-5" aria-live="polite">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Smartphone className="h-4 w-4" />
            Destinataires
          </div>
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
          ) : error ? (
            <p className="text-sm text-red-400">{error.message}</p>
          ) : (
            <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
              <p>
                <span className="text-3xl font-bold">{data?.devices ?? 0}</span>{' '}
                <span className="text-sm text-gray-400">appareils</span>
              </p>
              <p className="text-sm text-gray-400">{data?.users ?? 0} comptes</p>
              {Object.entries(data?.byPlatform ?? {}).map(([platform, count]) => (
                <p key={platform} className="text-sm text-gray-400">
                  {PLATFORM_LABEL[platform] ?? platform} : {count}
                </p>
              ))}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border border-gray-800 bg-[#111] p-5">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label htmlFor="push-title" className="text-sm font-medium">
                Titre
              </label>
              <span className="text-xs text-gray-500">
                {title.length}/{TITLE_MAX}
              </span>
            </div>
            <input
              id="push-title"
              value={title}
              maxLength={TITLE_MAX}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nouveau : Live Swap encore plus rapide"
              className="rounded-xl border border-gray-700 bg-[#0a0a0a] px-4 py-3 text-sm outline-none transition-colors focus:border-[#00ff88]"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label htmlFor="push-body" className="text-sm font-medium">
                Message
              </label>
              <span className="text-xs text-gray-500">
                {body.length}/{BODY_MAX}
              </span>
            </div>
            <textarea
              id="push-body"
              value={body}
              maxLength={BODY_MAX}
              rows={4}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Ouvre ChapCam pour découvrir la nouveauté."
              className="resize-none rounded-xl border border-gray-700 bg-[#0a0a0a] px-4 py-3 text-sm leading-relaxed outline-none transition-colors focus:border-[#00ff88]"
            />
          </div>

          {(title || body) && (
            <div className="flex flex-col gap-2">
              <p className="text-xs uppercase tracking-wide text-gray-500">Aperçu</p>
              <div className="flex gap-3 rounded-2xl bg-[#1c1c1e] p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#00ff88] text-xs font-bold text-[#0a0a0a]">
                  CC
                </div>
                <div className="flex min-w-0 flex-col">
                  <p className="text-xs text-gray-400">ChapCam · maintenant</p>
                  <p className="truncate text-sm font-semibold">{title || 'Titre'}</p>
                  <p className="text-sm leading-relaxed text-gray-300 text-pretty">{body || 'Message'}</p>
                </div>
              </div>
            </div>
          )}

          {sendError && (
            <p className="flex items-center gap-2 text-sm text-red-400">
              <AlertCircle className="h-4 w-4" />
              {sendError}
            </p>
          )}

          {result && (
            <p className="flex items-center gap-2 text-sm text-[#00ff88]">
              <Check className="h-4 w-4" />
              Envoyé à {result.sent}/{result.devices} appareils
              {result.failed > 0 ? ` · ${result.failed} échecs` : ''}
              {result.removed > 0 ? ` · ${result.removed} appareils désinstallés retirés` : ''}
            </p>
          )}

          {confirming ? (
            <div className="flex flex-col gap-3 rounded-xl border border-[#ffb300]/40 bg-[#1a1405] p-4">
              <p className="text-sm text-[#ffb300]">
                Envoyer ce message à {data?.devices ?? 0} appareils ? Impossible d&apos;annuler après l&apos;envoi.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={send}
                  disabled={sending}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#00ff88] px-4 py-2.5 text-sm font-semibold text-[#0a0a0a] disabled:opacity-60"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Confirmer l&apos;envoi
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={sending}
                  className="rounded-xl border border-gray-700 px-4 py-2.5 text-sm text-gray-300 hover:text-white"
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setResult(null)
                setConfirming(true)
              }}
              disabled={!canSend}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#00ff88] px-4 py-3 text-sm font-semibold text-[#0a0a0a] transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
              Envoyer à tous
            </button>
          )}
        </section>
      </div>
    </main>
  )
}
