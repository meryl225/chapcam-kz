'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TurnstileWidget, isTurnstileEnabled } from '@/components/turnstile-widget'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmailSent, setResetEmailSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Anti-bots : jeton CAPTCHA obligatoire si la protection est configuree.
    if (isTurnstileEnabled && !captchaToken) {
      setError('Veuillez valider la verification anti-robot')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: { captchaToken: captchaToken ?? undefined },
      })

      if (signInError) {
        setCaptchaToken(null)
        if (signInError.message.includes('Invalid login credentials')) {
          setError('Email ou mot de passe incorrect')
        } else if (signInError.message.includes('Email not confirmed')) {
          setError('Veuillez confirmer votre email avant de vous connecter')
        } else {
          setError(signInError.message)
        }
        setLoading(false)
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      setError('Veuillez entrer votre adresse email')
      return
    }
    
    setError(null)
    setResetLoading(true)

    try {
      // Envoyer l'email de reinitialisation via notre API Resend
      const response = await fetch('/api/email/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const data = await response.json()

      if (data.success) {
        setResetEmailSent(true)
      } else {
        setError(data.error || 'Une erreur est survenue')
      }
    } catch {
      setError('Une erreur est survenue')
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-[#0a0e1a]">
        {/* Gradient Orbs */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-[#00d4ff]/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-[#e91e8c]/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#8b5cf6]/10 rounded-full blur-[150px]" />
        
        {/* Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />
        
        {/* Floating Particles */}
        <div className="absolute top-20 left-20 w-2 h-2 bg-[#00d4ff] rounded-full animate-bounce" style={{ animationDuration: '3s' }} />
        <div className="absolute top-40 right-32 w-1.5 h-1.5 bg-[#e91e8c] rounded-full animate-bounce" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />
        <div className="absolute bottom-32 left-1/4 w-2 h-2 bg-[#8b5cf6] rounded-full animate-bounce" style={{ animationDuration: '3.5s', animationDelay: '1s' }} />
        <div className="absolute bottom-48 right-1/4 w-1 h-1 bg-[#00d4ff] rounded-full animate-bounce" style={{ animationDuration: '2s', animationDelay: '0.3s' }} />
      </div>

      {/* Login Card */}
      <div className="relative w-full max-w-md">
        {/* Card Glow Effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-[#00d4ff] via-[#8b5cf6] to-[#e91e8c] rounded-2xl opacity-20 blur-lg" />
        
        <div className="relative p-8 rounded-2xl border border-white/10 bg-[#111827]/90 backdrop-blur-xl">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Image
                src="/favicon.jpg"
                alt="ChapCam Logo"
                width={80}
                height={80}
                className="rounded-xl"
              />
            </div>
            <h1 className="text-3xl font-bold gradient-text">ChapCam</h1>
            <p className="text-gray-400 mt-2">
              {showForgotPassword ? 'Reinitialise ton mot de passe' : 'Content de te revoir !'}
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm">{error}</span>
            </div>
          )}

          {resetEmailSent ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#00d4ff]/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-[#00d4ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Email envoye !</h3>
              <p className="text-gray-400 text-sm mb-6">
                Verifie ta boite mail pour reinitialiser ton mot de passe.
              </p>
              <button
                onClick={() => {
                  setShowForgotPassword(false)
                  setResetEmailSent(false)
                }}
                className="text-[#00d4ff] hover:text-[#00b8e6] transition-colors"
              >
                Retour a la connexion
              </button>
            </div>
          ) : showForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  ADRESSE EMAIL
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3.5 pl-11 bg-[#1e293b] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#00d4ff] focus:ring-1 focus:ring-[#00d4ff]/50 transition-all"
                    placeholder="ton@email.com"
                  />
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>

              <button
                type="submit"
                disabled={resetLoading}
                className="w-full py-4 bg-gradient-to-r from-[#00d4ff] to-[#8b5cf6] hover:from-[#00b8e6] hover:to-[#7c3aed] text-white font-bold rounded-xl transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg shadow-[#00d4ff]/20"
              >
                {resetLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    ENVOI EN COURS...
                  </span>
                ) : 'ENVOYER LE LIEN'}
              </button>

              <button
                type="button"
                onClick={() => setShowForgotPassword(false)}
                className="w-full text-center text-gray-400 hover:text-white transition-colors"
              >
                Retour a la connexion
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  ADRESSE EMAIL
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3.5 pl-11 bg-[#1e293b] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#00d4ff] focus:ring-1 focus:ring-[#00d4ff]/50 transition-all"
                    placeholder="ton@email.com"
                  />
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  MOT DE PASSE
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3.5 pl-11 bg-[#1e293b] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#00d4ff] focus:ring-1 focus:ring-[#00d4ff]/50 transition-all"
                    placeholder="••••••••"
                  />
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-[#00d4ff] hover:text-[#00b8e6] transition-colors"
                >
                  Mot de passe oublie ?
                </button>
              </div>

              <TurnstileWidget onVerify={setCaptchaToken} onExpire={() => setCaptchaToken(null)} />

              <button
                type="submit"
                disabled={loading || (isTurnstileEnabled && !captchaToken)}
                className="w-full py-4 bg-gradient-to-r from-[#e91e8c] to-[#8b5cf6] hover:from-[#d11a7d] hover:to-[#7c3aed] text-white font-bold rounded-xl transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg shadow-[#e91e8c]/20"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    CONNEXION...
                  </span>
                ) : 'SE CONNECTER'}
              </button>
            </form>
          )}

          {!showForgotPassword && !resetEmailSent && (
            <>
              {/* Divider */}
              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                <span className="text-gray-500 text-sm">ou</span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              </div>

              <p className="text-center text-gray-400">
                Pas encore de compte ?{' '}
                <Link href="/auth/sign-up" className="text-[#00d4ff] hover:text-[#00b8e6] font-medium transition-colors">
                  Creer un compte
                </Link>
              </p>
            </>
          )}

          <Link 
            href="/" 
            className="flex items-center justify-center gap-2 text-gray-500 hover:text-white mt-6 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Retour a l&apos;accueil
          </Link>
        </div>
      </div>
    </div>
  )
}
