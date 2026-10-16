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

const MIN_LENGTH = 8

function validate(current: string, next: string, confirm: string) {
  if (!current) return 'Saisis ton mot de passe actuel.'
  if (next.length < MIN_LENGTH) return `Le nouveau mot de passe doit contenir au moins ${MIN_LENGTH} caractères.`
  if (!/[A-Za-z]/.test(next) || !/\d/.test(next)) return 'Utilise au moins une lettre et un chiffre.'
  if (next === current) return 'Le nouveau mot de passe doit être différent de l’actuel.'
  if (next !== confirm) return 'Les deux mots de passe ne correspondent pas.'
  return ''
}

export function ChangePasswordDialog({
  open,
  onOpenChange,
  email,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  email: string
}) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const reset = () => {
    setCurrent('')
    setNext('')
    setConfirm('')
    setError('')
    setDone(false)
  }

  const handleOpenChange = (value: boolean) => {
    if (submitting) return
    if (!value) reset()
    onOpenChange(value)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const problem = validate(current, next, confirm)
    setError(problem)
    if (problem) return

    setSubmitting(true)
    const supabase = createClient()

    // Re-authenticate first so an unattended open session cannot change the password.
    const { error: verifyError } = await supabase.auth.signInWithPassword({ email, password: current })
    if (verifyError) {
      setSubmitting(false)
      setError(
        verifyError.message.toLowerCase().includes('rate')
          ? 'Trop de tentatives. Patiente quelques minutes.'
          : 'Mot de passe actuel incorrect.',
      )
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: next })
    setSubmitting(false)
    if (updateError) {
      const m = updateError.message.toLowerCase()
      setError(
        m.includes('different') || m.includes('same')
          ? 'Le nouveau mot de passe doit être différent de l’actuel.'
          : m.includes('weak') || m.includes('characters')
            ? 'Mot de passe trop faible. Choisis-en un plus long.'
            : 'Le changement a échoué. Réessaie dans un instant.',
      )
      return
    }
    setDone(true)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Changer mon mot de passe</DialogTitle>
          <DialogDescription>
            {done ? 'Ton mot de passe a bien été modifié.' : 'Confirme ton mot de passe actuel, puis choisis-en un nouveau.'}
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <DialogFooter>
            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              className="min-h-11 rounded-2xl bg-primary px-5 text-sm font-medium text-primary-foreground"
            >
              Fermer
            </button>
          </DialogFooter>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
            <div className="flex flex-col gap-2">
              <Label htmlFor="current-password">Mot de passe actuel</Label>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                className="h-11 text-base"
                disabled={submitting}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-password">Nouveau mot de passe</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                className="h-11 text-base"
                aria-describedby="new-password-hint"
                disabled={submitting}
              />
              <p id="new-password-hint" className="text-xs text-muted-foreground">
                Au moins {MIN_LENGTH} caractères, avec une lettre et un chiffre.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirm-password">Confirmer le nouveau mot de passe</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="h-11 text-base"
                disabled={submitting}
              />
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
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
                {submitting ? 'Modification…' : 'Modifier'}
              </button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
