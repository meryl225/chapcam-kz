"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Zap, Camera, MonitorPlay, Copy, Check, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Link from "next/link"

interface LiveSwapClientProps {
  isActive: boolean
  currentPlan: string
}

export function LiveSwapClient({ isActive, currentPlan }: LiveSwapClientProps) {
  const [copied, setCopied] = useState(false)
  const activationKey = "CHAP-" + Math.random().toString(36).substring(2, 8).toUpperCase()

  const handleCopy = () => {
    navigator.clipboard.writeText(activationKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!isActive) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-6 max-w-md"
        >
          <div className="w-20 h-20 mx-auto rounded-full bg-white/5 flex items-center justify-center">
            <Lock className="w-10 h-10 text-gray-500" />
          </div>
          <h2 className="text-2xl font-bold text-white">Acces Verrouille</h2>
          <p className="text-gray-400">
            Active un abonnement pour acceder au Live Swap et commencer a transformer tes streams.
          </p>
          <Link href="/#tarifs">
            <Button className="bg-[#00ff88] hover:bg-[#00dd77] text-black font-bold px-8">
              <Zap className="w-4 h-4 mr-2" />
              VOIR LES OFFRES
            </Button>
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Live Swap</h1>
        <p className="text-gray-400">Configure ton extension OBS pour commencer le face swap en temps reel</p>
      </div>

      {/* Activation Key Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="bg-[#111111] border-white/10 p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-[#00ff88]/20 flex items-center justify-center flex-shrink-0">
              <Zap className="w-6 h-6 text-[#00ff88]" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white mb-1">Cle d&apos;Activation</h3>
              <p className="text-sm text-gray-400 mb-4">Utilise cette cle dans l&apos;extension OBS ChapCam</p>
              
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-[#00ff88] font-mono text-lg">
                  {activationKey}
                </code>
                <Button 
                  onClick={handleCopy}
                  variant="outline"
                  className="border-white/10 hover:bg-white/5"
                >
                  {copied ? <Check className="w-4 h-4 text-[#00ff88]" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Setup Guide */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="bg-[#111111] border-white/10 p-6">
          <h3 className="text-lg font-bold text-white mb-6">Guide d&apos;Installation</h3>
          
          <div className="grid md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-full bg-[#7c3aed]/20 flex items-center justify-center">
                <span className="text-[#7c3aed] font-bold">1</span>
              </div>
              <h4 className="font-semibold text-white">Telecharge l&apos;Extension</h4>
              <p className="text-sm text-gray-400">Installe l&apos;extension ChapCam depuis notre site ou le store OBS</p>
              <Button variant="outline" size="sm" className="border-[#7c3aed] text-[#7c3aed] hover:bg-[#7c3aed]/10">
                Telecharger
              </Button>
            </div>

            {/* Step 2 */}
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-full bg-[#00ff88]/20 flex items-center justify-center">
                <span className="text-[#00ff88] font-bold">2</span>
              </div>
              <h4 className="font-semibold text-white">Entre ta Cle</h4>
              <p className="text-sm text-gray-400">Copie la cle d&apos;activation ci-dessus et colle-la dans l&apos;extension</p>
            </div>

            {/* Step 3 */}
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <span className="text-blue-500 font-bold">3</span>
              </div>
              <h4 className="font-semibold text-white">Lance le Swap</h4>
              <p className="text-sm text-gray-400">Selectionne un avatar et demarre le face swap en temps reel</p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-[#111111] border-white/10 p-6 hover:border-[#00ff88]/50 transition-colors cursor-pointer">
            <Link href="/dashboard/avatars" className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Camera className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <h4 className="font-semibold text-white">Gerer mes Avatars</h4>
                <p className="text-sm text-gray-400">Ajoute ou modifie tes visages personnalises</p>
              </div>
            </Link>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-[#111111] border-white/10 p-6 hover:border-[#00ff88]/50 transition-colors cursor-pointer">
            <Link href="/dashboard/stats" className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <MonitorPlay className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <h4 className="font-semibold text-white">Voir les Statistiques</h4>
                <p className="text-sm text-gray-400">Consulte tes heures de stream et usage</p>
              </div>
            </Link>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
