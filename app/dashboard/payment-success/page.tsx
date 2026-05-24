"use client"

import { motion } from "framer-motion"
import { CheckCircle, ArrowRight, Zap, Gift } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00ff88]/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 max-w-md mx-auto px-4 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="w-24 h-24 bg-[#00ff88]/20 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <CheckCircle className="w-14 h-14 text-[#00ff88]" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-3xl font-bold mb-4"
        >
          Paiement reussi !
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-gray-400 mb-8"
        >
          Vos points ont ete credites sur votre compte. Vous pouvez maintenant profiter de ChapCam !
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Zap className="w-6 h-6 text-[#00ff88]" />
            <span className="text-lg font-semibold">Points ajoutes</span>
          </div>
          
          <div className="text-4xl font-bold text-[#00ff88] mb-2">
            + Points
          </div>
          
          <p className="text-sm text-gray-500">
            Disponibles immediatement
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="flex flex-col gap-3"
        >
          <Link
            href="/dashboard"
            className="w-full py-4 bg-[#00ff88] hover:bg-[#00ff88]/90 text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            Aller au Dashboard
            <ArrowRight className="w-5 h-5" />
          </Link>
          
          <Link
            href="/dashboard/plans"
            className="w-full py-4 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 border border-white/10"
          >
            <Gift className="w-5 h-5" />
            Voir mes avantages
          </Link>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-xs text-gray-500 mt-6"
        >
          Un recu a ete envoye a votre adresse email
        </motion.p>
      </motion.div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#00ff88] border-t-transparent rounded-full" />
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  )
}
