'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { User as AuthUser } from '@supabase/supabase-js'
import { Settings, User, Bell, Shield, Trash2, Palette } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggleSegmented } from '@/components/theme-toggle'
import { Switch } from '@/components/ui/switch'
import { ChangeEmailDialog } from '@/components/settings/change-email-dialog'
import { ChangePasswordDialog } from '@/components/settings/change-password-dialog'
import { DeleteAccountDialog } from '@/components/settings/delete-account-dialog'
import { resolveActivePlan, type ActivePlan, type SubscriptionRow } from '@/components/settings/plan-utils'

type Dialog = 'email' | 'password' | 'delete' | null

export default function SettingsPage() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [plan, setPlan] = useState<ActivePlan | null>(null)
  const [planError, setPlanError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState<Dialog>(null)
  const [pendingEmail, setPendingEmail] = useState('')
  const [savingNotif, setSavingNotif] = useState(false)
  const [notifError, setNotifError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    const load = async () => {
      const { data: { user: current } } = await supabase.auth.getUser()
      if (cancelled) return
      if (!current) {
        setLoading(false)
        return
      }
      setUser(current)
      setPendingEmail(current.new_email ?? '')

      const { data, error } = await supabase
        .from('subscriptions')
        .select('plan, is_active, status, expires_at, end_date')
        .eq('user_id', current.id)
        .maybeSingle()
      if (cancelled) return
      if (error) setPlanError(true)
      else setPlan(resolveActivePlan(data as SubscriptionRow | null))
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  // Campaign senders skip accounts whose preference is explicitly false, so an
  // unset preference really means "receiving".
  const notifPref = user?.user_metadata?.email_notifications
  const notificationsOn = notifPref !== false

  const toggleNotifications = async (next: boolean) => {
    if (!user || savingNotif) return
    setNotifError('')
    setSavingNotif(true)
    const { data, error } = await createClient().auth.updateUser({ data: { email_notifications: next } })
    setSavingNotif(false)
    if (error || !data.user) {
      setNotifError('Enregistrement impossible. Réessaie.')
      return
    }
    setUser(data.user)
  }

  if (loading) {
    return (
      <div className="p-6 text-foreground flex items-center justify-center min-h-screen" role="status">
        Chargement des paramètres...
      </div>
    )
  }

  if (!user) {
    return (
      <div className="p-6 text-foreground flex flex-col items-center justify-center gap-4 min-h-screen text-center">
        <p>Ta session a expiré.</p>
        <Link href="/auth/login" className="text-primary hover:underline">
          Se reconnecter
        </Link>
      </div>
    )
  }

  const email = user.email ?? ''

  return (
    // Bottom padding keeps the last buttons clear of the floating support button.
    <div className="mx-auto max-w-3xl px-4 pt-6 pb-32 sm:p-6 sm:pb-32">
      <div className="mb-8 sm:mb-10">
        <h1 className="flex items-center gap-3 text-2xl sm:text-3xl font-bold text-foreground">
          <Settings className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
          PARAMÈTRES
        </h1>
        <p className="mt-2 text-muted-foreground">Gère ton compte et tes préférences</p>
      </div>

      <div className="flex flex-col gap-6 sm:gap-8">
        {/* Apparence */}
        <section className="rounded-3xl border border-hairline bg-card p-5 sm:p-8">
          <h2 className="flex items-center gap-3 text-xl font-bold text-foreground mb-6">
            <Palette className="h-6 w-6 text-primary" />
            Apparence
          </h2>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-foreground">Thème de l&apos;interface</p>
              <p className="text-sm text-muted-foreground">Choisis entre le mode clair et le mode sombre</p>
            </div>
            <ThemeToggleSegmented />
          </div>
        </section>

        {/* Compte */}
        <section className="rounded-3xl border border-hairline bg-card p-5 sm:p-8">
          <h2 className="flex items-center gap-3 text-xl font-bold text-foreground mb-6">
            <User className="h-6 w-6 text-primary" />
            Informations du compte
          </h2>
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-muted-foreground text-sm">Email</p>
                <p className="text-foreground mt-1 break-all">{email}</p>
                {pendingEmail && (
                  <p className="mt-1 text-xs text-muted-foreground break-all">
                    En attente de confirmation : {pendingEmail}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOpenDialog('email')}
                className="shrink-0 min-h-11 px-2 -mr-2 text-primary hover:underline text-sm"
              >
                Modifier
              </button>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-muted-foreground text-sm">Plan actuel</p>
                <p className="text-foreground mt-1 font-medium">
                  {planError ? 'Impossible de charger ton forfait' : plan ? plan.name : 'Aucun abonnement actif'}
                </p>
                {plan?.expiresAt && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Valable jusqu&apos;au {plan.expiresAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
              </div>
              <Link
                href="/dashboard/plans"
                className="shrink-0 min-h-11 px-2 -mr-2 text-primary hover:underline text-sm flex items-center gap-1"
              >
                {plan ? 'Changer de plan →' : 'Voir les plans →'}
              </Link>
            </div>
          </div>
        </section>

        {/* Notifications */}
        <section className="rounded-3xl border border-hairline bg-card p-5 sm:p-8">
          <h2 className="flex items-center gap-3 text-xl font-bold text-foreground mb-6">
            <Bell className="h-6 w-6 text-primary" />
            Notifications
          </h2>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <label htmlFor="email-notifications" className="text-foreground">
                Notifications par email
              </label>
              <p className="text-sm text-muted-foreground">
                {savingNotif
                  ? 'Enregistrement…'
                  : notificationsOn
                    ? 'Tu reçois les annonces et nouveautés ChapCam'
                    : 'Tu ne reçois plus les annonces ChapCam'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Les emails liés à ton compte (sécurité, paiements) restent toujours envoyés.
              </p>
              {notifError && (
                <p className="mt-1 text-sm text-destructive" role="alert">
                  {notifError}
                </p>
              )}
            </div>
            <Switch
              id="email-notifications"
              checked={notificationsOn}
              onCheckedChange={toggleNotifications}
              disabled={savingNotif}
              className="shrink-0 scale-125 data-[state=unchecked]:border-border"
            />
          </div>
        </section>

        {/* Sécurité */}
        <section className="rounded-3xl border border-hairline bg-card p-5 sm:p-8">
          <h2 className="flex items-center gap-3 text-xl font-bold text-foreground mb-6">
            <Shield className="h-6 w-6 text-primary" />
            Sécurité
          </h2>
          <button
            type="button"
            onClick={() => setOpenDialog('password')}
            className="w-full py-4 text-foreground border border-hairline-strong rounded-2xl hover:bg-muted transition-all"
          >
            Changer mon mot de passe
          </button>
        </section>

        {/* Zone dangereuse */}
        <section className="rounded-3xl border border-red-500/30 bg-card p-5 sm:p-8">
          <h2 className="flex items-center gap-3 text-xl font-bold text-red-400 mb-6">
            <Trash2 className="h-6 w-6" />
            Zone dangereuse
          </h2>
          <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
            Supprimer ton compte est une action irréversible.
            <br />
            Toutes tes données seront perdues définitivement.
          </p>
          <button
            type="button"
            onClick={() => setOpenDialog('delete')}
            className="w-full py-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500 text-red-400 rounded-2xl transition-all font-medium"
          >
            Supprimer mon compte
          </button>
        </section>
      </div>

      <ChangeEmailDialog
        open={openDialog === 'email'}
        onOpenChange={(o) => setOpenDialog(o ? 'email' : null)}
        currentEmail={email}
        onRequested={setPendingEmail}
      />
      <ChangePasswordDialog
        open={openDialog === 'password'}
        onOpenChange={(o) => setOpenDialog(o ? 'password' : null)}
        email={email}
      />
      <DeleteAccountDialog
        open={openDialog === 'delete'}
        onOpenChange={(o) => setOpenDialog(o ? 'delete' : null)}
        activePlanName={plan?.name ?? null}
      />
    </div>
  )
}
