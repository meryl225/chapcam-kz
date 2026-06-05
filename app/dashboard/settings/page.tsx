'use client'

import { useEffect, useState } from 'react'
import { Settings, User, Bell, Shield, Trash2, LogOut, Palette } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'
import { ThemeToggleSegmented } from '@/components/theme-toggle'

export default function SettingsPage() {
  const [userData, setUserData] = useState<any>(null)
  const [planData, setPlanData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient(
    'https://ojmzqokffbptmcktnwdy.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qbXpxb2tmZmJwdG1ja3Rud2R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMTAzNTYsImV4cCI6MjA5NDg4NjM1Nn0.e9sk4b_15ge2LIIQwFpXC3n_q48ctu9IJ6oJxV85kgw'
  )

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setUserData(user)

      // Récupérer le plan et les infos
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (subscription) setPlanData(subscription)

      setLoading(false)
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="p-6 text-foreground flex items-center justify-center min-h-screen">
        Chargement des paramètres...
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-10">
        <h1 className="flex items-center gap-3 text-3xl font-bold text-foreground">
          <Settings className="h-8 w-8 text-primary" />
          PARAMÈTRES
        </h1>
        <p className="mt-2 text-muted-foreground">Gère ton compte et tes préférences</p>
      </div>

      <div className="space-y-8">
        {/* Apparence */}
        <div className="rounded-3xl border border-hairline bg-card p-8">
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
        </div>

        {/* Compte */}
        <div className="rounded-3xl border border-hairline bg-card p-8">
          <h2 className="flex items-center gap-3 text-xl font-bold text-foreground mb-6">
            <User className="h-6 w-6 text-primary" />
            Informations du compte
          </h2>
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-muted-foreground text-sm">Email</p>
                <p className="text-foreground mt-1">{userData?.email}</p>
              </div>
              <button className="text-primary hover:underline text-sm">Modifier</button>
            </div>

            <div className="flex justify-between items-center">
              <div>
                <p className="text-muted-foreground text-sm">Plan actuel</p>
                <p className="text-foreground mt-1 capitalize font-medium">
                  {planData?.plan || 'Gratuit'}
                </p>
              </div>
              <a 
                href="/dashboard/plans" 
                className="text-primary hover:underline text-sm flex items-center gap-1"
              >
                Changer de plan →
              </a>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="rounded-3xl border border-hairline bg-card p-8">
          <h2 className="flex items-center gap-3 text-xl font-bold text-foreground mb-6">
            <Bell className="h-6 w-6 text-primary" />
            Notifications
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-foreground">Notifications par email</p>
              <p className="text-sm text-muted-foreground">Recevoir les mises à jour importantes</p>
            </div>
            <div className="w-12 h-7 bg-primary rounded-full relative cursor-pointer">
              <div className="absolute right-1 top-1 w-5 h-5 bg-white rounded-full shadow"></div>
            </div>
          </div>
        </div>

        {/* Sécurité */}
        <div className="rounded-3xl border border-hairline bg-card p-8">
          <h2 className="flex items-center gap-3 text-xl font-bold text-foreground mb-6">
            <Shield className="h-6 w-6 text-primary" />
            Sécurité
          </h2>
          <button className="w-full py-4 text-foreground border border-hairline-strong rounded-2xl hover:bg-muted transition-all">
            Changer mon mot de passe
          </button>
        </div>

        {/* Zone dangereuse */}
        <div className="rounded-3xl border border-red-500/30 bg-card p-8">
          <h2 className="flex items-center gap-3 text-xl font-bold text-red-400 mb-6">
            <Trash2 className="h-6 w-6" />
            Zone dangereuse
          </h2>
          <p className="text-muted-foreground mb-6 text-sm">
            Supprimer ton compte est une action irréversible.<br />
            Toutes tes données seront perdues définitivement.
          </p>
          <button className="w-full py-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500 text-red-400 rounded-2xl transition-all font-medium">
            Supprimer mon compte
          </button>
        </div>
      </div>
    </div>
  )
}
