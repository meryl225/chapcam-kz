"use client"

import Link from "next/link"
import { ArrowRight, Zap, Shield, Monitor, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FeatureList } from "@/components/feature-list"
import { PhoneMockup } from "@/components/phone-mockup"
import { motion } from "framer-motion"

export function HeroSection() {
  return (
    <section className="relative min-h-screen pt-28 pb-12 px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-[1fr_1.2fr_1fr] gap-8 items-center min-h-[calc(100vh-8rem)]">
        {/* Left - Features */}
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex flex-col gap-6 relative z-10"
        >
          {/* AI Live Badge - Neon Green */}
          <motion.div 
            animate={{ 
              scale: [1, 1.02, 1],
              boxShadow: [
                "0 0 20px rgba(34,197,94,0.4)",
                "0 0 40px rgba(34,197,94,0.6)",
                "0 0 20px rgba(34,197,94,0.4)"
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-flex items-center gap-2 bg-[#22c55e] px-5 py-2.5 rounded-full w-fit"
          >
            <motion.span 
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="w-2.5 h-2.5 rounded-full bg-white" 
            />
            <span className="text-white font-bold text-sm tracking-wide">AI LIVE</span>
          </motion.div>

          <FeatureList />
        </motion.div>

        {/* Center - Phone Mockup */}
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="flex justify-center relative z-10"
        >
          <PhoneMockup />
        </motion.div>

        {/* Right - CTA Content */}
        <motion.div 
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex flex-col gap-6 relative z-10"
        >
          <h1 className="text-4xl lg:text-5xl font-black text-white leading-tight text-balance">
            CHANGE DE VISAGE ET TON CORPS ENTIER{" "}
            <motion.span 
              className="bg-gradient-to-r from-[#8b5cf6] via-[#e91e8c] to-[#f97316] bg-clip-text text-transparent"
              animate={{ 
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"]
              }}
              transition={{ duration: 5, repeat: Infinity }}
              style={{ backgroundSize: "200% 200%" }}
            >
              EN TEMPS REEL.
            </motion.span>
          </h1>
          
          <p className="text-gray-400 text-lg leading-relaxed">
            Transforme instantanement ton apparence pendant tes streams, appels WhatsApp, Telegram, Zoom, Teams et autres plateformes video.
          </p>

          {/* Premium CTA Button - Blue Violet */}
          <Link href="/auth/sign-up">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="relative w-fit group"
            >
              {/* Animated glow */}
              <motion.div 
                className="absolute inset-0 bg-gradient-to-r from-[#7c3aed] via-[#3b82f6] to-[#00d4ff] rounded-full blur-xl opacity-60"
                animate={{ 
                  scale: [1, 1.1, 1],
                  opacity: [0.5, 0.8, 0.5]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <Button className="relative bg-gradient-to-r from-[#7c3aed] via-[#3b82f6] to-[#00d4ff] text-white border-0 px-8 py-7 rounded-full font-bold text-lg transition-all flex items-center gap-3 group-hover:shadow-[0_0_40px_rgba(99,102,241,0.6)]">
                Commencer maintenant
                <motion.div
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <ArrowRight className="w-5 h-5" />
                </motion.div>
              </Button>
            </motion.div>
          </Link>

          {/* WhatsApp Contact Button */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="relative w-fit"
          >
            <motion.div 
              className="absolute inset-0 bg-[#22c55e] rounded-full blur-lg opacity-40"
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <Button 
              variant="outline"
              className="relative bg-[#22c55e]/10 border-[#22c55e] text-[#22c55e] hover:bg-[#22c55e] hover:text-white px-6 py-5 rounded-full font-semibold transition-all flex items-center gap-2"
            >
              <MessageCircle className="w-5 h-5" />
              Nous contacter sur WhatsApp
            </Button>
          </motion.div>

          {/* Feature badges */}
          <div className="flex items-center gap-6 mt-2">
            <motion.div 
              whileHover={{ scale: 1.1 }}
              className="flex items-center gap-2 text-gray-400 hover:text-[#fbbf24] transition-colors cursor-default"
            >
              <Zap className="w-5 h-5 text-[#fbbf24]" />
              <span className="text-sm font-medium">Temps reel</span>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.1 }}
              className="flex items-center gap-2 text-gray-400 hover:text-[#22c55e] transition-colors cursor-default"
            >
              <Shield className="w-5 h-5 text-[#22c55e]" />
              <span className="text-sm font-medium">Securise</span>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.1 }}
              className="flex items-center gap-2 text-gray-400 hover:text-[#00d4ff] transition-colors cursor-default"
            >
              <Monitor className="w-5 h-5 text-[#00d4ff]" />
              <span className="text-sm font-medium">Haute qualite</span>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
