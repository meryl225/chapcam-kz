"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react"

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const [sessionReady, setSessionReady] = useState(false)
  const [linkExpired, setLinkExpired] = useState(false)

  useEffect(() => {
    // 1) Erreur explicite renvoyee par /auth/confirm ou par Supabase (lien deja
    //    consomme / expire). On l'affiche clairement + on propose un renvoi.
    const params = new URLSearchParams(window.location.search)
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const resetError = params.get('reset_error') || hashParams.get('error_code')
    if (resetError) {
      setLinkExpired(true)
      setError(
        "Ce lien de reinitialisation n'est plus valide (deja utilise ou expire). Demandez-en un nouveau ci-dessous.",
      )
      return
    }

    // 2) La session est etablie par /auth/confirm (cookies) ou via le hash.
    //    On ecoute les evenements d'auth plutot que d'appeler getSession()
    //    immediatement (ce qui affichait un faux message "lien invalide").
    let settled = false

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: unknown) => {
      if (session) {
        settled = true
        setSessionReady(true)
        setError("")
      } else if (event === "SIGNED_OUT") {
        setSessionReady(false)
      }
    })

    // Verification initiale + filet de securite au cas ou l'evenement est deja passe
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        settled = true
        setSessionReady(true)
        setError("")
      }
    }
    check()

    // Si rien n'est etabli au bout de 4s, le lien est probablement invalide/expire
    const timeout = setTimeout(() => {
      if (!settled) {
        setLinkExpired(true)
        setError("Le lien de reinitialisation est invalide ou a expire. Demandez-en un nouveau ci-dessous.")
      }
    }, 4000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [supabase.auth])

  // Renvoi d'un nouveau lien de reinitialisation.
  const [resendEmail, setResendEmail] = useState("")
  const [resendLoading, setResendLoading] = useState(false)
  const [resendDone, setResendDone] = useState(false)

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
      setResendDone(true)
    } catch {
      setResendDone(true) // message neutre volontaire (on ne revele pas l'existence de l'email)
    } finally {
      setResendLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caracteres")
      return
    }

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas")
      return
    }

    setIsLoading(true)

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      })

      if (updateError) {
        setError(updateError.message)
      } else {
        setSuccess(true)
        // Rediriger vers la page de connexion apres 3 secondes
        setTimeout(() => {
          router.push("/auth/login")
        }, 3000)
      }
    } catch (err) {
      setError("Une erreur est survenue. Veuillez reessayer.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#00ff88]/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold">
              <span className="text-[#00ff88]">Chap</span>
              <span className="text-white">Cam</span>
            </h1>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-[#111111]/80 backdrop-blur-xl rounded-2xl p-8 border border-white/10 shadow-2xl">
          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <div className="w-20 h-20 bg-[#00ff88]/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-[#00ff88]" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">
                Mot de passe mis a jour!
              </h2>
              <p className="text-gray-400 mb-6">
                Votre mot de passe a ete modifie avec succes. Vous allez etre redirige vers la page de connexion.
              </p>
              <Link href="/auth/login">
                <button className="w-full py-4 bg-[#00ff88] text-black font-bold rounded-xl hover:bg-[#00dd77] transition-all">
                  Se connecter maintenant
                </button>
              </Link>
            </motion.div>
          ) : linkExpired ? (
            <div className="py-2">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-red-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Lien expire</h2>
                <p className="text-gray-400 text-sm">
                  {error || "Ce lien n'est plus valide. Recevez-en un nouveau."}
                </p>
              </div>

              {resendDone ? (
                <div className="text-center p-4 bg-[#00ff88]/10 border border-[#00ff88]/30 rounded-xl">
                  <CheckCircle className="w-6 h-6 text-[#00ff88] mx-auto mb-2" />
                  <p className="text-sm text-gray-300">
                    Si cet email existe, un nouveau lien vient d&apos;etre envoye. Pensez a verifier vos spams,
                    et ouvrez le lien directement dans votre navigateur.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleResend} className="space-y-4">
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="email"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00ff88]/50 focus:border-transparent transition-all"
                      placeholder="Votre adresse email"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={resendLoading}
                    className="w-full py-4 bg-[#00ff88] text-black font-bold rounded-xl hover:bg-[#00dd77] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {resendLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        Envoi...
                      </>
                    ) : (
                      "Recevoir un nouveau lien"
                    )}
                  </button>
                </form>
              )}
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-[#00ff88]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-[#00ff88]" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Nouveau mot de passe
                </h2>
                <p className="text-gray-400 text-sm">
                  Creez un nouveau mot de passe securise
                </p>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <p className="text-red-400 text-sm">{error}</p>
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Nouveau mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl py-4 pl-12 pr-12 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00ff88]/50 focus:border-transparent transition-all"
                      placeholder="Minimum 6 caracteres"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Confirmer le mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl py-4 pl-12 pr-12 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00ff88]/50 focus:border-transparent transition-all"
                      placeholder="Repetez le mot de passe"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 bg-[#00ff88] text-black font-bold rounded-xl hover:bg-[#00dd77] transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      Mise a jour...
                    </>
                  ) : (
                    "Mettre a jour le mot de passe"
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          <Link href="/auth/login" className="text-[#00ff88] hover:underline">
            Retour a la connexion
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
