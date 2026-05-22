'use client'

import { useState, useEffect } from 'react'
import { Shield, AlertTriangle, X } from 'lucide-react'

export function LegalConsentModal() {
  const [isVisible, setIsVisible] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem('chapcam_legal_consent_v1')
    if (!consent) {
      setIsVisible(true)
    }
  }, [])

  const handleAccept = () => {
    if (!accepted) {
      setHasError(true)
      return
    }
    localStorage.setItem('chapcam_legal_consent_v1', JSON.stringify({
      accepted: true,
      date: new Date().toISOString(),
      version: '1.0',
    }))
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-[#00ff88]/30 bg-[#0a0a0a] shadow-[0_0_60px_rgba(0,255,136,0.15)]">
        
        {/* Top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-[#00ff88] via-[#00d4ff] to-[#7c3aed]" />

        <div className="p-6 md:p-8">
          
          {/* Header */}
          <div className="mb-6 flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 border border-orange-500/30">
              <AlertTriangle className="h-6 w-6 text-orange-400" />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-wider text-white">
                ⚠️ Avis Important
              </h2>
              <p className="mt-1 text-sm text-gray-400">
                Veuillez lire attentivement avant de continuer
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm leading-relaxed text-gray-300">
            
            <p>
              <span className="font-semibold text-[#00ff88]">ChapCam</span> est destiné au{' '}
              <span className="text-white font-medium">divertissement</span> et à la{' '}
              <span className="text-white font-medium">création de contenu</span>.
            </p>

            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
              <p className="font-semibold text-red-400 mb-1">❌ Strictement interdit :</p>
              <p className="text-gray-300">
                L'utilisation pour l'<strong className="text-white">usurpation d'identité</strong>, 
                la <strong className="text-white">fraude</strong>, les <strong className="text-white">arnaques</strong>, 
                ou la création de <strong className="text-white">contenus trompeurs</strong> est 
                strictement interdite et passible de poursuites judiciaires.
              </p>
            </div>

            <p>
              En utilisant ChapCam, vous confirmez avoir les{' '}
              <span className="text-white font-medium">droits et autorisations nécessaires</span>{' '}
              pour utiliser les images, avatars et contenus importés sur la plateforme.
            </p>

            <p className="text-gray-400">
              En continuant, vous acceptez nos{' '}
              <a href="/conditions" className="text-[#00ff88] underline hover:text-[#00ff88]/80">
                Conditions d'utilisation
              </a>{' '}
              et notre{' '}
              <a href="/confidentialite" className="text-[#00ff88] underline hover:text-[#00ff88]/80">
                Politique de confidentialité
              </a>.
            </p>
          </div>

          {/* Checkbox */}
          <div className="mt-6">
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all ${
                accepted
                  ? 'border-[#00ff88]/50 bg-[#00ff88]/5'
                  : hasError
                    ? 'border-red-500/50 bg-red-500/5'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
              }`}
            >
              <div className="relative mt-0.5 shrink-0">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => {
                    setAccepted(e.target.checked)
                    setHasError(false)
                  }}
                  className="sr-only"
                />
                <div className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-all ${
                  accepted
                    ? 'border-[#00ff88] bg-[#00ff88]'
                    : hasError
                      ? 'border-red-500'
                      : 'border-gray-500'
                }`}>
                  {accepted && (
                    <svg className="h-3 w-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <span className={`text-sm font-medium ${accepted ? 'text-[#00ff88]' : 'text-gray-300'}`}>
                J'ai lu et j'accepte les conditions d'utilisation. Je confirme utiliser ChapCam 
                uniquement à des fins légales et éthiques.
              </span>
            </label>

            {hasError && (
              <p className="mt-2 text-sm text-red-400 flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                Vous devez accepter les conditions pour continuer.
              </p>
            )}
          </div>

          {/* Button */}
          <button
            onClick={handleAccept}
            className={`mt-6 w-full rounded-xl py-4 text-base font-black uppercase tracking-wider transition-all ${
              accepted
                ? 'bg-[#00ff88] text-black hover:bg-[#00ff88]/90 shadow-[0_0_30px_rgba(0,255,136,0.3)]'
                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Shield className="mr-2 inline h-5 w-5" />
            Continuer
          </button>

          {/* Legal note */}
          <p className="mt-4 text-center text-xs text-gray-600">
            ChapCam © 2026 — Tout usage frauduleux est passible de poursuites judiciaires 
            conformément aux lois en vigueur.
          </p>
        </div>
      </div>
    </div>
  )
}
