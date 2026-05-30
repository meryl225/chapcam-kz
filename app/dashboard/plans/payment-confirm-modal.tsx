'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  CheckCircle,
  Loader2,
  Upload,
  ExternalLink,
  Copy,
  Check,
  ChevronLeft,
  Phone,
  Wallet,
} from 'lucide-react'
import type { PlanConfig } from '@/lib/plans'
import { PAYMENT_METHODS, type PaymentMethod, type PaymentMethodId } from '@/lib/payment-methods'

interface Props {
  plan: PlanConfig
  waveUrl?: string
  onClose: () => void
}

type Step = 'choose' | 'wave' | 'phone' | 'form' | 'done'

export function PaymentConfirmModal({ plan, waveUrl, onClose }: Props) {
  const [step, setStep] = useState<Step>('choose')
  const [method, setMethod] = useState<PaymentMethod | null>(null)
  const [copied, setCopied] = useState(false)

  // --- Champs du formulaire de justification ---
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [reference, setReference] = useState('')
  const [paidAmount, setPaidAmount] = useState<string>(String(plan.price))
  const [paidAt, setPaidAt] = useState('')
  const [comment, setComment] = useState('')
  const [screenshot, setScreenshot] = useState<File | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [doneMsg, setDoneMsg] = useState<string | null>(null)

  const isManual = method?.type === 'phone'

  const chooseMethod = (m: PaymentMethod) => {
    setMethod(m)
    if (m.type === 'link') {
      setStep('wave')
    } else {
      setStep('phone')
    }
  }

  const openWaveLink = () => {
    if (waveUrl) window.open(waveUrl, '_blank', 'noopener,noreferrer')
  }

  const copyNumber = async () => {
    if (!method?.number) return
    try {
      await navigator.clipboard.writeText(method.number)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard indisponible : on ignore */
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Capture obligatoire pour les paiements manuels (Orange/MTN/Moov)
    if (isManual && !screenshot) {
      setError('La capture d\'ecran du paiement est obligatoire pour ce mode de paiement.')
      return
    }

    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('fullName', fullName)
      fd.append('email', email)
      fd.append('phoneNumber', phoneNumber)
      fd.append('plan', plan.id)
      fd.append('paymentMethod', method?.id ?? 'wave')
      fd.append('reference', reference)
      fd.append('paidAmount', paidAmount)
      fd.append('paidAt', paidAt)
      fd.append('comment', comment)
      if (screenshot) fd.append('screenshot', screenshot)

      const res = await fetch('/api/subscription/confirm', { method: 'POST', body: fd })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Une erreur est survenue.')
      } else {
        setDoneMsg(data.message)
        setStep('done')
      }
    } catch {
      setError('Erreur de connexion. Reessayez.')
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass =
    'w-full rounded-xl border border-gray-700 bg-[#0a0a0a] px-4 py-3 text-white outline-none transition-colors focus:border-[#00ff88]'
  const labelClass = 'mb-1.5 block text-sm font-medium text-gray-300'

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
          className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-gray-800 bg-[#111] p-6 md:p-8"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="absolute right-4 top-4 text-gray-500 transition-colors hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Bouton retour (sauf etape initiale et finale) */}
          {(step === 'wave' || step === 'phone' || step === 'form') && (
            <button
              onClick={() => setStep(step === 'form' ? (isManual ? 'phone' : 'wave') : 'choose')}
              className="mb-3 inline-flex items-center gap-1 text-sm text-gray-400 transition-colors hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
              Retour
            </button>
          )}

          {/* ============================= CHOIX DU MODE ============================= */}
          {step === 'choose' && (
            <>
              <h3 className="text-xl font-bold text-white">Choisir un mode de paiement</h3>
              <p className="mb-5 mt-1 text-sm text-gray-400">
                Formule <span className="font-semibold text-[#00ff88]">{plan.name}</span> —{' '}
                {plan.price.toLocaleString()} FCFA
              </p>

              <div className="grid grid-cols-2 gap-3">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => chooseMethod(m)}
                    className="flex flex-col items-center gap-2 rounded-2xl border border-gray-800 bg-[#0a0a0a] px-4 py-5 text-center transition-all hover:border-[#00ff88]"
                  >
                    <span
                      className="flex h-11 w-11 items-center justify-center rounded-full"
                      style={{ backgroundColor: `${m.color}22`, color: m.color }}
                    >
                      {m.type === 'link' ? (
                        <Wallet className="h-5 w-5" />
                      ) : (
                        <Phone className="h-5 w-5" />
                      )}
                    </span>
                    <span className="text-sm font-semibold text-white">{m.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ============================= WAVE (lien) ============================= */}
          {step === 'wave' && method && (
            <>
              <h3 className="text-xl font-bold text-white">Paiement {method.label}</h3>
              <p className="mb-5 mt-1 text-sm text-gray-400">
                Formule <span className="font-semibold text-[#00ff88]">{plan.name}</span> —{' '}
                {plan.price.toLocaleString()} FCFA
              </p>

              {waveUrl ? (
                <button
                  onClick={openWaveLink}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1dc3ff] py-4 font-semibold text-black transition-all hover:opacity-90"
                >
                  Ouvrir le lien de paiement Wave
                  <ExternalLink className="h-4 w-4" />
                </button>
              ) : (
                <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-400">
                  Le lien Wave n&apos;est pas encore configure. Contactez le support.
                </div>
              )}

              <button
                onClick={() => setStep('form')}
                className="mt-3 w-full rounded-2xl bg-[#00ff88] py-4 font-semibold text-black transition-all hover:bg-[#00dd77]"
              >
                J&apos;ai effectue mon paiement
              </button>
            </>
          )}

          {/* ============================= PAIEMENT PAR NUMERO ============================= */}
          {step === 'phone' && method && (
            <>
              <h3 className="text-xl font-bold text-white">Paiement {method.label}</h3>
              <p className="mb-5 mt-1 text-sm text-gray-400">
                Formule <span className="font-semibold text-[#00ff88]">{plan.name}</span> —{' '}
                {plan.price.toLocaleString()} FCFA
              </p>

              <div className="rounded-2xl border border-gray-800 bg-[#0a0a0a] p-5">
                <p className="text-xs uppercase tracking-wider text-gray-500">Numero a crediter</p>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <span className="text-lg font-bold text-white">{method.number}</span>
                  <button
                    onClick={copyNumber}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:border-[#00ff88] hover:text-white"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-[#00ff88]" />
                        Copie
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copier
                      </>
                    )}
                  </button>
                </div>
                <div className="mt-4 border-t border-gray-800 pt-3">
                  <p className="text-xs uppercase tracking-wider text-gray-500">Beneficiaire</p>
                  <p className="mt-1 font-semibold text-white">{method.beneficiary}</p>
                </div>
                <div className="mt-4 border-t border-gray-800 pt-3">
                  <p className="text-xs uppercase tracking-wider text-gray-500">Montant a envoyer</p>
                  <p className="mt-1 font-semibold text-[#00ff88]">
                    {plan.price.toLocaleString()} FCFA
                  </p>
                </div>
              </div>

              <p className="mt-4 text-sm text-gray-400">
                Avez-vous effectue le paiement vers ce numero ?
              </p>
              <div className="mt-3 flex flex-col gap-3">
                <button
                  onClick={() => setStep('form')}
                  className="w-full rounded-2xl bg-[#00ff88] py-4 font-semibold text-black transition-all hover:bg-[#00dd77]"
                >
                  J&apos;ai effectue le paiement
                </button>
                <button
                  onClick={onClose}
                  className="w-full rounded-2xl border border-gray-700 py-4 font-semibold text-gray-300 transition-all hover:border-gray-500 hover:text-white"
                >
                  Je n&apos;ai pas encore paye
                </button>
              </div>
            </>
          )}

          {/* ============================= FORMULAIRE DE JUSTIFICATION ============================= */}
          {step === 'form' && method && (
            <>
              <h3 className="text-xl font-bold text-white">Justifier mon paiement</h3>
              <p className="mb-5 mt-1 text-sm text-gray-400">
                {method.label} — Formule{' '}
                <span className="font-semibold text-[#00ff88]">{plan.name}</span>
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className={labelClass}>Nom complet</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={inputClass}
                    placeholder="Votre nom"
                  />
                </div>

                <div>
                  <label className={labelClass}>Email du compte ChapCam</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    placeholder="vous@exemple.com"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Utilisez l&apos;email de votre compte ChapCam.
                  </p>
                </div>

                <div>
                  <label className={labelClass}>Numero ayant effectue le paiement</label>
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className={inputClass}
                    placeholder="+225 XX XX XX XX XX"
                  />
                </div>

                <div>
                  <label className={labelClass}>Reference / ID de transaction</label>
                  <input
                    type="text"
                    required
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className={inputClass}
                    placeholder="Ex : TX-ABC123"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Visible dans le SMS / recu de paiement.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Montant paye (FCFA)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      className={inputClass}
                      placeholder="10000"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Date et heure</label>
                    <input
                      type="datetime-local"
                      required
                      value={paidAt}
                      onChange={(e) => setPaidAt(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>
                    Capture d&apos;ecran du paiement
                    {isManual ? (
                      <span className="text-[#00ff88]"> (obligatoire)</span>
                    ) : (
                      <span className="text-gray-500"> (facultatif)</span>
                    )}
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

                <div>
                  <label className={labelClass}>
                    Commentaire <span className="text-gray-500">(facultatif)</span>
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={2}
                    className={`${inputClass} resize-none`}
                    placeholder="Information complementaire..."
                  />
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
                    'Envoyer pour validation'
                  )}
                </button>
              </form>
            </>
          )}

          {/* ============================= CONFIRMATION ============================= */}
          {step === 'done' && (
            <div className="py-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#00ff88]/15">
                <CheckCircle className="h-8 w-8 text-[#00ff88]" />
              </div>
              <h3 className="mb-2 text-xl font-bold text-white">Demande envoyee</h3>
              <p className="text-sm leading-relaxed text-gray-400">{doneMsg}</p>
              <button
                onClick={onClose}
                className="mt-6 w-full rounded-2xl bg-[#00ff88] py-3 font-semibold text-black transition-colors hover:bg-[#00dd77]"
              >
                Compris
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
