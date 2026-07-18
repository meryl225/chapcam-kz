"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Mail, Send, Users, Calendar, Clock, CheckCircle, XCircle, Loader2, Rocket, Bell, CalendarDays, Gift, Eye, Monitor, Video, LifeBuoy, MessageCircle, Phone } from "lucide-react"
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

  // --- Campagne bonus Live Pro (premiers utilisateurs) ---
  const [bonusBusy, setBonusBusy] = useState<null | "preview" | "run">(null)
  const [bonusInfo, setBonusInfo] = useState<string | null>(null)
  const [bonusStats, setBonusStats] = useState<
    | { uniqueUsers: number; eligible: number; alreadyGranted: number; missingUser: number; credited?: number; emailsSent?: number; emailsFailed?: number }
    | null
  >(null)

  const previewBonus = async () => {
    setBonusBusy("preview")
    setBonusInfo(null)
    try {
      const res = await fetch("/api/admin/live-bonus", { method: "GET" })
      const data = await res.json()
      if (data.success) {
        setBonusStats(data.stats)
        setBonusInfo(
          `${data.stats.eligible} utilisateur(s) recevront 1h de Live Pro. ${data.stats.alreadyGranted} deja servi(s), ${data.stats.missingUser} paiement(s) sans compte ignore(s).`,
        )
      } else {
        setBonusInfo(data.error || "Erreur lors de l'apercu")
      }
    } catch (e: any) {
      setBonusInfo(e.message || "Erreur de connexion")
    } finally {
      setBonusBusy(null)
    }
  }

  const runBonus = async () => {
    if (!confirm("Confirmer : crediter 1h de Live Pro a tous les payeurs approuves et leur envoyer un email ?")) return
    setBonusBusy("run")
    setBonusInfo(null)
    try {
      const res = await fetch("/api/admin/live-bonus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sendEmails: true }),
      })
      const data = await res.json()
      if (data.success) {
        setBonusStats(data.stats)
        setBonusInfo(data.message)
      } else {
        setBonusInfo(data.error || "Erreur lors de l'execution")
      }
    } catch (e: any) {
      setBonusInfo(e.message || "Erreur de connexion")
    } finally {
      setBonusBusy(null)
    }
  }

  const sendCampaign = async (type: "D2" | "D1" | "DJ" | "PC" | "VIDEO" | "SUPPORT" | "V2") => {
    if (type === "V2" && !confirm("Envoyer la campagne 'ChapCam 2.0 disponible' a TOUS les utilisateurs inscrits ?")) return
    if (type === "PC" && !confirm("Envoyer la campagne 'ChapCam PC a vie - 50 000 FCFA' a TOUS les utilisateurs inscrits ?")) return
    if (type === "VIDEO" && !confirm("Envoyer la campagne 'Appels video' a TOUS les utilisateurs inscrits ?")) return
    if (type === "SUPPORT" && !confirm("Envoyer la campagne 'Assistance / Besoin d'aide ?' a TOUS les utilisateurs inscrits ?")) return
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

        {/* Campagne ChapCam 2.0 - nouvelle version */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-6xl mx-auto mb-10"
        >
          <div className="bg-gradient-to-br from-[#1e1233] to-[#0f1420] border border-[#a855f7]/40 rounded-2xl p-6">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-12 h-12 rounded-xl bg-[#a855f7]/15 flex items-center justify-center flex-shrink-0">
                <Rocket className="w-6 h-6 text-[#a855f7]" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-1">Campagne ChapCam 2.0 - Nouvelle version</h3>
                <p className="text-gray-400 text-sm">
                  Annonce a tous les inscrits la sortie de <strong className="text-white">ChapCam 2.0</strong> (17 juillet) :
                  fonctionne desormais sur <strong className="text-[#00ff88]">tout type de PC</strong> (plus besoin de PC Gamer),
                  transformation du visage, du corps et de la <strong className="text-white">couleur de peau</strong>.
                  L&apos;email contient un bouton <strong className="text-white">Tester (recharges)</strong> et un bouton
                  <strong className="text-[#25D366]"> WhatsApp</strong>.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 mb-5 text-sm">
              <span className="inline-flex items-center gap-1.5 text-gray-300">
                <Users className="w-4 h-4 text-[#a855f7]" />
                Tous les utilisateurs inscrits
              </span>
              <span className="inline-flex items-center gap-1.5 text-gray-300">
                <Clock className="w-4 h-4 text-[#a855f7]" />
                Sujet : &quot;ChapCam 2.0 est disponible&quot;
              </span>
            </div>

            <button
              onClick={() => sendCampaign("V2")}
              disabled={sending !== null}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#a855f7] to-[#00d4ff] text-white font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending === "V2" ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Envoyer la campagne ChapCam 2.0
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* Bonus Live Pro - premiers utilisateurs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-6xl mx-auto mb-10"
        >
          <div className="bg-gradient-to-br from-[#0f2a1f] to-[#0f1420] border border-[#00ff88]/30 rounded-2xl p-6">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-12 h-12 rounded-xl bg-[#00ff88]/15 flex items-center justify-center flex-shrink-0">
                <Gift className="w-6 h-6 text-[#00ff88]" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-1">Bonus Live Pro - Premiers utilisateurs</h3>
                <p className="text-gray-400 text-sm">
                  Offre <strong className="text-[#00ff88]">1h de Live Pro</strong> (4 fenetres de 15 min) a chaque
                  personne ayant un paiement approuve. Chaque utilisateur n&apos;est credite qu&apos;une seule fois.
                </p>
              </div>
            </div>

            {bonusInfo && (
              <div className="mb-4 rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-gray-200">
                {bonusInfo}
              </div>
            )}

            {bonusStats && (
              <div className="mb-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="rounded-lg bg-white/5 px-3 py-2 text-center">
                  <p className="text-lg font-bold text-white">{bonusStats.uniqueUsers}</p>
                  <p className="text-xs text-gray-400">Payeurs</p>
                </div>
                <div className="rounded-lg bg-[#00ff88]/10 px-3 py-2 text-center">
                  <p className="text-lg font-bold text-[#00ff88]">
                    {bonusStats.credited ?? bonusStats.eligible}
                  </p>
                  <p className="text-xs text-gray-400">{bonusStats.credited != null ? "Credites" : "Eligibles"}</p>
                </div>
                <div className="rounded-lg bg-white/5 px-3 py-2 text-center">
                  <p className="text-lg font-bold text-white">{bonusStats.alreadyGranted}</p>
                  <p className="text-xs text-gray-400">Deja servis</p>
                </div>
                <div className="rounded-lg bg-[#00d4ff]/10 px-3 py-2 text-center">
                  <p className="text-lg font-bold text-[#00d4ff]">{bonusStats.emailsSent ?? "-"}</p>
                  <p className="text-xs text-gray-400">Emails envoyes</p>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={previewBonus}
                disabled={bonusBusy !== null}
                className="flex-1 py-3 px-4 rounded-xl bg-white/10 text-white font-bold flex items-center justify-center gap-2 hover:bg-white/15 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bonusBusy === "preview" ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Calcul...
                  </>
                ) : (
                  <>
                    <Eye className="w-5 h-5" />
                    Apercu (ne credite rien)
                  </>
                )}
              </button>
              <button
                onClick={runBonus}
                disabled={bonusBusy !== null}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#00ff88] to-[#00d4ff] text-black font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bonusBusy === "run" ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Attribution en cours...
                  </>
                ) : (
                  <>
                    <Gift className="w-5 h-5" />
                    Lancer le bonus + email
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Campagne Assistance / Support */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-6xl mx-auto mb-10"
        >
          <div className="bg-gradient-to-br from-[#0f2a1f] to-[#0f1420] border border-[#00ff88]/30 rounded-2xl p-6">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-12 h-12 rounded-xl bg-[#00ff88]/15 flex items-center justify-center flex-shrink-0">
                <LifeBuoy className="w-6 h-6 text-[#00ff88]" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-1">Campagne Assistance - Besoin d&apos;aide ?</h3>
                <p className="text-gray-400 text-sm">
                  Demande a tous les inscrits s&apos;ils <strong className="text-white">rencontrent un probleme</strong> pour
                  utiliser le logiciel IA. L&apos;email contient un bouton
                  <strong className="text-[#25D366]"> WhatsApp</strong> et un bouton
                  <strong className="text-white"> appel</strong> vers le +225 05 55 56 01 89.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 mb-5 text-sm">
              <span className="inline-flex items-center gap-1.5 text-gray-300">
                <Users className="w-4 h-4 text-[#00ff88]" />
                Tous les utilisateurs inscrits
              </span>
              <span className="inline-flex items-center gap-1.5 text-gray-300">
                <MessageCircle className="w-4 h-4 text-[#25D366]" />
                Contact WhatsApp
              </span>
              <span className="inline-flex items-center gap-1.5 text-gray-300">
                <Phone className="w-4 h-4 text-[#00d4ff]" />
                Appel direct
              </span>
            </div>

            <button
              onClick={() => sendCampaign("SUPPORT")}
              disabled={sending !== null}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#00ff88] to-[#00d4ff] text-black font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending === "SUPPORT" ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Envoyer la campagne Assistance
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* Campagne ChapCam PC a vie */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-6xl mx-auto mb-10"
        >
          <div className="bg-gradient-to-br from-[#13203a] to-[#0f1420] border border-[#00d4ff]/30 rounded-2xl p-6">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-12 h-12 rounded-xl bg-[#00d4ff]/15 flex items-center justify-center flex-shrink-0">
                <Monitor className="w-6 h-6 text-[#00d4ff]" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-1">Campagne ChapCam PC - Logiciel a VIE</h3>
                <p className="text-gray-400 text-sm">
                  Annonce a tous les inscrits : <strong className="text-[#00ff88]">50 000 FCFA a vie</strong> (paiement unique)
                  pour les premiers utilisateurs. A partir du <strong className="text-white">dimanche 14 juin</strong>, l&apos;offre
                  passe a <strong className="text-white">50 000 FCFA / mois</strong> avec acces illimite.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 mb-5 text-sm">
              <span className="inline-flex items-center gap-1.5 text-gray-300">
                <Users className="w-4 h-4 text-[#00d4ff]" />
                Tous les utilisateurs inscrits
              </span>
              <span className="inline-flex items-center gap-1.5 text-gray-300">
                <Clock className="w-4 h-4 text-[#00d4ff]" />
                Sujet : &quot;ChapCam PC a VIE pour 50 000 FCFA&quot;
              </span>
            </div>

            <button
              onClick={() => sendCampaign("PC")}
              disabled={sending !== null}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#00ff88] to-[#00d4ff] text-black font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending === "PC" ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Envoyer la campagne ChapCam PC a vie
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* Campagne Appels video */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-6xl mx-auto mb-10"
        >
          <div className="bg-gradient-to-br from-[#0f2a1f] to-[#0f1420] border border-[#00ff88]/30 rounded-2xl p-6">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-12 h-12 rounded-xl bg-[#00ff88]/15 flex items-center justify-center flex-shrink-0">
                <Video className="w-6 h-6 text-[#00ff88]" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-1">Campagne Appels video</h3>
                <p className="text-gray-400 text-sm">
                  Annonce a tous les inscrits : change ton apparence <strong className="text-[#00ff88]">en direct</strong> pendant
                  tes appels video (WhatsApp, Zoom, TikTok Live...). Installation sur place a Yopougon Niangon (Texaco) ou
                  assistance a distance.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 mb-5 text-sm">
              <span className="inline-flex items-center gap-1.5 text-gray-300">
                <Users className="w-4 h-4 text-[#00ff88]" />
                Tous les utilisateurs inscrits
              </span>
              <span className="inline-flex items-center gap-1.5 text-gray-300">
                <Clock className="w-4 h-4 text-[#00ff88]" />
                Sujet : &quot;Change ton apparence pendant tes appels video&quot;
              </span>
            </div>

            <button
              onClick={() => sendCampaign("VIDEO")}
              disabled={sending !== null}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#00ff88] to-[#00d4ff] text-black font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending === "VIDEO" ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Envoyer la campagne Appels video
                </>
              )}
            </button>
          </div>
        </motion.div>

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
                        {result.type === "D2" ? "Rappel J-2" : result.type === "D1" ? "Rappel J-1" : result.type === "PC" ? "ChapCam PC a vie" : result.type === "VIDEO" ? "Appels video" : result.type === "SUPPORT" ? "Assistance / Support" : "Lancement Jour J"}
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
