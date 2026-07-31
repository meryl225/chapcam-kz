'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  // Etats du flux de reinitialisation
  const [sessionReady, setSessionReady] = useState(false)
  const [linkExpired, setLinkExpired] = useState(false)
  // Renvoi d'un nouveau lien
  const [resendEmail, setResendEmail] = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const [resendDone, setResendDone] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    // 1) Le lien peut arriver avec une erreur DEJA renvoyee par Supabase
    //    (?error=access_denied&error_code=otp_expired ou dans le hash #error=...).
    //    C'est le cas quand le lien a ete pre-ouvert (apercu WhatsApp / antivirus)
    //    ou qu'il a expire : le jeton a usage unique est deja consomme.
    const search = new URLSearchParams(window.location.search)
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const errCode = search.get('error_code') || hash.get('error_code') || search.get('error') || hash.get('error')
    if (errCode) {
      setLinkExpired(true)
      setError("Ce lien n'est plus valide (deja utilise ou expire). Demandez-en un nouveau ci-dessous.")
      return
    }

    // 2) Sinon, on attend que la session soit etablie. Avec le flux PKCE, le
    //    client @supabase/ssr echange automatiquement le ?code=... present dans
    //    l'URL (detectSessionInUrl). On ECOUTE l'evenement plutot que d'appeler
    //    getSession() immediatement (ce qui donnait un faux "lien invalide").
    let settled = false

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: unknown) => {
      if (session) {
        settled = true
        setSessionReady(true)
        setError(null)
      }
    })

    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        settled = true
        setSessionReady(true)
        setError(null)
      }
    }
    check()

    // Filet de securite : si aucune session au bout de 4s, le lien est mort.
    const timeout = setTimeout(() => {
      if (!settled) {
        setLinkExpired(true)
        setError('Le lien de reinitialisation est invalide ou a expire. Demandez-en un nouveau ci-dessous.')
      }
    }, 4000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caracteres')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      })

      if (updateError) {
        // Session absente => lien mort : on bascule sur l'ecran de renvoi.
        if (/session/i.test(updateError.message)) {
          setLinkExpired(true)
          setError("Votre session de reinitialisation a expire. Demandez un nouveau lien ci-dessous.")
        } else {
          setError(updateError.message)
        }
      } else {
        setSuccess(true)
        setTimeout(() => {
          router.push('/auth/login')
        }, 3000)
      }
    } catch {
      setError('Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resendEmail) return
    setResendLoading(true)
    try {
      await fetch('/api/email/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resendEmail }),
      })
    } catch {
      // message neutre volontaire : on ne revele pas l'existence de l'email
    } finally {
      setResendDone(true)
      setResendLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-[#0a0e1a]">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-[#00d4ff]/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-[#e91e8c]/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#8b5cf6]/10 rounded-full blur-[150px]" />
        
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      <div className="relative w-full max-w-md">
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
              {linkExpired ? 'Lien expire' : 'Nouveau mot de passe'}
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

          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-[#00d4ff] to-[#8b5cf6] flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Mot de passe modifie !</h3>
              <p className="text-gray-400 text-sm mb-6">
                Tu vas etre redirige vers la page de connexion...
              </p>
              <Link
                href="/auth/login"
                className="text-[#00d4ff] hover:text-[#00b8e6] transition-colors"
              >
                Aller a la connexion
              </Link>
            </div>
          ) : linkExpired ? (
            /* Ecran de renvoi d'un nouveau lien */
            resendDone ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-[#00d4ff] to-[#8b5cf6] flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Nouveau lien envoye</h3>
                <p className="text-gray-400 text-sm">
                  Si cet email existe, un nouveau lien vient d&apos;etre envoye. Verifiez vos spams, puis
                  <span className="text-white font-medium"> ouvrez le lien directement dans votre navigateur</span> (pas via l&apos;apercu WhatsApp).
                </p>
              </div>
            ) : (
              <form onSubmit={handleResend} className="space-y-5">
                <p className="text-sm text-gray-400 -mt-2">
                  Entrez votre email pour recevoir un nouveau lien de reinitialisation.
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    ADRESSE EMAIL
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
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
                  disabled={resendLoading}
                  className="w-full py-4 bg-gradient-to-r from-[#e91e8c] to-[#8b5cf6] hover:from-[#d11a7d] hover:to-[#7c3aed] text-white font-bold rounded-xl transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg shadow-[#e91e8c]/20"
                >
                  {resendLoading ? 'ENVOI...' : 'RECEVOIR UN NOUVEAU LIEN'}
                </button>
              </form>
            )
          ) : !sessionReady ? (
            /* En attente de l'etablissement de la session */
            <div className="text-center py-10">
              <svg className="animate-spin w-8 h-8 mx-auto text-[#00d4ff]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-gray-400 text-sm mt-4">Verification du lien...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  NOUVEAU MOT DE PASSE
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

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-[#e91e8c] to-[#8b5cf6] hover:from-[#d11a7d] hover:to-[#7c3aed] text-white font-bold rounded-xl transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg shadow-[#e91e8c]/20"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    MODIFICATION...
                  </span>
                ) : 'MODIFIER MON MOT DE PASSE'}
              </button>
            </form>
          )}

          <Link 
            href="/auth/login" 
            className="flex items-center justify-center gap-2 text-gray-500 hover:text-white mt-6 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Retour a la connexion
          </Link>
        </div>
      </div>
    </div>
  )
}
