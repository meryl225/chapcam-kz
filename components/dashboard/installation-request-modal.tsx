'use client'

import { useState } from 'react'
import { X, Download, Loader2, Check, MapPin, Phone } from 'lucide-react'

const APPS = [
  'WhatsApp',
  'Telegram',
  'Microsoft Teams',
  'Google Meet',
  'Zoom',
  'Skype',
  'Discord',
  'Autre',
]

interface Props {
  open: boolean
  onClose: () => void
}

export function InstallationRequestModal({ open, onClose }: Props) {
  const [selectedApps, setSelectedApps] = useState<string[]>(['WhatsApp'])
  const [location, setLocation] = useState('')
  const [phone, setPhone] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  if (!open) return null

  const toggleApp = (app: string) => {
    setSelectedApps((prev) =>
      prev.includes(app) ? prev.filter((a) => a !== app) : [...prev, app],
    )
  }

  const handleSubmit = async () => {
    setError(null)
    if (selectedApps.length === 0) {
      setError('Selectionnez au moins une application.')
      return
    }
    if (location.trim().length < 2) {
      setError("Indiquez le lieu d'installation.")
      return
    }
    if (phone.trim().length < 6) {
      setError('Indiquez un numero joignable valide.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/installation-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apps: selectedApps,
          location: location.trim(),
          phone: phone.trim(),
          note: note.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Erreur lors de l'envoi.")
        return
      }
      setDone(true)
    } catch {
      setError('Erreur reseau. Reessayez.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    // Reset pour une prochaine ouverture
    setDone(false)
    setError(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-[#2563eb]/30 bg-[#0d1117] p-6 shadow-[0_0_40px_rgba(37,99,235,0.25)]">
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 text-gray-400 transition-colors hover:text-white"
          aria-label="Fermer"
        >
          <X className="h-5 w-5" />
        </button>

        {done ? (
          <div className="flex flex-col items-center py-4 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#2563eb]/20">
              <Check className="h-7 w-7 text-[#3b82f6]" />
            </div>
            <h3 className="text-lg font-bold text-white">Demande enregistree</h3>
            <p className="mt-2 text-sm text-gray-400">
              Pour confirmer votre demande, reglez les frais d&apos;installation. Notre equipe vous
              contactera ensuite au numero indique pour planifier l&apos;installation.
            </p>

            {/* Recapitulatif frais */}
            <div className="mt-5 w-full rounded-xl border border-[#2563eb]/30 bg-[#2563eb]/10 px-4 py-3 text-left">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#93c5fd]">Frais d&apos;installation</span>
                <span className="text-lg font-bold text-white">
                  {INSTALL_FEE.price.toLocaleString()} FCFA
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Deplacement, configuration (WhatsApp et autres apps), tests et assistance inclus.
              </p>
            </div>

            {payError && (
              <p className="mt-4 w-full rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {payError}
              </p>
            )}

            <button
              onClick={handlePayInstallation}
              disabled={paying}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[#00c66b] py-3 font-semibold text-white transition-colors hover:bg-[#00b35f] disabled:opacity-60"
            >
              {paying ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Redirection vers le paiement...
                </>
              ) : (
                <>
                  <CreditCard className="h-5 w-5" />
                  Confirmer et payer {INSTALL_FEE.price.toLocaleString()} FCFA
                </>
              )}
            </button>

            <button
              onClick={handleClose}
              className="mt-3 text-sm text-gray-400 transition-colors hover:text-white"
            >
              Payer plus tard
            </button>
            <p className="mt-2 text-xs text-gray-500">
              Vous pourrez aussi payer depuis &laquo; Mes demandes &raquo;.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2563eb]/20">
                <Download className="h-5 w-5 text-[#3b82f6]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Demande d&apos;installation</h3>
                <p className="text-sm text-gray-400">
                  Installez ChapCam avec vos apps d&apos;appel video
                </p>
              </div>
            </div>

            {/* Reserve aux abonnes */}
            <div className="mb-5 rounded-lg border border-[#2563eb]/30 bg-[#2563eb]/10 px-3 py-2.5 text-sm text-[#93c5fd]">
              L&apos;installation est reservee aux clients ayant un abonnement actif. Prenez un
              abonnement pour beneficier de l&apos;installation par notre equipe.
            </div>

            {/* Apps */}
            <label className="mb-2 block text-sm font-medium text-white">
              Applications a installer avec ChapCam
            </label>
            <div className="mb-4 flex flex-wrap gap-2">
              {APPS.map((app) => {
                const active = selectedApps.includes(app)
                return (
                  <button
                    key={app}
                    type="button"
                    onClick={() => toggleApp(app)}
                    className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      active
                        ? 'border-[#2563eb] bg-[#2563eb]/20 text-[#93c5fd]'
                        : 'border-[#333] bg-white/5 text-gray-300 hover:border-[#555]'
                    }`}
                  >
                    {active && <Check className="mr-1 inline h-3.5 w-3.5" />}
                    {app}
                  </button>
                )
              })}
            </div>

            {/* Lieu */}
            <label className="mb-2 block text-sm font-medium text-white">
              Lieu d&apos;installation
            </label>
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-[#333] bg-white/5 px-3">
              <MapPin className="h-4 w-4 shrink-0 text-gray-400" />
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ville, quartier, adresse..."
                className="w-full bg-transparent py-2.5 text-white placeholder-gray-500 outline-none"
              />
            </div>

            {/* Numero */}
            <label className="mb-2 block text-sm font-medium text-white">
              Numero joignable
            </label>
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-[#333] bg-white/5 px-3">
              <Phone className="h-4 w-4 shrink-0 text-gray-400" />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+225 ..."
                inputMode="tel"
                className="w-full bg-transparent py-2.5 text-white placeholder-gray-500 outline-none"
              />
            </div>

            {/* Note */}
            <label className="mb-2 block text-sm font-medium text-white">
              Note (optionnel)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Precisions sur votre appareil, vos disponibilites..."
              className="mb-4 w-full resize-none rounded-lg border border-[#333] bg-white/5 px-3 py-2.5 text-white placeholder-gray-500 outline-none"
            />

            {error && (
              <p className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {error}
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#2563eb] py-3 font-semibold text-white transition-colors hover:bg-[#1d4ed8] disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" />
                  Envoyer la demande
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
