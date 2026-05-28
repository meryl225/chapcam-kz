"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Mail, Send, Users, Calendar, Clock, CheckCircle, XCircle, Loader2, Rocket, Bell, CalendarDays } from "lucide-react"
import Link from "next/link"

export default function AdminCampaignPage() {
  const [sending, setSending] = useState<string | null>(null)
  const [results, setResults] = useState<
    {
      type: string
      success: boolean
      message: string
      stats?: { total: number; success: number; errors: number }
      errorSamples?: { email: string; error: string }[]
    }[]
  >([])

  const sendCampaign = async (type: "D2" | "D1" | "DJ") => {
    setSending(type)

    try {
      const res = await fetch("/api/email-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      })

      const data = await res.json()

      setResults((prev) => [
        {
          type,
          success: data.success && (data.stats?.success ?? 0) > 0,
          message: data.success
            ? `${data.stats?.success ?? data.sent} email(s) envoye(s) sur ${data.stats?.total ?? "?"} utilisateur(s)${
                data.stats?.errors ? ` - ${data.stats.errors} echec(s)` : ""
              }`
            : data.error || "Erreur lors de l'envoi",
          stats: data.stats,
          errorSamples: data.errorSamples,
        },
        ...prev,
      ])
    } catch (error: any) {
      setResults((prev) => [
        {
          type,
          success: false,
          message: error.message || "Erreur de connexion",
        },
        ...prev,
      ])
    } finally {
      setSending(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0a0e1a]/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00d4ff] to-[#e91e8c] flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <span className="text-white font-bold">ChapCam Admin</span>
          </Link>
          <Link 
            href="/dashboard" 
            className="text-white/60 hover:text-white text-sm transition-colors"
          >
            Retour au dashboard
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        {/* Title */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-[#00d4ff]/10 border border-[#00d4ff]/30 px-4 py-2 rounded-full mb-4"
          >
            <Mail className="w-4 h-4 text-[#00d4ff]" />
            <span className="text-[#00d4ff] font-medium text-sm">Campagne Email</span>
          </motion.div>
          
          <h1 className="text-3xl md:text-4xl font-black text-white mb-4">
            Lancement ChapCam
          </h1>
          <p className="text-gray-400 max-w-xl mx-auto">
            Envoie les emails de rappel aux utilisateurs inscrits pour le lancement du <span className="text-[#00ff88] font-bold">Samedi 30 Mai a 19h GMT</span>
          </p>
        </div>

        {/* Campaign Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-12">
          {/* Jeudi J-2 */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-[#1a1f35] to-[#0f1420] border border-white/10 rounded-2xl p-6 hover:border-[#a855f7]/30 transition-all"
          >
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-[#a855f7]/20 flex items-center justify-center flex-shrink-0">
                <CalendarDays className="w-6 h-6 text-[#a855f7]" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-1">Rappel J-2</h3>
                <p className="text-gray-400 text-sm">Jeudi 28 Mai</p>
              </div>
            </div>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2 text-gray-300 text-sm">
                <Calendar className="w-4 h-4 text-[#a855f7]" />
                <span>Email de teasing</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300 text-sm">
                <Users className="w-4 h-4 text-[#a855f7]" />
                <span>Tous les utilisateurs inscrits</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300 text-sm">
                <Clock className="w-4 h-4 text-[#a855f7]" />
                <span>Sujet: &quot;J-2 Lancement ChapCam&quot;</span>
              </div>
            </div>

            <button
              onClick={() => sendCampaign("D2")}
              disabled={sending !== null}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#a855f7] to-[#6366f1] text-white font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending === "D2" ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Envoyer le rappel J-2
                </>
              )}
            </button>
          </motion.div>

          {/* Vendredi D-1 */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-[#1a1f35] to-[#0f1420] border border-white/10 rounded-2xl p-6 hover:border-[#00d4ff]/30 transition-all"
          >
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-[#00d4ff]/20 flex items-center justify-center flex-shrink-0">
                <Bell className="w-6 h-6 text-[#00d4ff]" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-1">Rappel J-1</h3>
                <p className="text-gray-400 text-sm">Vendredi 29 Mai</p>
              </div>
            </div>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2 text-gray-300 text-sm">
                <Calendar className="w-4 h-4 text-[#00d4ff]" />
                <span>Email de rappel pour demain</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300 text-sm">
                <Users className="w-4 h-4 text-[#00d4ff]" />
                <span>Tous les utilisateurs inscrits</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300 text-sm">
                <Clock className="w-4 h-4 text-[#00d4ff]" />
                <span>Sujet: &quot;Demain c&apos;est le grand jour!&quot;</span>
              </div>
            </div>

            <button
              onClick={() => sendCampaign("D1")}
              disabled={sending !== null}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#00d4ff] to-[#0099cc] text-white font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending === "D1" ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Envoyer le rappel J-1
                </>
              )}
            </button>
          </motion.div>

          {/* Samedi Jour J */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-[#1a1f35] to-[#0f1420] border border-white/10 rounded-2xl p-6 hover:border-[#e91e8c]/30 transition-all"
          >
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-[#e91e8c]/20 flex items-center justify-center flex-shrink-0">
                <Rocket className="w-6 h-6 text-[#e91e8c]" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-1">Jour J - Lancement</h3>
                <p className="text-gray-400 text-sm">Samedi 30 Mai</p>
              </div>
            </div>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2 text-gray-300 text-sm">
                <Calendar className="w-4 h-4 text-[#e91e8c]" />
                <span>Email de lancement officiel</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300 text-sm">
                <Users className="w-4 h-4 text-[#e91e8c]" />
                <span>Tous les utilisateurs inscrits</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300 text-sm">
                <Clock className="w-4 h-4 text-[#e91e8c]" />
                <span>Sujet: &quot;ChapCam est LIVE!&quot;</span>
              </div>
            </div>

            <button
              onClick={() => sendCampaign("DJ")}
              disabled={sending !== null}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#e91e8c] to-[#ff6b35] text-white font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending === "DJ" ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Envoyer l&apos;email de lancement
                </>
              )}
            </button>
          </motion.div>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto"
          >
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Historique des envois
            </h3>
            <div className="space-y-3">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-xl border ${
                    result.success
                      ? "bg-[#00ff88]/10 border-[#00ff88]/30"
                      : "bg-red-500/10 border-red-500/30"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {result.success ? (
                      <CheckCircle className="w-5 h-5 text-[#00ff88] flex-shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    )}
                    <div>
                      <span className="text-white font-medium">
                        {result.type === "D2" ? "Rappel J-2" : result.type === "D1" ? "Rappel J-1" : "Lancement Jour J"}
                      </span>
                      <span className="text-gray-400 mx-2">-</span>
                      <span className={result.success ? "text-[#00ff88]" : "text-red-400"}>
                        {result.message}
                      </span>
                    </div>
                  </div>

                  {/* Stats detaillees */}
                  {result.stats && (
                    <div className="mt-3 grid grid-cols-3 gap-2 pl-8">
                      <div className="rounded-lg bg-white/5 px-3 py-2 text-center">
                        <p className="text-lg font-bold text-white">{result.stats.total}</p>
                        <p className="text-xs text-gray-400">Utilisateurs</p>
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

                  {/* Erreurs Resend detaillees */}
                  {result.errorSamples && result.errorSamples.length > 0 && (
                    <div className="mt-3 pl-8">
                      <p className="text-xs font-bold text-red-400 mb-1">
                        Detail des erreurs Resend (echantillon):
                      </p>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {result.errorSamples.map((e, i) => (
                          <p key={i} className="text-xs text-red-300/80 font-mono break-all">
                            {e.email}: {e.error}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Info Box */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="max-w-2xl mx-auto mt-12 p-6 rounded-2xl bg-[#1a1f35]/50 border border-white/10"
        >
          <h4 className="text-white font-bold mb-3">Information</h4>
          <ul className="space-y-2 text-gray-400 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-[#a855f7]">1.</span>
              <span>Envoie le rappel J-2 le <strong className="text-white">Jeudi 28 Mai</strong> dans la journee</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#00d4ff]">2.</span>
              <span>Envoie le rappel J-1 le <strong className="text-white">Vendredi 29 Mai</strong> dans la journee</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#e91e8c]">3.</span>
              <span>Envoie l&apos;email de lancement le <strong className="text-white">Samedi 30 Mai</strong> vers 18h30 GMT</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#00ff88]">4.</span>
              <span>Les emails contiennent le lien vers le site et les offres de lancement (-29%)</span>
            </li>
          </ul>
        </motion.div>
      </main>
    </div>
  )
}
