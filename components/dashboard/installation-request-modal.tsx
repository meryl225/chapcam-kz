'use client'

import { useState } from 'react'
import { X, Download, Loader2, Check, MapPin, Phone } from 'lucide-react'
import { usePaymentCheckout } from '@/components/payment/use-payment-checkout'

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
  // Paiement partage : choix PayDunya (mobile money/carte) ou Crypto (Trybit).
  const { startCheckout, pendingKey, error: payError, modal } = usePaymentCheckout()
  const paying = pendingKey === 'install'

  const handlePay = () => {
    setError(null)
    // Ouvre le choix de methode en transmettant le numero joignable.
    startCheckout('install', { phoneNumber: phone.trim(), loaderKey: 'install' })
  }

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
    <>
      {modal}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-[#2563eb]/30 bg-card p-6 shadow-[0_0_40px_rgba(37,99,235,0.25)]">
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Fermer"
        >
          <X className="h-5 w-5" />
        </button>

        {done ? (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#2563eb]/20">
              <Check className="h-7 w-7 text-[#3b82f6]" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Demande envoyee</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Pour finaliser, validez votre demande en reglant les frais
              d&apos;installation. Notre equipe vous contactera ensuite au numero
              indique pour planifier l&apos;intervention.
            </p>

            <div className="mt-4 w-full rounded-lg border border-[#2563eb]/30 bg-[#2563eb]/10 px-4 py-3 text-left">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Frais d&apos;installation</span>
                <span className="text-lg font-bold text-foreground">8 500 F</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Paiement securise par mobile money, carte ou crypto. Compte credite automatiquement.
              </p>
            </div>

            {(error || payError) && (
              <p className="mt-3 w-full rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {error || payError}
              </p>
            )}

            <button
              onClick={handlePay}
              disabled={paying}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#2563eb] py-3 font-semibold text-white transition-colors hover:bg-[#1d4ed8] disabled:opacity-60"
            >
              {paying ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Redirection...
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" />
                  Valider ma demande (8 500 F)
                </>
              )}
            </button>

            <button
              onClick={handleClose}
              className="mt-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Plus tard
            </button>
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2563eb]/20">
                <Download className="h-5 w-5 text-[#3b82f6]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Demande d&apos;installation</h3>
                <p className="text-sm text-muted-foreground">
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
            <label className="mb-2 block text-sm font-medium text-foreground">
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
                        : 'border-hairline bg-muted text-muted-foreground hover:border-hairline-strong'
                    }`}
                  >
                    {active && <Check className="mr-1 inline h-3.5 w-3.5" />}
                    {app}
                  </button>
                )
              })}
            </div>

            {/* Lieu */}
            <label className="mb-2 block text-sm font-medium text-foreground">
              Lieu d&apos;installation
            </label>
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-hairline bg-muted px-3">
              <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ville, quartier, adresse..."
                className="w-full bg-transparent py-2.5 text-foreground placeholder-gray-500 outline-none"
              />
            </div>

            {/* Numero */}
            <label className="mb-2 block text-sm font-medium text-foreground">
              Numero joignable
            </label>
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-hairline bg-muted px-3">
              <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+225 ..."
                inputMode="tel"
                className="w-full bg-transparent py-2.5 text-foreground placeholder-gray-500 outline-none"
              />
            </div>

            {/* Note */}
            <label className="mb-2 block text-sm font-medium text-foreground">
              Note (optionnel)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Precisions sur votre appareil, vos disponibilites..."
              className="mb-4 w-full resize-none rounded-lg border border-hairline bg-muted px-3 py-2.5 text-foreground placeholder-gray-500 outline-none"
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
    </>
  )
}
