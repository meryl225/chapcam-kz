'use client'

import { useState } from 'react'
import { ShieldCheck, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const STATEMENTS = [
  "J'utilise uniquement des images pour lesquelles je dispose des droits nécessaires.",
  "Je ne vais pas usurper l'identité d'une personne réelle.",
  'Je comprends que les utilisations frauduleuses sont interdites et peuvent entraîner la suspension du compte.',
]

export function ConsentCard({ initiallyAccepted }: { initiallyAccepted: boolean }) {
  const [accepted, setAccepted] = useState(initiallyAccepted)
  const [checks, setChecks] = useState<boolean[]>([false, false, false])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (accepted) return null

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

      <button
        type="button"
        onClick={handleConfirm}
        disabled={!allChecked || saving}
        className="mt-5 inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 font-bold text-black transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {saving ? 'Enregistrement…' : 'Je confirme'}
      </button>
    </section>
  )
}
