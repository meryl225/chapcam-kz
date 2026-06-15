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
  const { pushToast } = useNumbers()
  const [name, setName] = useState('Amadou Diallo')
  const [email, setEmail] = useState('amadou@chapcam.io')
  const [company, setCompany] = useState('ChapCam Labs')
  const [country, setCountry] = useState('Senegal')

  const [notif, setNotif] = useState({ sms: true, billing: true, product: false, security: true })

  function save() {
    pushToast('Settings saved', 'Your profile has been updated.')
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Settings</h1>
        <p className="text-sm text-white/50">Manage your profile, notifications and security</p>
      </div>

      {/* Profile */}
      <section className={`${card} p-5`}>
        <h2 className="mb-4 flex items-center gap-2 font-semibold text-white">
          <User className="h-4 w-4 text-blue-400" /> Profile
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/40">
              Full name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/40">
              Email
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/40">
              Company
            </label>
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/40">
              Country
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
          <Check className="h-4 w-4" /> Save changes
        </button>
      </section>

      {/* Notifications */}
      <section className={`${card} p-5`}>
        <h2 className="mb-4 flex items-center gap-2 font-semibold text-white">
          <Bell className="h-4 w-4 text-blue-400" /> Notifications
        </h2>
        <div className="divide-y divide-white/5">
          {[
            { key: 'sms', label: 'Inbound SMS alerts', desc: 'Notify me when a new message arrives' },
            { key: 'billing', label: 'Billing & renewals', desc: 'Receipts and upcoming number renewals' },
            { key: 'product', label: 'Product updates', desc: 'New features and announcements' },
            { key: 'security', label: 'Security alerts', desc: 'Login and key activity notifications' },
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
          <Shield className="h-4 w-4 text-blue-400" /> Security
        </h2>
        <div className="space-y-3">
          <button
            onClick={() => pushToast('Password reset sent', 'Check your email for a reset link.')}
            className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left transition-colors hover:bg-white/5"
          >
            <div>
              <p className="text-sm font-medium text-white">Change password</p>
              <p className="text-xs text-white/40">Last changed 3 months ago</p>
            </div>
            <span className="text-sm text-blue-400">Update</span>
          </button>
          <button
            onClick={() => pushToast('2FA enabled', 'Two-factor authentication is now active.')}
            className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left transition-colors hover:bg-white/5"
          >
            <div>
              <p className="text-sm font-medium text-white">Two-factor authentication</p>
              <p className="text-xs text-white/40">Add an extra layer of security</p>
            </div>
            <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-400">
              Off
            </span>
          </button>
        </div>
      </section>

      {/* Danger zone */}
      <section className="rounded-2xl border border-red-500/20 bg-red-500/[0.03] p-5">
        <h2 className="mb-1 flex items-center gap-2 font-semibold text-red-400">
          <Trash2 className="h-4 w-4" /> Danger zone
        </h2>
        <p className="mb-4 text-sm text-white/50">Permanently delete your account and all associated data.</p>
        <button
          onClick={() => pushToast('Request received', 'Account deletion requires email confirmation.')}
          className="rounded-lg border border-red-500/40 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
        >
          Delete account
        </button>
      </section>
    </div>
  )
}
