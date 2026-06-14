'use client'

import { useState } from 'react'
import { Flag, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'

const MOTIFS = [
  'Usurpation d’identité',
  'Escroquerie ou fraude',
  'Cybercriminalité',
  'Désinformation / deepfake trompeur',
  'Atteinte à la réputation ou à la vie privée',
  'Contenu intime non consenti',
  'Autre',
]

export function ReportForm() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    contentUrl: '',
    reason: '',
    description: '',
  })
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const update = (key: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => setForm((prev) => ({ ...prev, [key]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (status === 'sending') return
    setStatus('sending')
    setErrorMsg(null)
    try {
      const res = await fetch('/api/report-abuse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? 'Échec de l’envoi')
      }
      setStatus('success')
      setForm({ name: '', email: '', contentUrl: '', reason: '', description: '' })
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Une erreur est survenue')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-primary/30 bg-card p-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
          <CheckCircle2 className="h-7 w-7 text-primary" aria-hidden />
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground">Signalement envoyé</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Merci. Notre équipe examinera votre signalement dans les plus brefs délais.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setStatus('idle')}
          className="text-sm font-semibold text-primary hover:underline"
        >
          Envoyer un autre signalement
        </button>
      </div>
    )
  }

  const inputClass =
    'w-full rounded-xl border border-hairline bg-background/60 px-4 py-3 text-sm text-foreground placeholder:text-text-faint transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40'

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-hairline bg-card p-6 md:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="report-name" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Nom
          </label>
          <input
            id="report-name"
            type="text"
            required
            value={form.name}
            onChange={update('name')}
            placeholder="Votre nom"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="report-email" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Email
          </label>
          <input
            id="report-email"
            type="email"
            required
            value={form.email}
            onChange={update('email')}
            placeholder="vous@email.com"
            className={inputClass}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <label htmlFor="report-url" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Lien du contenu
        </label>
        <input
          id="report-url"
          type="url"
          value={form.contentUrl}
          onChange={update('contentUrl')}
          placeholder="https://..."
          className={inputClass}
        />
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <label htmlFor="report-reason" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Motif du signalement
        </label>
        <select
          id="report-reason"
          required
          value={form.reason}
          onChange={update('reason')}
          className={inputClass}
        >
          <option value="" disabled>
            Sélectionnez un motif
          </option>
          {MOTIFS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <label htmlFor="report-desc" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Description
        </label>
        <textarea
          id="report-desc"
          required
          rows={5}
          value={form.description}
          onChange={update('description')}
          placeholder="Décrivez le contenu signalé et le préjudice constaté…"
          className={`${inputClass} resize-y`}
        />
      </div>

      {status === 'error' && (
        <p className="mt-4 flex items-center gap-2 text-sm text-destructive" role="alert">
          <AlertTriangle className="h-4 w-4" aria-hidden />
          {errorMsg}
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'sending'}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 font-bold text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {status === 'sending' ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            Envoi en cours…
          </>
        ) : (
          <>
            <Flag className="h-5 w-5" aria-hidden />
            Envoyer le signalement
          </>
        )}
      </button>

      <p className="mt-4 text-xs leading-relaxed text-text-faint">
        CHAPCAM se réserve le droit de retirer tout contenu contraire à ses conditions d’utilisation.
      </p>
    </form>
  )
}
