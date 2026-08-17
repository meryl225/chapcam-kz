'use client'

import { useState } from 'react'
import { Zap, Loader2, ArrowLeft, Check, AlertCircle } from 'lucide-react'
import Link from 'next/link'

const PRESETS = [15, 30, 60, 120, 300]

export default function AdminLiveMinutesPage() {
  const [email, setEmail] = useState('')
  const [minutes, setMinutes] = useState('')
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const target = email.trim()
    const mins = Number(minutes)
    if (!target || !Number.isInteger(mins) || mins < 1 || mins > 1000) {
      setToast({ type: 'err', msg: 'Entrez un email valide et un nombre entier de minutes entre 1 et 1000.' })
      return
    }
    setBusy(true)
    setToast(null)
    try {
      const res = await fetch('/api/admin/live-minutes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: target, minutes: mins }),
      })
      const data = await res.json()
      if (res.ok) {
        setToast({ type: 'ok', msg: data.message || 'Minutes ajoutees' })
        setEmail('')
        setMinutes('')
      } else {
        setToast({ type: 'err', msg: data.error || 'Erreur' })
      }
    } catch {
      setToast({ type: 'err', msg: 'Erreur de connexion' })
    } finally {
      setBusy(false)
    }
  }

  const inputClass =
    'w-full rounded-xl border border-gray-700 bg-[#0a0a0a] px-4 py-3 text-white outline-none transition-colors focus:border-[#00d4ff]'
  const labelClass = 'mb-1.5 block text-sm font-medium text-gray-300'

  return (
    <div className="min-h-screen bg-[#050505] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/admin/payments"
          className="mb-6 inline-flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux paiements
        </Link>

        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#00d4ff]/15">
            <Zap className="h-6 w-6 text-[#00d4ff]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Ajouter des minutes Live Swap</h1>
            <p className="text-sm text-gray-400">
              Cree du temps de face swap en temps reel pour un utilisateur (1 a 1000 min).
            </p>
          </div>
        </div>

        {toast && (
          <div
            className={`mb-6 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
              toast.type === 'ok'
                ? 'border-[#00ff88]/40 bg-[#0d2018] text-[#00ff88]'
                : 'border-red-500/40 bg-[#2a0d0d] text-red-400'
            }`}
          >
            {toast.type === 'ok' ? (
              <Check className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{toast.msg}</span>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-5 rounded-2xl border border-gray-800 bg-[#111] p-6"
        >
          <div>
            <label className={labelClass}>Email de l&apos;utilisateur</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="utilisateur@exemple.com"
            />
            <p className="mt-1 text-xs text-gray-500">Le compte doit deja exister avec cet email.</p>
          </div>

          <div>
            <label className={labelClass}>Minutes a ajouter (1 - 1000)</label>
            <input
              type="number"
              min={1}
              max={1000}
              step={1}
              required
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              className={inputClass}
              placeholder="60"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setMinutes(String(p))}
                  className="rounded-lg border border-gray-700 bg-[#0a0a0a] px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:border-[#00d4ff] hover:text-white"
                >
                  {p} min
                </button>
              ))}
            </div>
          </div>

          <p className="rounded-lg border border-[#00d4ff]/20 bg-[#0a1620] px-3 py-2 text-xs text-gray-400">
            Les minutes sont creditees en points Live Swap (1 min = 120 points en 720p) et
            s&apos;ajoutent au solde de l&apos;utilisateur. Elles ne se decomptent qu&apos;a
            l&apos;utilisation reelle : rien ne se perd si l&apos;utilisateur est hors ligne.
          </p>

          <button
            type="submit"
            disabled={busy}
            className="flex items-center justify-center gap-2 rounded-2xl bg-[#00d4ff] py-4 font-semibold text-black transition-colors hover:bg-[#00bde4] disabled:opacity-60"
          >
            {busy ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Ajout en cours...
              </>
            ) : (
              <>
                <Zap className="h-5 w-5" />
                Ajouter les minutes
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
