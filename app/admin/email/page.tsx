'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Mail,
  Send,
  Loader2,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Users,
  Wrench,
  AlertTriangle,
} from 'lucide-react'

const DEFAULT_SUBJECT = 'Votre installation ChapCam PC - Choisissez votre option (50 000 FCFA)'

const DEFAULT_MESSAGE = `Bonjour {nom},

Merci pour votre demande d'installation de ChapCam PC.

Pour vous accompagner au mieux, nous vous proposons 3 options d'installation. Il vous suffit de choisir celle qui vous convient et de nous contacter directement sur WhatsApp.

OPTION 1 - Installation dans nos bureaux
Vous venez directement dans les locaux de ChapCam. Tout se fait sur place, y compris le paiement, l'installation, la configuration et les tests. Vous repartez avec un ChapCam PC pret a l'emploi.

OPTION 2 - Installation a domicile
Notre equipe se deplace directement chez vous ou sur votre lieu de travail pour realiser l'installation complete, la configuration et les tests.

OPTION 3 - Installation a distance (AnyDesk)
Ou que vous soyez, notre equipe prend la main sur votre ordinateur via AnyDesk et installe ChapCam PC a distance, en direct avec vous.

Ce que comprend l'installation
- Installation complete de ChapCam PC sur votre ordinateur
- Configuration de votre compte
- Configuration de WhatsApp et des autres plateformes compatibles
- Verification du bon fonctionnement et tests en direct
- Assistance a la prise en main

Tarif
ChapCam PC : 50 000 FCFA (licence a vie)

Comment proceder ?
Cliquez sur le bouton ci-dessous pour nous ecrire directement sur WhatsApp. Indiquez-nous l'option choisie (bureaux, domicile ou a distance) et notre equipe s'occupe du reste.

Nos locaux
Yopougon Niangon Texaco, Pharmacie Lea, Abidjan, Cote d'Ivoire.

WhatsApp : +225 05 55 56 01 89

Merci pour votre confiance.

L'equipe ChapCam`

interface Result {
  success: boolean
  message: string
  stats?: { total: number; success: number; errors: number; skippedInvalid?: number }
  errorSamples?: { email: string; error: string }[]
}

export default function AdminEmailPage() {
  const [subject, setSubject] = useState(DEFAULT_SUBJECT)
  const [message, setMessage] = useState(DEFAULT_MESSAGE)
  const [ctaLabel, setCtaLabel] = useState('Nous contacter sur WhatsApp')
  const [ctaUrl, setCtaUrl] = useState(
    'https://wa.me/2250555560189?text=' +
      encodeURIComponent(
        "Bonjour, je souhaite installer ChapCam PC (50 000 FCFA). Mon option d'installation : (1) Bureaux ChapCam, (2) A domicile, ou (3) A distance via AnyDesk.",
      ),
  )
  const [audience, setAudience] = useState<'all' | 'installers'>('installers')
  const [sending, setSending] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [result, setResult] = useState<Result | null>(null)

  const send = async () => {
    setSending(true)
    setConfirming(false)
    setResult(null)
    try {
      const res = await fetch('/api/admin/email-custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, message, ctaLabel, ctaUrl, audience }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setResult({
          success: (data.stats?.success ?? 0) > 0,
          message: data.message,
          stats: data.stats,
          errorSamples: data.errorSamples,
        })
      } else {
        setResult({ success: false, message: data.error || "Erreur lors de l'envoi" })
      }
    } catch (err: any) {
      setResult({ success: false, message: err?.message || 'Erreur de connexion' })
    } finally {
      setSending(false)
    }
  }

  const canSend = subject.trim().length > 0 && message.trim().length > 0

  return (
    <div className="min-h-screen bg-[#050505] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#00ff88]/15">
              <Mail className="h-6 w-6 text-[#00ff88]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Campagne email</h1>
              <p className="text-sm text-gray-400">
                Choisis les destinataires, redige ton message et envoie-le.
              </p>
            </div>
          </div>
          <Link
            href="/admin/installations"
            className="flex items-center gap-2 rounded-xl border border-gray-700 bg-[#111] px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:border-[#00ff88] hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Installations
          </Link>
        </div>

        {/* Formulaire */}
        <div className="flex flex-col gap-5 rounded-2xl border border-gray-800 bg-[#111] p-6">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">Destinataires</label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setAudience('installers')}
                className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
                  audience === 'installers'
                    ? 'border-[#00ff88] bg-[#00ff88]/10'
                    : 'border-gray-700 bg-[#0a0a0a] hover:border-gray-600'
                }`}
              >
                <Wrench
                  className={`mt-0.5 h-5 w-5 flex-shrink-0 ${
                    audience === 'installers' ? 'text-[#00ff88]' : 'text-gray-400'
                  }`}
                />
                <span>
                  <span className="block text-sm font-semibold text-white">
                    Demandeurs d&apos;installation
                  </span>
                  <span className="block text-xs text-gray-400">
                    Uniquement ceux qui ont fait une demande d&apos;installation
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setAudience('all')}
                className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
                  audience === 'all'
                    ? 'border-[#00ff88] bg-[#00ff88]/10'
                    : 'border-gray-700 bg-[#0a0a0a] hover:border-gray-600'
                }`}
              >
                <Users
                  className={`mt-0.5 h-5 w-5 flex-shrink-0 ${
                    audience === 'all' ? 'text-[#00ff88]' : 'text-gray-400'
                  }`}
                />
                <span>
                  <span className="block text-sm font-semibold text-white">Tous les inscrits</span>
                  <span className="block text-xs text-gray-400">
                    Tous les utilisateurs inscrits sur ChapCam
                  </span>
                </span>
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">Sujet</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-xl border border-gray-700 bg-[#0a0a0a] px-4 py-3 text-white outline-none transition-colors focus:border-[#00ff88]"
              placeholder="Sujet de l'email"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">
              Message
              <span className="ml-2 text-xs font-normal text-gray-500">
                Astuce : ecris {'{nom}'} pour inserer le prenom du client
              </span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={16}
              className="w-full resize-y rounded-xl border border-gray-700 bg-[#0a0a0a] px-4 py-3 font-mono text-sm leading-relaxed text-white outline-none transition-colors focus:border-[#00ff88]"
              placeholder="Ecris ton message ici..."
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
                Bouton (texte) <span className="text-xs font-normal text-gray-500">optionnel</span>
              </label>
              <input
                value={ctaLabel}
                onChange={(e) => setCtaLabel(e.target.value)}
                className="w-full rounded-xl border border-gray-700 bg-[#0a0a0a] px-4 py-3 text-white outline-none transition-colors focus:border-[#00ff88]"
                placeholder="Ex: Ouvrir ChapCam"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
                Bouton (lien) <span className="text-xs font-normal text-gray-500">optionnel</span>
              </label>
              <input
                value={ctaUrl}
                onChange={(e) => setCtaUrl(e.target.value)}
                className="w-full rounded-xl border border-gray-700 bg-[#0a0a0a] px-4 py-3 text-white outline-none transition-colors focus:border-[#00ff88]"
                placeholder="https://chapcam.com"
              />
            </div>
          </div>

          {/* Avertissement + envoi */}
          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              disabled={!canSend || sending}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#00ff88] px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-[#00dd77] disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {audience === 'installers'
                ? "Envoyer aux demandeurs d'installation"
                : 'Envoyer a tous les inscrits'}
            </button>
          ) : (
            <div className="flex flex-col gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4">
              <div className="flex items-start gap-2 text-sm text-yellow-200/90">
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-400" />
                <span>
                  Cet email va etre envoye a{' '}
                  <strong>
                    {audience === 'installers'
                      ? "TOUS les clients ayant fait une demande d'installation"
                      : 'TOUS les utilisateurs inscrits'}
                  </strong>
                  . Cette action est irreversible. Confirmer l&apos;envoi ?
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={send}
                  disabled={sending}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#00ff88] px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-[#00dd77] disabled:opacity-50"
                >
                  {sending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Oui, envoyer maintenant
                    </>
                  )}
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  disabled={sending}
                  className="rounded-xl border border-gray-700 bg-[#0a0a0a] px-5 py-3 text-sm font-medium text-gray-300 transition-colors hover:text-white disabled:opacity-50"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Resultat */}
        {result && (
          <div
            className={`mt-6 rounded-2xl border p-5 ${
              result.success
                ? 'border-[#00ff88]/30 bg-[#00ff88]/5'
                : 'border-red-500/30 bg-red-500/5'
            }`}
          >
            <div className="flex items-center gap-3">
              {result.success ? (
                <CheckCircle className="h-5 w-5 flex-shrink-0 text-[#00ff88]" />
              ) : (
                <XCircle className="h-5 w-5 flex-shrink-0 text-red-400" />
              )}
              <span className={result.success ? 'text-[#00ff88]' : 'text-red-400'}>
                {result.message}
              </span>
            </div>

            {result.stats && (
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-white/5 px-3 py-2 text-center">
                  <p className="flex items-center justify-center gap-1 text-lg font-bold text-white">
                    <Users className="h-4 w-4 text-gray-400" />
                    {result.stats.total}
                  </p>
                  <p className="text-xs text-gray-400">Destinataires</p>
                </div>
                <div className="rounded-lg bg-[#00ff88]/10 px-3 py-2 text-center">
                  <p className="text-lg font-bold text-[#00ff88]">{result.stats.success}</p>
                  <p className="text-xs text-gray-400">Envoyes</p>
                </div>
                <div className="rounded-lg bg-red-500/10 px-3 py-2 text-center">
                  <p className="text-lg font-bold text-red-400">{result.stats.errors}</p>
                  <p className="text-xs text-gray-400">Echecs</p>
                </div>
              </div>
            )}

            {result.errorSamples && result.errorSamples.length > 0 && (
              <div className="mt-3">
                <p className="mb-1 text-xs font-bold text-red-400">Detail des erreurs :</p>
                <div className="max-h-40 space-y-1 overflow-y-auto">
                  {result.errorSamples.map((e, i) => (
                    <p key={i} className="break-all font-mono text-xs text-red-300/80">
                      {e.email}: {e.error}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
