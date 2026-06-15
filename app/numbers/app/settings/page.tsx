'use client'

import { useState } from 'react'
import { useNumbers } from '@/components/numbers/numbers-provider'
import { User, Bell, Shield, Check, Globe2, Trash2 } from 'lucide-react'

const card = 'rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl'

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative h-6 w-11 rounded-full transition-colors ${on ? 'bg-blue-600' : 'bg-white/15'}`}
      role="switch"
      aria-checked={on}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${on ? 'translate-x-5' : 'translate-x-0.5'}`}
      />
    </button>
  )
}

export default function SettingsPage() {
  const { pushToast, user } = useNumbers()
  const [name, setName] = useState(user.name)
  const [company, setCompany] = useState('')
  const [country, setCountry] = useState('')

  const [notif, setNotif] = useState({ sms: true, billing: true, product: false, security: true })

  function save() {
    pushToast('Paramètres enregistrés', 'Votre profil a été mis à jour.')
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Paramètres</h1>
        <p className="text-sm text-white/50">Gérez votre profil, vos notifications et votre sécurité</p>
      </div>

      {/* Profile */}
      <section className={`${card} p-5`}>
        <h2 className="mb-4 flex items-center gap-2 font-semibold text-white">
          <User className="h-4 w-4 text-blue-400" /> Profil
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/40">
              Nom complet
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/40">
              E-mail
            </label>
            <input
              value={user.email}
              readOnly
              title="Géré par votre compte ChapCam"
              className="w-full cursor-not-allowed rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white/60 outline-none"
            />
            <p className="mt-1 text-[11px] text-white/30">Synchronisé avec votre compte ChapCam</p>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/40">
              Entreprise
            </label>
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/40">
              Pays
            </label>
            <div className="flex items-center rounded-lg border border-white/10 bg-white/5 px-3">
              <Globe2 className="h-4 w-4 text-white/40" />
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full bg-transparent px-2 py-2 text-sm text-white outline-none"
              />
            </div>
          </div>
        </div>
        <button
          onClick={save}
          className="mt-5 flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
        >
          <Check className="h-4 w-4" /> Enregistrer
        </button>
      </section>

      {/* Notifications */}
      <section className={`${card} p-5`}>
        <h2 className="mb-4 flex items-center gap-2 font-semibold text-white">
          <Bell className="h-4 w-4 text-blue-400" /> Notifications
        </h2>
        <div className="divide-y divide-white/5">
          {[
            { key: 'sms', label: 'Alertes SMS entrants', desc: 'Me prévenir à la réception d’un nouveau message' },
            { key: 'billing', label: 'Facturation et renouvellements', desc: 'Reçus et renouvellements de numéros à venir' },
            { key: 'product', label: 'Mises à jour produit', desc: 'Nouvelles fonctionnalités et annonces' },
            { key: 'security', label: 'Alertes de sécurité', desc: 'Notifications de connexion et d’activité des clés' },
          ].map((n) => (
            <div key={n.key} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-white">{n.label}</p>
                <p className="text-xs text-white/40">{n.desc}</p>
              </div>
              <Toggle
                on={notif[n.key as keyof typeof notif]}
                onClick={() => setNotif((s) => ({ ...s, [n.key]: !s[n.key as keyof typeof notif] }))}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Security */}
      <section className={`${card} p-5`}>
        <h2 className="mb-4 flex items-center gap-2 font-semibold text-white">
          <Shield className="h-4 w-4 text-blue-400" /> Sécurité
        </h2>
        <div className="space-y-3">
          <button
            onClick={() => pushToast('E-mail de réinitialisation envoyé', 'Consultez votre boîte mail pour le lien de réinitialisation.')}
            className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left transition-colors hover:bg-white/5"
          >
            <div>
              <p className="text-sm font-medium text-white">Changer le mot de passe</p>
              <p className="text-xs text-white/40">Géré via votre compte ChapCam</p>
            </div>
            <span className="text-sm text-blue-400">Modifier</span>
          </button>
          <button
            onClick={() => pushToast('2FA activée', 'L’authentification à deux facteurs est désormais active.')}
            className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left transition-colors hover:bg-white/5"
          >
            <div>
              <p className="text-sm font-medium text-white">Authentification à deux facteurs</p>
              <p className="text-xs text-white/40">Ajoutez une couche de sécurité supplémentaire</p>
            </div>
            <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-400">
              Désactivée
            </span>
          </button>
        </div>
      </section>

      {/* Danger zone */}
      <section className="rounded-2xl border border-red-500/20 bg-red-500/[0.03] p-5">
        <h2 className="mb-1 flex items-center gap-2 font-semibold text-red-400">
          <Trash2 className="h-4 w-4" /> Zone sensible
        </h2>
        <p className="mb-4 text-sm text-white/50">Supprimez définitivement votre compte et toutes les données associées.</p>
        <button
          onClick={() => pushToast('Demande reçue', 'La suppression du compte nécessite une confirmation par e-mail.')}
          className="rounded-lg border border-red-500/40 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
        >
          Supprimer le compte
        </button>
      </section>
    </div>
  )
}
