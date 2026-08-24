'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createBrowserClient } from '@supabase/ssr'
import { TurnstileWidget, isTurnstileEnabled } from '@/components/turnstile-widget'

const SUPABASE_URL = 'https://ojmzqokffbptmcktnwdy.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qbXpxb2tmZmJwdG1ja3Rud2R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMTAzNTYsImV4cCI6MjA5NDg4NjM1Nn0.e9sk4b_15ge2LIIQwFpXC3n_q48ctu9IJ6oJxV85kgw'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [consent, setConsent] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const router = useRouter()

  const CGU_VERSION = '2026-06'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!consent) {
      setError('Vous devez accepter les Conditions d’utilisation et la Politique de confidentialité')
      return
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caracteres')
      return
    }

    // Anti-bots : si la protection CAPTCHA est configuree, un jeton valide est obligatoire.
    if (isTurnstileEnabled && !captchaToken) {
      setError('Veuillez valider la verification anti-robot')
      return
    }

    setLoading(true)

    try {
      const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
      
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          captchaToken: captchaToken ?? undefined,
          data: {
            plan: 'free',
            avatar_limit: 1,
            // Tracabilite de l'acceptation des CGU a l'inscription
            cgu_accepted: true,
            cgu_accepted_at: new Date().toISOString(),
            cgu_version: CGU_VERSION,
            consent_accepted: true,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (signUpError) {
        setCaptchaToken(null)
        if (signUpError.message.includes('already registered')) {
          setError('Cette adresse email est deja utilisee')
        } else {
          setError(signUpError.message)
        }
        return
      }

      if (data?.user) {
        // Envoyer l'email de bienvenue via notre API
        try {
          await fetch('/api/email/welcome', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: email,
              name: email.split('@')[0]
            })
          })
        } catch (emailError) {
          console.error('Erreur envoi email bienvenue:', emailError)
        }
        setSuccess(true)
      }
    } catch {
      setError('Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-[#0a0e1a]">
          <div className="absolute top-1/4 -left-20 w-96 h-96 bg-[#00d4ff]/20 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-[#e91e8c]/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#8b5cf6]/10 rounded-full blur-[150px]" />
        </div>

        <div className="relative w-full max-w-md">
          <div className="absolute -inset-1 bg-gradient-to-r from-[#00d4ff] via-[#8b5cf6] to-[#e91e8c] rounded-2xl opacity-20 blur-lg" />
          
          <div className="relative p-8 rounded-2xl border border-white/10 bg-[#111827]/90 backdrop-blur-xl text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-[#00d4ff] to-[#8b5cf6] flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-2">Compte cree avec succes !</h2>
            <p className="text-gray-400 mb-6">
              Un email de confirmation a ete envoye a <span className="text-[#00d4ff]">{email}</span>. 
              Verifie ta boite mail pour activer ton compte.
            </p>
            
            <div className="p-4 bg-[#1e293b] rounded-xl mb-6">
              <p className="text-sm text-gray-300">
                <span className="text-[#e91e8c] font-medium">Conseil :</span> Verifie aussi tes spams si tu ne vois pas l&apos;email.
              </p>
            </div>

            <Link 
              href="/auth/login" 
              style={{ ['--glow' as string]: '#e91e8c' }}
              className="btn-glow inline-flex items-center justify-center gap-2 w-full py-4 bg-gradient-to-r from-[#e91e8c] to-[#8b5cf6] hover:from-[#d11a7d] hover:to-[#7c3aed] text-white font-bold rounded-xl"
            >
              Aller a la connexion
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    )
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

      {/* Sign Up Card */}
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
            <p className="text-gray-400 mt-2">Rejoins l&apos;aventure du face swap</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm">{error}</span>
            </div>
          )}

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
                  minLength={6}
                  className="w-full px-4 py-3.5 pl-11 bg-[#1e293b] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#00d4ff] focus:ring-1 focus:ring-[#00d4ff]/50 transition-all"
                  placeholder="••••••••"
                />
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <p className="text-xs text-gray-500 mt-1.5">Minimum 6 caracteres</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                CONFIRMER LE MOT DE PASSE
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3.5 pl-11 bg-[#1e293b] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#00d4ff] focus:ring-1 focus:ring-[#00d4ff]/50 transition-all"
                  placeholder="••••••••"
                />
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-[#1e293b]/50 p-3.5 transition-colors hover:border-[#00d4ff]/40">
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                  consent ? 'border-[#00d4ff] bg-[#00d4ff]' : 'border-white/20 bg-transparent'
                }`}
              >
                {consent && (
                  <svg className="h-3.5 w-3.5 text-[#0a0e1a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              <input
                type="checkbox"
                className="sr-only"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                aria-label="Accepter les conditions d'utilisation et la politique de confidentialite"
              />
              <span className="text-sm leading-relaxed text-gray-300">
                J&apos;ai lu et j&apos;accepte les{' '}
                <Link href="/conditions" target="_blank" className="text-[#00d4ff] hover:underline">
                  Conditions d&apos;utilisation
                </Link>{' '}
                et la{' '}
                <Link href="/confidentialite" target="_blank" className="text-[#00d4ff] hover:underline">
                  Politique de confidentialité
                </Link>
                .
              </span>
            </label>

            <TurnstileWidget onVerify={setCaptchaToken} onExpire={() => setCaptchaToken(null)} />

            <button
              type="submit"
              disabled={loading || !consent || (isTurnstileEnabled && !captchaToken)}
              style={{ ['--glow' as string]: '#e91e8c' }}
              className="btn-glow w-full py-4 bg-gradient-to-r from-[#e91e8c] to-[#8b5cf6] hover:from-[#d11a7d] hover:to-[#7c3aed] text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  CREATION EN COURS...
                </span>
              ) : 'CREER MON COMPTE'}
            </button>
          </form>

          {/* Features */}
          <div className="mt-6 p-4 bg-[#1e293b]/50 rounded-xl">
            <p className="text-sm text-gray-400 mb-3">En creant ton compte, tu as acces a :</p>
            <ul className="space-y-2">
              {[
                'Swap de visage en temps reel',
                'Compatible WhatsApp, Zoom, Teams...',
                'Avatars personnalises'
              ].map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-sm text-gray-300">
                  <svg className="w-4 h-4 text-[#00d4ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <span className="text-gray-500 text-sm">ou</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </div>

          <p className="text-center text-gray-400">
            Deja un compte ?{' '}
            <Link href="/auth/login" className="text-[#00d4ff] hover:text-[#00b8e6] font-medium transition-colors">
              Se connecter
            </Link>
          </p>

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
