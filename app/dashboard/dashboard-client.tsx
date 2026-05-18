"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"
import { 
  Download, 
  CreditCard, 
  Crown, 
  MessageCircle, 
  LogOut, 
  User as UserIcon,
  Zap,
  Clock,
  CheckCircle,
  ExternalLink,
  Copy,
  Check
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { User } from "@supabase/supabase-js"

interface DashboardClientProps {
  user: User
  profile: {
    id: string
    email: string
    full_name: string | null
    created_at: string
  } | null
  subscription: {
    id: string
    plan_type: string
    status: string
    starts_at: string
    expires_at: string
    amount_paid: number
  } | null
}

const planLabels: Record<string, string> = {
  "1_day": "1 Jour",
  "30_days": "30 Jours",
  "90_days": "90 Jours",
  "365_days": "365 Jours"
}

export default function DashboardClient({ user, profile, subscription }: DashboardClientProps) {
  const [copied, setCopied] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = "/"
  }

  const copyExtensionKey = () => {
    navigator.clipboard.writeText(user.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const hasActiveSubscription = subscription && new Date(subscription.expires_at) > new Date()

  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#111827]/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo%20chapcam-Zg2rUUnOrSECjteElTxoU1rcYfwF3i.jpg"
              alt="ChapCam"
              width={40}
              height={40}
              className="rounded-lg"
            />
            <span className="text-xl font-bold bg-gradient-to-r from-[#8b5cf6] via-[#00d4ff] via-[#22c55e] to-[#f97316] bg-clip-text text-transparent">
              ChapCam
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-gray-400">
              <UserIcon className="w-4 h-4" />
              <span className="text-sm">{profile?.full_name || user.email}</span>
            </div>
            <Button
              onClick={handleLogout}
              disabled={loggingOut}
              variant="ghost"
              className="text-gray-400 hover:text-white hover:bg-white/10"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Deconnexion
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-bold text-white mb-2">
            Bienvenue, {profile?.full_name?.split(" ")[0] || "Utilisateur"}
          </h1>
          <p className="text-gray-400 mb-8">
            Gere ton abonnement et configure ton extension ChapCam
          </p>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            {/* Extension OBS */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-br from-[#8b5cf6]/20 to-[#8b5cf6]/5 rounded-2xl border border-[#8b5cf6]/30 p-6 hover:border-[#8b5cf6]/50 transition-all group"
            >
              <div className="w-12 h-12 bg-[#8b5cf6]/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Download className="w-6 h-6 text-[#8b5cf6]" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Extension OBS</h3>
              <p className="text-gray-400 text-sm mb-4">Telecharge l&apos;extension pour OBS Studio</p>
              <Button className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] text-white">
                <Download className="w-4 h-4 mr-2" />
                Telecharger
              </Button>
            </motion.div>

            {/* Acheter Forfait */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-[#00d4ff]/20 to-[#00d4ff]/5 rounded-2xl border border-[#00d4ff]/30 p-6 hover:border-[#00d4ff]/50 transition-all group"
            >
              <div className="w-12 h-12 bg-[#00d4ff]/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <CreditCard className="w-6 h-6 text-[#00d4ff]" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Acheter un forfait</h3>
              <p className="text-gray-400 text-sm mb-4">Active ton acces au face swap IA</p>
              <Link href="/dashboard/pricing">
                <Button className="w-full bg-[#00d4ff] hover:bg-[#00b8e6] text-black font-semibold">
                  <Zap className="w-4 h-4 mr-2" />
                  Voir les forfaits
                </Button>
              </Link>
            </motion.div>

            {/* Mon Abonnement */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className={`bg-gradient-to-br ${hasActiveSubscription ? "from-[#22c55e]/20 to-[#22c55e]/5 border-[#22c55e]/30 hover:border-[#22c55e]/50" : "from-[#f97316]/20 to-[#f97316]/5 border-[#f97316]/30 hover:border-[#f97316]/50"} rounded-2xl border p-6 transition-all group`}
            >
              <div className={`w-12 h-12 ${hasActiveSubscription ? "bg-[#22c55e]/20" : "bg-[#f97316]/20"} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <Crown className={`w-6 h-6 ${hasActiveSubscription ? "text-[#22c55e]" : "text-[#f97316]"}`} />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Mon abonnement</h3>
              {hasActiveSubscription ? (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-[#22c55e]" />
                    <span className="text-[#22c55e] font-medium">{planLabels[subscription.plan_type]}</span>
                  </div>
                  <p className="text-gray-400 text-sm">
                    Expire le {new Date(subscription.expires_at).toLocaleDateString("fr-FR")}
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-[#f97316]" />
                    <span className="text-[#f97316] font-medium">Aucun abonnement</span>
                  </div>
                  <p className="text-gray-400 text-sm">Active un forfait pour commencer</p>
                </>
              )}
            </motion.div>

            {/* Support WhatsApp */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-gradient-to-br from-[#25D366]/20 to-[#25D366]/5 rounded-2xl border border-[#25D366]/30 p-6 hover:border-[#25D366]/50 transition-all group"
            >
              <div className="w-12 h-12 bg-[#25D366]/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <MessageCircle className="w-6 h-6 text-[#25D366]" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Support</h3>
              <p className="text-gray-400 text-sm mb-4">Besoin d&apos;aide? Contacte-nous</p>
              <a href="https://wa.me/1234567890" target="_blank" rel="noopener noreferrer">
                <Button className="w-full bg-[#25D366] hover:bg-[#1da851] text-white">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  WhatsApp
                </Button>
              </a>
            </motion.div>
          </div>

          {/* Extension Key Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-[#111827]/50 rounded-2xl border border-white/10 p-6 mb-8"
          >
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#00d4ff]" />
              Cle d&apos;activation Extension
            </h2>
            <p className="text-gray-400 mb-4">
              Utilise cette cle pour activer l&apos;extension ChapCam dans OBS ou ton application de streaming.
            </p>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-[#1e293b] rounded-xl px-4 py-3 font-mono text-[#00d4ff] text-sm overflow-x-auto">
                {user.id}
              </div>
              <Button
                onClick={copyExtensionKey}
                className="bg-[#1e293b] hover:bg-[#2d3a4f] text-white"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </motion.div>

          {/* Guide Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-gradient-to-r from-[#8b5cf6]/10 via-[#00d4ff]/10 to-[#22c55e]/10 rounded-2xl border border-white/10 p-6"
          >
            <h2 className="text-xl font-semibold text-white mb-4">Comment utiliser ChapCam?</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-[#8b5cf6] rounded-full flex items-center justify-center text-white font-bold shrink-0">1</div>
                <div>
                  <h3 className="text-white font-medium mb-1">Telecharge l&apos;extension</h3>
                  <p className="text-gray-400 text-sm">Installe notre plugin pour OBS Studio ou utilise notre app desktop.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-[#00d4ff] rounded-full flex items-center justify-center text-black font-bold shrink-0">2</div>
                <div>
                  <h3 className="text-white font-medium mb-1">Active ton forfait</h3>
                  <p className="text-gray-400 text-sm">Choisis un forfait et active ton compte avec ta cle.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-[#22c55e] rounded-full flex items-center justify-center text-white font-bold shrink-0">3</div>
                <div>
                  <h3 className="text-white font-medium mb-1">Lance ton stream</h3>
                  <p className="text-gray-400 text-sm">Transforme ton apparence en temps reel sur toutes les plateformes.</p>
                </div>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <a href="#" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Voir le tutoriel
                </Button>
              </a>
            </div>
          </motion.div>
        </motion.div>
      </main>
    </div>
  )
}
