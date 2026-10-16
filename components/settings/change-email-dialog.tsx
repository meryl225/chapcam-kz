'use client'

import { useState, type FormEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function describeError(message: string) {
  const m = message.toLowerCase()
  if (m.includes('already') || m.includes('registered') || m.includes('exists')) {
    return 'Cette adresse est déjà utilisée par un autre compte.'
  }
  if (m.includes('rate') || m.includes('seconds')) {
    return 'Trop de demandes. Patiente une minute avant de réessayer.'
  }
  if (m.includes('invalid')) return 'Adresse email invalide.'
  return 'La modification a échoué. Réessaie dans un instant.'
}

export function ChangeEmailDialog({
  open,
  onOpenChange,
  currentEmail,
  onRequested,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentEmail: string
  onRequested: (newEmail: string) => void
}) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sentTo, setSentTo] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleOpenChange = (next: boolean) => {
    if (submitting) return
    if (!next) {
      setEmail('')
      setError('')
      setSentTo('')
    }
    onOpenChange(next)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const value = email.trim().toLowerCase()
    setError('')

    if (!EMAIL_PATTERN.test(value)) {
      setError('Saisis une adresse email valide.')
      return
    }
    if (value === currentEmail.trim().toLowerCase()) {
      setError('Cette adresse est déjà celle de ton compte.')
      return
    }

    setSubmitting(true)
    const { error: updateError } = await createClient().auth.updateUser(
      { email: value },
      { emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard/settings` },
    )
    setSubmitting(false)

    if (updateError) {
      setError(describeError(updateError.message))
      return
    }
    setSentTo(value)
    onRequested(value)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier l&apos;email</DialogTitle>
          <DialogDescription>
            {sentTo
              ? 'Demande enregistrée. Confirme le changement depuis ta boîte mail.'
              : `Adresse actuelle : ${currentEmail}`}
          </DialogDescription>
        </DialogHeader>

        {sentTo ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm leading-relaxed text-foreground" role="status">
              Un lien de confirmation a été envoyé à <span className="font-medium break-all">{sentTo}</span>. Si
              demandé, confirme aussi depuis ton ancienne adresse. Ton email changera uniquement après confirmation.
            </p>
            <DialogFooter>
              <button
                type="button"
                onClick={() => handleOpenChange(false)}
                className="min-h-11 rounded-2xl bg-primary px-5 text-sm font-medium text-primary-foreground"
              >
                Fermer
              </button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-email">Nouvelle adresse email</Label>
              <Input
                id="new-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 text-base"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'new-email-error' : undefined}
                disabled={submitting}
                required
              />
              {error && (
                <p id="new-email-error" className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
            </div>
            <DialogFooter className="gap-2">
              <button
                type="button"
                onClick={() => handleOpenChange(false)}
                disabled={submitting}
                className="min-h-11 rounded-2xl border border-hairline-strong px-5 text-sm text-foreground hover:bg-muted disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                {submitting && <Spinner className="size-4" />}
                {submitting ? 'Envoi…' : 'Envoyer le lien'}
              </button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
