'use client'

import { useState } from 'react'
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

const CONFIRM_WORD = 'SUPPRIMER'

export function DeleteAccountDialog({
  open,
  onOpenChange,
  activePlanName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  activePlanName: string | null
}) {
  const [typed, setTyped] = useState('')
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)

  const confirmed = typed.trim().toUpperCase() === CONFIRM_WORD

  const handleOpenChange = (value: boolean) => {
    if (deleting) return
    if (!value) {
      setTyped('')
      setError('')
    }
    onOpenChange(value)
  }

  const handleDelete = async () => {
    if (!confirmed || deleting) return
    setError('')
    setDeleting(true)
    const supabase = createClient()

    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) {
        setError('Session expirée. Reconnecte-toi puis réessaie.')
        setDeleting(false)
        return
      }

      // Same server process as the iOS app: verifies the token, removes or
      // anonymises the data, then deletes the Supabase Auth user.
      const response = await fetch('/api/mobile/account/delete', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok || result?.deleted !== true) {
        setError('La suppression a échoué. Ton compte est intact, réessaie ou contacte le support.')
        setDeleting(false)
        return
      }

      await supabase.auth.signOut().catch(() => {})
      window.location.replace('/')
    } catch {
      setError('Connexion impossible. Ton compte est intact, réessaie.')
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-red-500">Supprimer mon compte</DialogTitle>
          <DialogDescription>
            Cette action est irréversible. Ton compte, tes créations, tes avatars et tes jetons seront supprimés.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-hairline bg-muted/40 p-4 text-sm leading-relaxed text-foreground">
            {activePlanName ? (
              <p>
                Ton forfait <span className="font-medium">{activePlanName}</span> est encore actif. Il sera perdu sans
                remboursement automatique.
              </p>
            ) : (
              <p>Aucun forfait actif n&apos;est associé à ton compte.</p>
            )}
            <p className="mt-2 text-muted-foreground">
              Abonnement souscrit depuis l&apos;iPhone ? La suppression du compte ne l&apos;arrête pas : annule-le dans
              Réglages, puis ton nom, puis Abonnements. Les forfaits payés sur le site ne se renouvellent pas.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="delete-confirm">
              Pour confirmer, saisis <span className="font-semibold">{CONFIRM_WORD}</span>
            </Label>
            <Input
              id="delete-confirm"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              className="h-11 text-base"
              disabled={deleting}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <button
            type="button"
            onClick={() => handleOpenChange(false)}
            disabled={deleting}
            className="min-h-11 rounded-2xl border border-hairline-strong px-5 text-sm text-foreground hover:bg-muted disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!confirmed || deleting}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-red-500 bg-red-500/10 px-5 text-sm font-medium text-red-500 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting && <Spinner className="size-4" />}
            {deleting ? 'Suppression…' : 'Supprimer définitivement'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
