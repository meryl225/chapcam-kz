'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }
    
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caracteres')
      return
    }

    setLoading(true)
    setError('')
    
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      
      // Sign up - Supabase creates user in auth.users
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })
      
      if (signUpError) {
        // Handle specific Supabase errors
        if (signUpError.message.includes('already registered')) {
          setError('Cet email est deja utilise. Connectez-vous ou utilisez un autre email.')
        } else if (signUpError.message.includes('valid email')) {
          setError('Veuillez entrer une adresse email valide')
        } else if (signUpError.message.includes('password')) {
          setError('Le mot de passe doit contenir au moins 6 caracteres')
        } else {
          setError(signUpError.message)
        }
        setLoading(false)
        return
      }

      // Check if email confirmation is required
      if (data?.user?.identities?.length === 0) {
        setError('Cet email est deja utilise')
        setLoading(false)
        return
      }

      // Success - show confirmation message
      setSuccess(true)
      
    } catch (err) {
      console.error('[v0] Sign up error:', err)
      setError('Une erreur est survenue. Veuillez reessayer.')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-[#111] border border-[#222] rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-[#00ff88]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#00ff88]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Compte cree avec succes!</h1>
            <p className="text-gray-400 mb-6">
              Un email de confirmation a ete envoye a <span className="text-[#00ff88]">{email}</span>. 
              Cliquez sur le lien pour activer votre compte.
            </p>
            <p className="text-gray-500 text-sm mb-4">
              Verifiez aussi vos spams si vous ne voyez pas l&apos;email.
            </p>
            <Link 
              href="/auth/login"
              className="inline-block w-full py-3 bg-[#00ff88] text-black font-bold rounded-lg hover:bg-[#00cc6a] transition-colors"
            >
              ALLER A LA CONNEXION
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-[#111] border border-[#222] rounded-2xl p-8">
          {/* Logo */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold">
              <span className="text-white">Chap</span>
              <span className="text-[#00ff88]">Cam</span>
            </h1>
            <p className="text-gray-400 mt-2">Cree ton compte pour commencer</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm font-medium mb-2 uppercase tracking-wide">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ton@email.com"
                required
                className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#333] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#00ff88] transition-colors"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm font-medium mb-2 uppercase tracking-wide">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 caracteres"
                required
                minLength={6}
                className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#333] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#00ff88] transition-colors"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm font-medium mb-2 uppercase tracking-wide">
                Confirmer le mot de passe
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Retape ton mot de passe"
                required
                minLength={6}
                className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#333] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#00ff88] transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password || !confirmPassword}
              className="w-full py-4 bg-[#00ff88] text-black font-bold rounded-lg hover:bg-[#00cc6a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide mt-6"
            >
              {loading ? 'Creation en cours...' : 'CREER MON COMPTE'}
            </button>
          </form>

          {/* Links */}
          <div className="mt-6 text-center space-y-3">
            <p className="text-gray-400">
              Deja un compte ?{' '}
              <Link href="/auth/login" className="text-[#00ff88] hover:underline font-medium">
                Se connecter
              </Link>
            </p>
            <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm inline-block">
              &larr; Retour a l&apos;accueil
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
