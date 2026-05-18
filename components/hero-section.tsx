"use client"

import { ArrowRight, Zap, Shield, Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FeatureList } from "@/components/feature-list"
import { PhoneMockup } from "@/components/phone-mockup"
import { motion } from "framer-motion"

export function HeroSection() {
  return (
    <section className="relative min-h-screen pt-28 pb-12 px-6">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Animated grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,212,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
        
        {/* Top right cyan lines */}
        <div className="absolute top-20 right-20 w-40 h-40">
          <div className="absolute top-0 right-0 w-32 h-[2px] bg-gradient-to-l from-[#00d4ff] to-transparent" />
          <div className="absolute top-0 right-0 w-[2px] h-32 bg-gradient-to-b from-[#00d4ff] to-transparent" />
        </div>
        
        {/* Bottom left magenta lines */}
        <div className="absolute bottom-20 left-20 w-40 h-40">
          <div className="absolute bottom-0 left-0 w-32 h-[2px] bg-gradient-to-r from-[#e91e8c] to-transparent" />
          <div className="absolute bottom-0 left-0 w-[2px] h-32 bg-gradient-to-t from-[#e91e8c] to-transparent" />
        </div>

        {/* Dotted pattern right */}
        <div className="absolute right-10 top-1/2 -translate-y-1/2 flex flex-col gap-2">
          {Array.from({ length: 15 }).map((_, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.2, 0.6, 0.2] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
              className="w-1 h-1 rounded-full bg-[#00d4ff]" 
            />
          ))}
        </div>

        {/* Glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#8b5cf6]/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#00d4ff]/10 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto grid lg:grid-cols-[1fr_1.2fr_1fr] gap-8 items-center min-h-[calc(100vh-8rem)]">
        {/* Left - Features */}
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex flex-col gap-6"
        >
          {/* AI Live Badge */}
          <motion.div 
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-flex items-center gap-2 bg-[#e91e8c] px-4 py-2 rounded-full w-fit shadow-lg shadow-[#e91e8c]/30"
          >
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="text-white font-semibold text-sm">AI LIVE</span>
          </motion.div>

          <FeatureList />
        </motion.div>

        {/* Center - Phone Mockup */}
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="flex justify-center"
        >
          <PhoneMockup />
        </motion.div>

        {/* Right - CTA Content */}
        <motion.div 
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex flex-col gap-6"
        >
          <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight text-balance">
            CHANGE DE VISAGE ET TON CORPS ENTIER{" "}
            <span className="bg-gradient-to-r from-[#8b5cf6] via-[#e91e8c] to-[#f97316] bg-clip-text text-transparent">EN TEMPS REEL.</span>
          </h1>
          
          <p className="text-gray-400 text-lg leading-relaxed">
            Transforme instantanement ton apparence pendant tes streams, appels WhatsApp, Telegram, Zoom, Teams et autres plateformes video.
          </p>

          <Button className="bg-gradient-to-r from-[#e91e8c] to-[#8b5cf6] text-white border-0 px-8 py-6 rounded-full font-semibold text-lg hover:opacity-90 transition-all hover:scale-105 w-fit flex items-center gap-3 group shadow-lg shadow-[#e91e8c]/30">
            Commencer maintenant
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>

          {/* Feature badges */}
          <div className="flex items-center gap-6 mt-4">
            <div className="flex items-center gap-2 text-gray-400">
              <Zap className="w-4 h-4 text-[#fbbf24]" />
              <span className="text-sm">Temps reel</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <Shield className="w-4 h-4 text-gray-400" />
              <span className="text-sm">Securise</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <Monitor className="w-4 h-4 text-gray-400" />
              <span className="text-sm">Haute qualite</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
