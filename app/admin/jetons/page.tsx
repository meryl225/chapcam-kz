'use client'

import { useState } from 'react'
import { Coins, Loader2, ArrowLeft, Check, AlertCircle } from 'lucide-react'
import Link from 'next/link'

const PRESETS = [50, 200, 500, 1000, 5000]

export default function AdminJetonsPage() {
  const [email, setEmail] = useState('')
  const [jetons, setJetons] = useState('')
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const target = email.trim()
    const amount = Number(jetons)
    if (!target || !Number.isInteger(amount) || amount < 1 || amount > 1_000_000) {
      setToast({ type: 'err', msg: 'Entrez un email valide et un nombre entier de jetons entre 1 et 1 000 000.' })
      return
    }
    setBusy(true)
    setToast(null)
    try {
      const res = await fetch('/api/admin/jetons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: target, jetons: amount }),
      })
      const data = await res.json()
      if (res.ok) {
        setToast({ type: 'ok', msg: data.message || 'Jetons ajoutes' })
        setEmail('')
        setJetons('')
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
    'w-full rounded-xl border border-gray-700 bg-[#0a0a0a] px-4 py-3 text-white outline-none transition-colors focus:border-[#ffb300]'
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
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#ffb300]/15">
            <Coins className="h-6 w-6 text-[#ffb300]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Ajouter des jetons</h1>
            <p className="text-sm text-gray-400">
              Credite le solde de jetons d&apos;un utilisateur (1 a 1 000 000).
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
            <label className={labelClass}>Jetons a ajouter (1 - 1 000 000)</label>
            <input
              type="number"
              min={1}
              max={1_000_000}
              step={1}
              required
              value={jetons}
              onChange={(e) => setJetons(e.target.value)}
              className={inputClass}
              placeholder="1000"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setJetons(String(p))}
                  className="rounded-lg border border-gray-700 bg-[#0a0a0a] px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:border-[#ffb300] hover:text-white"
                >
                  {p.toLocaleString('fr-FR')}
                </button>
              ))}
            </div>
          </div>

          <p className="rounded-lg border border-[#ffb300]/20 bg-[#1a1405] px-3 py-2 text-xs text-gray-400">
            Les jetons constituent le solde commun utilisable sur tous les outils sauf Live
            Swap. Ils s&apos;ajoutent au solde existant de l&apos;utilisateur et sont
            journalises dans l&apos;historique des jetons.
          </p>

          <button
            type="submit"
            disabled={busy}
            className="flex items-center justify-center gap-2 rounded-2xl bg-[#ffb300] py-4 font-semibold text-black transition-colors hover:bg-[#e6a100] disabled:opacity-60"
          >
            {busy ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Ajout en cours...
              </>
            ) : (
              <>
                <Coins className="h-5 w-5" />
                Ajouter les jetons
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
