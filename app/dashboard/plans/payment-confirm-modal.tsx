'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, Loader2, Upload } from 'lucide-react'
import type { PlanConfig } from '@/lib/plans'

interface Props {
  plan: PlanConfig
  onClose: () => void
}

export function PaymentConfirmModal({ plan, onClose }: Props) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [reference, setReference] = useState('')
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const fd = new FormData()
      fd.append('fullName', fullName)
      fd.append('email', email)
      fd.append('phoneNumber', phoneNumber)
      fd.append('plan', plan.id)
      fd.append('reference', reference)
      if (screenshot) fd.append('screenshot', screenshot)

      const res = await fetch('/api/subscription/confirm', { method: 'POST', body: fd })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Une erreur est survenue.')
      } else {
        setDone(data.message)
      }
    } catch {
      setError('Erreur de connexion. Reessayez.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md rounded-3xl border border-gray-800 bg-[#111] p-6 md:p-8"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="absolute right-4 top-4 text-gray-500 transition-colors hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>

          {done ? (
            <div className="py-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#00ff88]/15">
                <CheckCircle className="h-8 w-8 text-[#00ff88]" />
              </div>
              <h3 className="mb-2 text-xl font-bold text-white">Demande envoyee</h3>
              <p className="text-sm leading-relaxed text-gray-400">{done}</p>
              <button
                onClick={onClose}
                className="mt-6 w-full rounded-2xl bg-[#00ff88] py-3 font-semibold text-black transition-colors hover:bg-[#00dd77]"
              >
                Compris
              </button>
            </div>
          ) : (
            <>
              <h3 className="text-xl font-bold text-white">Confirmer mon paiement</h3>
              <p className="mb-5 mt-1 text-sm text-gray-400">
                Formule <span className="font-semibold text-[#00ff88]">{plan.name}</span> —{' '}
                {plan.price.toLocaleString()} FCFA
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">
                    Nom complet
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-xl border border-gray-700 bg-[#0a0a0a] px-4 py-3 text-white outline-none transition-colors focus:border-[#00ff88]"
                    placeholder="Votre nom"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-gray-700 bg-[#0a0a0a] px-4 py-3 text-white outline-none transition-colors focus:border-[#00ff88]"
                    placeholder="vous@exemple.com"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Utilisez l&apos;email de votre compte ChapCam.
                  </p>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">
                    Numero Wave utilise
                  </label>
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full rounded-xl border border-gray-700 bg-[#0a0a0a] px-4 py-3 text-white outline-none transition-colors focus:border-[#00ff88]"
                    placeholder="+221 7X XXX XX XX"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">
                    Reference de transaction Wave
                  </label>
                  <input
                    type="text"
                    required
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="w-full rounded-xl border border-gray-700 bg-[#0a0a0a] px-4 py-3 text-white outline-none transition-colors focus:border-[#00ff88]"
                    placeholder="Ex : TX-ABC123"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Visible dans votre recu Wave (ID de transaction).
                  </p>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">
                    Capture d&apos;ecran (facultatif)
                  </label>
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-gray-700 bg-[#0a0a0a] px-4 py-3 text-sm text-gray-400 transition-colors hover:border-[#00ff88]">
                    <Upload className="h-4 w-4" />
                    <span className="truncate">
                      {screenshot ? screenshot.name : 'Joindre une preuve de paiement'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#00ff88] py-4 font-semibold text-black transition-colors hover:bg-[#00dd77] disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Envoi...
                    </>
                  ) : (
                    'Envoyer ma demande'
                  )}
                </button>
              </form>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
