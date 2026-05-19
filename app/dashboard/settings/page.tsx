import { Settings } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="flex items-center gap-3 text-2xl font-bold text-white">
          <Settings className="h-7 w-7 text-[#00ff88]" />
          PARAMÈTRES
        </h1>
        <p className="mt-2 text-gray-400">
          Gère les paramètres de ton compte.
        </p>
      </div>

      <div className="space-y-6">
        <div className="rounded-lg border border-white/10 bg-[#111111] p-6">
          <h2 className="mb-4 text-lg font-bold text-white">Compte</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-400">Email</p>
              <p className="text-white">-</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Plan actuel</p>
              <p className="text-white">-</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-[#111111] p-6">
          <h2 className="mb-4 text-lg font-bold text-white">Préférences</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white">Notifications</p>
                <p className="text-sm text-gray-400">Recevoir des notifications par email</p>
              </div>
              <button className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white transition-colors hover:bg-white/20">
                Activer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
