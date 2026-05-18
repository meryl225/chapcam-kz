"use client"

import { motion } from "framer-motion"
import { UserPlus, Sparkles, Video } from "lucide-react"
import Image from "next/image"

const steps = [
  {
    number: 1,
    title: "Inscris-toi",
    description: "Cree ton compte et accede instantanement a ChapCam.",
    icon: UserPlus,
    color: "#8b5cf6",
    glowColor: "rgba(139,92,246,0.5)"
  },
  {
    number: 2,
    title: "Choisis ton apparence",
    description: "Selectionne le visage et le corps que tu veux utiliser en temps reel.",
    icon: Sparkles,
    color: "#00d4ff",
    glowColor: "rgba(0,212,255,0.5)"
  },
  {
    number: 3,
    title: "Lance ton stream ou appel",
    description: "Utilise ChapCam sur toutes tes plateformes preferees en temps reel.",
    icon: Video,
    color: "#22c55e",
    glowColor: "rgba(34,197,94,0.5)"
  }
]

const platforms = [
  { name: "WhatsApp", color: "#25D366", logo: "https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" },
  { name: "Telegram", color: "#0088cc", logo: "https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg" },
  { name: "Zoom", color: "#2D8CFF", logo: "https://upload.wikimedia.org/wikipedia/commons/7/7b/Zoom_Communications_Logo.svg" },
  { name: "Meet", color: "#00897B", logo: "https://upload.wikimedia.org/wikipedia/commons/9/9b/Google_Meet_icon_%282020%29.svg" },
  { name: "Teams", color: "#6264A7", logo: "https://upload.wikimedia.org/wikipedia/commons/c/c9/Microsoft_Office_Teams_%282018%E2%80%93present%29.svg" },
  { name: "TikTok", color: "#000000", logo: "https://upload.wikimedia.org/wikipedia/en/a/a9/TikTok_logo.svg" },
  { name: "Facebook", color: "#1877F2", logo: "https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg" },
  { name: "Discord", color: "#5865F2", logo: "https://assets-global.website-files.com/6257adef93867e50d84d30e2/636e0a6a49cf127bf92de1e2_icon_clyde_blurple_RGB.png" },
]

export function HowItWorksSection() {
  return (
    <section id="comment-ca-marche" className="relative py-24 px-6 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0d1117]/80 to-transparent" />
      
      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section Title */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <motion.div 
            className="inline-flex items-center gap-2 bg-gradient-to-r from-[#00d4ff]/20 to-[#8b5cf6]/20 border border-[#00d4ff]/30 px-6 py-2 rounded-full mb-6"
            animate={{ 
              boxShadow: [
                "0 0 20px rgba(0,212,255,0.2)",
                "0 0 40px rgba(0,212,255,0.4)",
                "0 0 20px rgba(0,212,255,0.2)"
              ]
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <span className="text-[#00d4ff] text-sm font-semibold tracking-wider uppercase">Comment ca marche</span>
          </motion.div>
        </motion.div>

        {/* Timeline Glass Card */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative rounded-3xl overflow-hidden"
        >
          {/* Animated border */}
          <motion.div 
            className="absolute inset-0 rounded-3xl p-[1px]"
            style={{
              background: "linear-gradient(90deg, #00d4ff, #8b5cf6, #e91e8c, #22c55e, #00d4ff)",
              backgroundSize: "300% 100%"
            }}
            animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
            transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
          />
          
          <div className="relative m-[1px] rounded-3xl bg-[#0d1525]/95 backdrop-blur-xl p-8 lg:p-12">
            {/* Internal glow effects */}
            <div className="absolute top-0 left-1/4 w-72 h-72 bg-[#8b5cf6]/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-[#00d4ff]/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#22c55e]/5 rounded-full blur-[100px] pointer-events-none" />
            
            {/* Steps Timeline */}
            <div className="relative">
              {/* Connection line */}
              <div className="hidden lg:block absolute top-24 left-[15%] right-[35%] h-[2px]">
                <motion.div 
                  className="h-full bg-gradient-to-r from-[#8b5cf6] via-[#00d4ff] to-[#22c55e]"
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.5, delay: 0.5 }}
                  style={{ transformOrigin: "left" }}
                />
              </div>

              <div className="grid lg:grid-cols-[1fr_1fr_1fr_1.2fr] gap-8 lg:gap-6 items-start">
                {steps.map((step, index) => (
                  <motion.div 
                    key={step.number}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.2 }}
                    className="flex flex-col items-center lg:items-start text-center lg:text-left group"
                  >
                    {/* Number badge */}
                    <motion.div 
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg mb-5 relative"
                      style={{ backgroundColor: step.color }}
                      whileHover={{ scale: 1.1 }}
                      animate={{
                        boxShadow: [
                          `0 0 20px ${step.glowColor}`,
                          `0 0 40px ${step.glowColor}`,
                          `0 0 20px ${step.glowColor}`
                        ]
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      {step.number}
                    </motion.div>
                    
                    {/* Icon box */}
                    <motion.div 
                      className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5 border relative overflow-hidden"
                      style={{ 
                        backgroundColor: `${step.color}15`,
                        borderColor: `${step.color}40`
                      }}
                      whileHover={{ scale: 1.05, borderColor: step.color }}
                    >
                      <step.icon className="w-9 h-9 relative z-10" style={{ color: step.color }} />
                      <motion.div 
                        className="absolute inset-0"
                        style={{ background: `radial-gradient(circle at center, ${step.color}20 0%, transparent 70%)` }}
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    </motion.div>
                    
                    <h3 className="text-white font-bold text-xl mb-3">{step.title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed max-w-xs">{step.description}</p>
                  </motion.div>
                ))}
                
                {/* Platform logos section */}
                <motion.div 
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                  className="lg:pl-8 lg:border-l border-white/10"
                >
                  <h4 className="text-white/60 text-sm font-medium mb-6 text-center lg:text-left">Compatible avec</h4>
                  <div className="grid grid-cols-4 gap-4">
                    {platforms.map((platform, i) => (
                      <motion.div
                        key={platform.name}
                        initial={{ opacity: 0, scale: 0.5 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.8 + i * 0.1 }}
                        whileHover={{ 
                          scale: 1.15, 
                          y: -5,
                          boxShadow: `0 0 25px ${platform.color}60`
                        }}
                        className="flex flex-col items-center gap-2 cursor-pointer"
                      >
                        <div 
                          className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 border border-white/10 hover:border-white/30"
                          style={{ backgroundColor: `${platform.color}20` }}
                        >
                          <div className="w-8 h-8 relative flex items-center justify-center text-white font-bold text-lg">
                            {platform.name.charAt(0)}
                          </div>
                        </div>
                        <span className="text-gray-400 text-[10px] font-medium">{platform.name}</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
