"use client"

import { motion } from "framer-motion"
import { UserPlus, Sparkles, Video, ArrowRight } from "lucide-react"
import Image from "next/image"

const steps = [
  {
    number: 1,
    title: "Inscris-toi",
    description: "Cree ton compte et accede instantanement a ChapCam.",
    icon: UserPlus,
    color: "#8b5cf6"
  },
  {
    number: 2,
    title: "Choisis ton apparence",
    description: "Selectionne le visage et le corps que tu veux utiliser en temps reel.",
    icon: Sparkles,
    color: "#00d4ff"
  },
  {
    number: 3,
    title: "Lance ton stream ou appel",
    description: "Utilise ChapCam sur toutes tes plateformes preferees en temps reel.",
    icon: Video,
    color: "#22c55e"
  }
]

const platforms = [
  { name: "WhatsApp", color: "#25D366", icon: "M" },
  { name: "Telegram", color: "#0088cc", icon: "T" },
  { name: "Zoom", color: "#2D8CFF", icon: "Z" },
  { name: "Google Meet", color: "#00897B", icon: "G" },
  { name: "Teams", color: "#6264A7", icon: "T" },
  { name: "TikTok", color: "#000000", icon: "T" },
  { name: "Facebook", color: "#1877F2", icon: "F" },
]

export function HowItWorksSection() {
  return (
    <section id="comment-ca-marche" className="relative py-20 px-6">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0d1117] to-transparent" />
      
      <div className="max-w-6xl mx-auto relative">
        {/* Section Title */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="text-[#00d4ff] text-sm font-medium tracking-wider uppercase">Comment ca marche</span>
        </motion.div>

        {/* Glass Card */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative rounded-3xl border border-white/10 bg-[#0d1525]/80 backdrop-blur-xl p-8 lg:p-12 overflow-hidden"
        >
          {/* Glow effects */}
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-[#8b5cf6]/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-[#00d4ff]/10 rounded-full blur-[100px]" />
          
          {/* Steps */}
          <div className="grid lg:grid-cols-[1fr_auto_1fr_auto_1.5fr] gap-8 items-start relative">
            {steps.map((step, index) => (
              <div key={step.number} className="flex flex-col items-center lg:items-start text-center lg:text-left">
                {/* Number badge */}
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold mb-4"
                  style={{ backgroundColor: step.color }}
                >
                  {step.number}
                </div>
                
                {/* Icon */}
                <div 
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 border border-white/10"
                  style={{ backgroundColor: `${step.color}20` }}
                >
                  <step.icon className="w-7 h-7" style={{ color: step.color }} />
                </div>
                
                <h3 className="text-white font-semibold text-lg mb-2">{step.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{step.description}</p>
              </div>
            ))}
            
            {/* Arrows between steps */}
            <div className="hidden lg:flex items-center justify-center h-full pt-20">
              <ArrowRight className="w-6 h-6 text-gray-600" />
            </div>
            <div className="hidden lg:flex items-center justify-center h-full pt-20">
              <ArrowRight className="w-6 h-6 text-gray-600" />
            </div>

            {/* Platform logos */}
            <div className="lg:col-start-5 flex flex-col items-center lg:items-start">
              <div className="grid grid-cols-4 gap-4">
                {platforms.map((platform, i) => (
                  <motion.div
                    key={platform.name}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{ scale: 1.1, y: -5 }}
                    className="flex flex-col items-center gap-2"
                  >
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold shadow-lg"
                      style={{ backgroundColor: platform.color }}
                    >
                      {platform.icon}
                    </div>
                    <span className="text-gray-400 text-xs">{platform.name}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
