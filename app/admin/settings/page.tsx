'use client'

import { useEffect, useState } from 'react'
import { Settings, Loader2, Save, ArrowLeft, Link2 } from 'lucide-react'
import Link from 'next/link'

interface WaveLink {
  plan: string
  label: string
  amount: number
  wave_url: string
}

export default function AdminSettingsPage() {
  const [links, setLinks] = useState<WaveLink[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

  useEffect(() => {
    fetch('/api/admin/wave-links')
      .then((r) => r.json())
      .then((d) => {
        if (d.links) setLinks(d.links)
        else if (d.error) setToast({ type: 'err', msg: d.error })
      })
      .catch(() => setToast({ type: 'err', msg: 'Erreur de chargement' }))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(t)
    }
  }, [toast])

  const updateLink = (plan: string, url: string) => {
    setLinks((prev) => prev.map((l) => (l.plan === plan ? { ...l, wave_url: url } : l)))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/wave-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          links: links.map((l) => ({ plan: l.plan, wave_url: l.wave_url })),
        }),
      })
      const data = await res.json()
      if (res.ok) setToast({ type: 'ok', msg: data.message || 'Enregistre' })
      else setToast({ type: 'err', msg: data.error || 'Erreur' })
    } catch {
      setToast({ type: 'err', msg: 'Erreur de connexion' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/admin/payments"
          className="mb-6 inline-flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux paiements
        </Link>

        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#00ff88]/15">
            <Settings className="h-6 w-6 text-[#00ff88]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Liens de paiement Wave</h1>
            <p className="text-sm text-gray-400">
              Modifiez les liens sans toucher au code. Les changements sont immediats.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-500">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {links.map((l) => (
              <div key={l.plan} className="rounded-2xl border border-gray-800 bg-[#111] p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-semibold capitalize text-white">{l.label}</span>
                  <span className="rounded-full border border-gray-700 bg-[#0a0a0a] px-3 py-1 text-sm font-medium text-[#00ff88]">
                    {l.amount.toLocaleString()} FCFA
                  </span>
                </div>
                <div className="relative">
                  <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <input
                    type="url"
                    value={l.wave_url}
                    onChange={(e) => updateLink(l.plan, e.target.value)}
                    placeholder="https://pay.wave.com/..."
                    className="w-full rounded-xl border border-gray-700 bg-[#0a0a0a] py-3 pl-10 pr-4 text-white outline-none transition-colors focus:border-[#00ff88]"
                  />
                </div>
              </div>
            ))}

            <button
              onClick={handleSave}
              disabled={saving}
              className="mt-2 flex items-center justify-center gap-2 rounded-2xl bg-[#00ff88] py-4 font-semibold text-black transition-colors hover:bg-[#00dd77] disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  Enregistrer les liens
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border px-5 py-3 text-sm font-medium shadow-lg ${
            toast.type === 'ok'
              ? 'border-[#00ff88]/40 bg-[#0a1f15] text-[#00ff88]'
              : 'border-red-500/40 bg-[#1f0a0a] text-red-400'
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  )
}
