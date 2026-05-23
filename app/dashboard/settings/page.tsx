'use client'

import { useEffect, useState } from 'react'
import { Settings, User, Bell, Shield, Trash2 } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null)
  const [plan, setPlan] = useState('...')
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)

        // Récupérer le plan
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('plan, expires_at')
          .eq('user_id', user.id)
          .single()

        if (subscription) {
          setPlan(subscription.plan || 'Gratuit')
        }
      }
      setLoading(false)
    }

    fetchUserData()
  }, [])

  if (loading) {
    return <div className="p-6 text-white">Chargement...</div>
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-10">
        <h1 className="flex items-center gap-3 text-3xl font-bold text-white">
          <Settings className="h-8 w-8 text-[#00ff88]" />
          PARAMÈTRES
        </h1>
        <p className="mt-2 text-gray-400">Gère ton compte et tes préférences</p>
      </div>

      <div className="space-y-8">
        {/* Section Compte */}
        <div className="rounded-2xl border border-white/10 bg-[#111] p-8">
          <h2 className="flex items-center gap-3 text-xl font-bold text-white mb-6">
            <User className="h-6 w-6" />
            Informations du compte
          </h2>
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-gray-400 text-sm">Email</p>
                <p className="text-white mt-1">{user?.email || 'Non défini'}</p>
              </div>
              <button className="text-[#00ff88] text-sm hover:underline">Modifier</button>
            </div>

            <div className="flex justify-between items-center">
              <div>
                <p className="text-gray-400 text-sm">Plan actuel</p>
                <p className="text-white mt-1 capitalize">{plan}</p>
              </div>
              <a href="/dashboard/plans" className="text-[#00ff88] text-sm hover:underline">
                Changer de plan →
              </a>
            </div>
          </div>
        </div>

        {/* Section Notifications */}
        <div className="rounded-2xl border border-white/10 bg-[#111] p-8">
          <h2 className="flex items-center gap-3 text-xl font-bold text-white mb-6">
            <Bell className="h-6 w-6" />
            Notifications
          </h2>
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white">Notifications par email</p>
                <p className="text-sm text-gray-400">Recevoir les mises à jour importantes</p>
              </div>
              <div className="w-12 h-6 bg-[#00ff88] rounded-full relative cursor-pointer">
                <div className="absolute right-1 top-1 w-4 h-4 bg-black rounded-full"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Section Sécurité */}
        <div className="rounded-2xl border border-white/10 bg-[#111] p-8">
          <h2 className="flex items-center gap-3 text-xl font-bold text-white mb-6">
            <Shield className="h-6 w-6" />
            Sécurité
          </h2>
          <button className="w-full py-4 border border-white/20 rounded-2xl text-white hover:bg-white/5 transition">
            Changer mon mot de passe
          </button>
        </div>

        {/* Danger Zone */}
        <div className="rounded-2xl border border-red-500/30 bg-[#111] p-8">
          <h2 className="flex items-center gap-3 text-xl font-bold text-red-400 mb-6">
            <Trash2 className="h-6 w-6" />
            Zone dangereuse
          </h2>
          <p className="text-gray-400 mb-6">
            Supprimer ton compte est une action irréversible. Toutes tes données seront perdues.
          </p>
          <button className="w-full py-4 bg-red-500/10 border border-red-500 text-red-400 rounded-2xl hover:bg-red-500/20 transition">
            Supprimer mon compte
          </button>
        </div>
      </div>
    </div>
  )
}
