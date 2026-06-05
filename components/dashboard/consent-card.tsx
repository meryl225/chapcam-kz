'use client'

import { useState } from 'react'
import { ShieldCheck, Check, Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const STATEMENTS = [
  "J'utilise uniquement des images pour lesquelles je dispose des droits nécessaires.",
  "Je ne vais pas usurper l'identité d'une personne réelle.",
  'Je comprends que les utilisations frauduleuses sont interdites et peuvent entraîner la suspension du compte.',
]

export function ConsentCard({ initiallyAccepted }: { initiallyAccepted: boolean }) {
  const [accepted, setAccepted] = useState(initiallyAccepted)
  const [reviewing, setReviewing] = useState(false)
  const [checks, setChecks] = useState<boolean[]>([
    initiallyAccepted,
    initiallyAccepted,
    initiallyAccepted,
  ])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Etat confirme : on affiche un resume compact + un bouton pour rouvrir.
  if (accepted && !reviewing) {
    return (
      <section
        aria-label="Engagements confirmes"
        className="mb-8 flex flex-col gap-3 rounded-2xl border border-hairline bg-card p-4 sm:flex-row sm:items-center sm:justify-between md:px-6"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Engagements d’utilisation confirmés</p>
            <p className="text-xs text-muted-foreground">
              Vous avez accepté les conditions d’utilisation responsable de ChapCam.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setReviewing(true)}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-hairline bg-background/40 px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          <Pencil className="h-4 w-4" aria-hidden />
          Revoir mes engagements
        </button>
      </section>
    )
  }

  const allChecked = checks.every(Boolean)

  const toggle = (i: number) =>
    setChecks((prev) => prev.map((v, idx) => (idx === i ? !v : v)))

  async function handleConfirm() {
    if (!allChecked || saving) return
    setSaving(true)
    setError(null)
    try {
      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          consent_accepted: true,
          consent_accepted_at: new Date().toISOString(),
          consent_version: '2026-06',
        },
      })
      if (updateError) throw updateError
      setAccepted(true)
      setReviewing(false)
    } catch {
      setError('Impossible d’enregistrer votre confirmation. Réessayez.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section
      aria-label="Confirmation d’utilisation responsable"
      className="mb-8 rounded-2xl border border-primary/30 bg-card p-6 md:p-7"
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
          <ShieldCheck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Utilisation responsable</h2>
          <p className="text-sm text-muted-foreground">
            Merci de confirmer ces engagements avant d’utiliser ChapCam.
          </p>
        </div>
      </div>

      <ul className="flex flex-col gap-3">
        {STATEMENTS.map((text, i) => (
          <li key={i}>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-hairline bg-background/40 p-3 transition-colors hover:border-primary/30">
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                  checks[i]
                    ? 'border-primary bg-primary text-black'
                    : 'border-hairline bg-transparent'
                }`}
              >
                {checks[i] && <Check className="h-3.5 w-3.5" aria-hidden />}
              </span>
              <input
                type="checkbox"
                className="sr-only"
                checked={checks[i]}
                onChange={() => toggle(i)}
              />
              <span className="text-sm leading-relaxed text-foreground">{text}</span>
            </label>
          </li>
        ))}
      </ul>

      {error && (
        <p className="mt-3 text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!allChecked || saving}
          className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 font-bold text-black transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? 'Enregistrement…' : 'Je confirme'}
        </button>
        {accepted && (
          <button
            type="button"
            onClick={() => setReviewing(false)}
            disabled={saving}
            className="inline-flex items-center justify-center rounded-xl border border-hairline px-6 py-3 font-semibold text-foreground transition-colors hover:border-primary/40 disabled:opacity-40"
          >
            Annuler
          </button>
        )}
      </div>
    </section>
  )
}
