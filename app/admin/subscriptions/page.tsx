'use client'

import { useState } from 'react'
import { UserPlus, Loader2, ArrowLeft, Check, UserMinus, Trash2, Droplet, DropletOff } from 'lucide-react'
import Link from 'next/link'
import { PLANS } from '@/lib/plans'
import { LIVE_OFFERS } from '@/lib/live-offers'

export default function AdminSubscriptionsPage() {
  const [email, setEmail] = useState('')
  const [plan, setPlan] = useState(PLANS[0]?.id ?? 'starter')
  const [durationDays, setDurationDays] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)
  const [removeEmail, setRemoveEmail] = useState('')
  const [removing, setRemoving] = useState(false)
  const [wmEmail, setWmEmail] = useState('')
  const [wmBusy, setWmBusy] = useState<'on' | 'off' | null>(null)

  const selectedPlan = PLANS.find((p) => p.id === plan)
  const selectedLiveOffer = LIVE_OFFERS.find((o) => o.id === plan)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setToast(null)
    try {
      const res = await fetch('/api/admin/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          plan,
          durationDays: durationDays ? Number(durationDays) : undefined,
          expiresAt: expiresAt || undefined,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setToast({ type: 'ok', msg: data.message || 'Abonnement active' })
        setEmail('')
        setDurationDays('')
        setExpiresAt('')
      } else {
        setToast({ type: 'err', msg: data.error || 'Erreur' })
      }
    } catch {
      setToast({ type: 'err', msg: 'Erreur de connexion' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemove = async (e: React.FormEvent) => {
    e.preventDefault()
    const email = removeEmail.trim()
    if (!email) return
    if (!confirm(`Retirer l'abonnement de ${email} ? L'acces sera coupe immediatement.`)) return
    setRemoving(true)
    setToast(null)
    try {
      const res = await fetch('/api/admin/subscriptions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (res.ok) {
        setToast({ type: 'ok', msg: data.message || 'Abonnement retire' })
        setRemoveEmail('')
      } else {
        setToast({ type: 'err', msg: data.error || 'Erreur' })
      }
    } catch {
      setToast({ type: 'err', msg: 'Erreur de connexion' })
    } finally {
      setRemoving(false)
    }
  }

  const handleWatermark = async (noWatermark: boolean) => {
    const target = wmEmail.trim()
    if (!target) {
      setToast({ type: 'err', msg: 'Entrez l\'email du client Premium.' })
      return
    }
    setWmBusy(noWatermark ? 'on' : 'off')
    setToast(null)
    try {
      const res = await fetch('/api/admin/subscriptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: target, noWatermark }),
      })
      const data = await res.json()
      if (res.ok) {
        setToast({ type: 'ok', msg: data.message || 'Mise a jour effectuee' })
      } else {
        setToast({ type: 'err', msg: data.error || 'Erreur' })
      }
    } catch {
      setToast({ type: 'err', msg: 'Erreur de connexion' })
    } finally {
      setWmBusy(null)
    }
  }

  const inputClass =
    'w-full rounded-xl border border-gray-700 bg-[#0a0a0a] px-4 py-3 text-white outline-none transition-colors focus:border-[#00ff88]'
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
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#00ff88]/15">
            <UserPlus className="h-6 w-6 text-[#00ff88]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Ajouter un abonnement</h1>
            <p className="text-sm text-gray-400">
              Activez manuellement un abonnement Premium pour un utilisateur.
            </p>
          </div>
        </div>

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
            <p className="mt-1 text-xs text-gray-500">
              Le compte doit deja exister avec cet email.
            </p>
          </div>

          <div>
            <label className={labelClass}>Type d&apos;abonnement</label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value as typeof plan)}
              className={inputClass}
            >
              <optgroup label="Abonnements (points Decart)">
                {PLANS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.points.toLocaleString()} pts ({p.duration})
                  </option>
                ))}
              </optgroup>
              <optgroup label="Acces Live Pro (fenetre temps reel)">
                {LIVE_OFFERS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} — {o.price.toLocaleString()} FCFA ({o.windowMinutes} min)
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {selectedLiveOffer ? (
            <>
              <div>
                <label className={labelClass}>
                  Nombre de fenetres <span className="text-gray-500">facultatif</span>
                </label>
                <input
                  type="number"
                  min={1}
                  value={durationDays}
                  onChange={(e) => setDurationDays(e.target.value)}
                  className={inputClass}
                  placeholder="1"
                />
              </div>
              <p className="rounded-lg border border-gray-800 bg-[#0a0a0a] px-3 py-2 text-xs text-gray-500">
                Acces Live Pro : chaque fenetre ouvre {selectedLiveOffer.windowMinutes} min
                d&apos;utilisation (le chrono demarre au premier lancement par le client). Aucun
                point n&apos;est credite. Par defaut, 1 fenetre est accordee.
              </p>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>
                    Duree (jours) <span className="text-gray-500">facultatif</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={durationDays}
                    onChange={(e) => setDurationDays(e.target.value)}
                    className={inputClass}
                    placeholder={String(selectedPlan?.durationDays ?? 30)}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    Date d&apos;expiration <span className="text-gray-500">facultatif</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <p className="rounded-lg border border-gray-800 bg-[#0a0a0a] px-3 py-2 text-xs text-gray-500">
                Si aucune valeur n&apos;est saisie, la duree par defaut de la formule (
                {selectedPlan?.duration}) est appliquee. Une date d&apos;expiration explicite est
                prioritaire sur la duree en jours.
              </p>
            </>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex items-center justify-center gap-2 rounded-2xl bg-[#00ff88] py-4 font-semibold text-black transition-colors hover:bg-[#00dd77] disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Activation...
              </>
            ) : (
              <>
                <Check className="h-5 w-5" />
                Activer l&apos;abonnement
              </>
            )}
          </button>
        </form>

        <div className="mt-8 rounded-2xl border border-red-500/30 bg-[#160a0a] p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/15">
              <UserMinus className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Retirer un abonnement</h2>
              <p className="text-sm text-gray-400">
                Coupe immediatement l&apos;acces Premium d&apos;un utilisateur via son email.
              </p>
            </div>
          </div>

          <form onSubmit={handleRemove} className="flex flex-col gap-4">
            <div>
              <label className={labelClass}>Email de l&apos;utilisateur</label>
              <input
                type="email"
                required
                value={removeEmail}
                onChange={(e) => setRemoveEmail(e.target.value)}
                className="w-full rounded-xl border border-gray-700 bg-[#0a0a0a] px-4 py-3 text-white outline-none transition-colors focus:border-red-500"
                placeholder="utilisateur@exemple.com"
              />
              <p className="mt-1 text-xs text-gray-500">
                L&apos;abonnement est marque comme annule, les points sont remis a zero et
                l&apos;acces expire immediatement.
              </p>
            </div>

            <button
              type="submit"
              disabled={removing}
              className="flex items-center justify-center gap-2 rounded-2xl bg-red-500 py-4 font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-60"
            >
              {removing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Suppression...
                </>
              ) : (
                <>
                  <Trash2 className="h-5 w-5" />
                  Retirer l&apos;abonnement
                </>
              )}
            </button>
          </form>
        </div>

        <div className="mt-8 rounded-2xl border border-sky-500/30 bg-[#0a1420] p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/15">
              <DropletOff className="h-6 w-6 text-sky-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Retrait du watermark (Premium)</h2>
              <p className="text-sm text-gray-400">
                Reserve au forfait Premium (50 000 F). L&apos;Ultimate (85 000 F) est deja sans
                watermark automatiquement.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <label className={labelClass}>Email du client Premium</label>
              <input
                type="email"
                value={wmEmail}
                onChange={(e) => setWmEmail(e.target.value)}
                className="w-full rounded-xl border border-gray-700 bg-[#0a0a0a] px-4 py-3 text-white outline-none transition-colors focus:border-sky-500"
                placeholder="utilisateur@exemple.com"
              />
              <p className="mt-1 text-xs text-gray-500">
                Active ou desactive le rendu sans watermark pour ce client. Prise en compte au
                prochain lancement de swap.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => handleWatermark(true)}
                disabled={wmBusy !== null}
                className="flex items-center justify-center gap-2 rounded-2xl bg-sky-500 py-4 font-semibold text-white transition-colors hover:bg-sky-600 disabled:opacity-60"
              >
                {wmBusy === 'on' ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <DropletOff className="h-5 w-5" />
                )}
                Activer sans watermark
              </button>
              <button
                type="button"
                onClick={() => handleWatermark(false)}
                disabled={wmBusy !== null}
                className="flex items-center justify-center gap-2 rounded-2xl border border-gray-700 bg-[#0a0a0a] py-4 font-semibold text-gray-200 transition-colors hover:border-gray-500 disabled:opacity-60"
              >
                {wmBusy === 'off' ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Droplet className="h-5 w-5" />
                )}
                Remettre le watermark
              </button>
            </div>
          </div>
        </div>
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
