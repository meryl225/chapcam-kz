"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, Sparkles, Camera, Shield, Zap, Monitor, Download, CreditCard, Video } from "lucide-react"

const faqs = [
  {
    question: "Qu'est-ce que ChapCam ?",
    answer: "ChapCam est une IA de face swap en temps reel qui transforme ton visage et ton apparence instantanement pendant les appels video et les lives.",
    icon: Sparkles,
    color: "#8b5cf6"
  },
  {
    question: "Est-ce que ca fonctionne avec WhatsApp et Zoom ?",
    answer: "Oui. ChapCam fonctionne avec WhatsApp, Zoom, Telegram, Teams et plusieurs plateformes video compatibles camera.",
    icon: Video,
    color: "#00d4ff"
  },
  {
    question: "Est-ce en temps reel ?",
    answer: "Oui. La transformation est instantanee avec une latence ultra faible pour une experience fluide.",
    icon: Zap,
    color: "#fbbf24"
  },
  {
    question: "Mes donnees sont-elles stockees ?",
    answer: "Non. Aucune image ou video n'est stockee sur nos serveurs. Ta vie privee est notre priorite.",
    icon: Shield,
    color: "#22c55e"
  },
  {
    question: "Quelle qualite video est supportee ?",
    answer: "ChapCam supporte jusqu'a la qualite Full HD 1080p selon ton appareil et ta connexion.",
    icon: Monitor,
    color: "#e91e8c"
  },
  {
    question: "Est-ce compatible PC et mobile ?",
    answer: "Oui. ChapCam est compatible avec la majorite des appareils recents, PC et mobile.",
    icon: Camera,
    color: "#f97316"
  },
  {
    question: "Dois-je installer quelque chose ?",
    answer: "Oui, une installation rapide peut etre necessaire selon ta plateforme. Notre extension est legere et facile a configurer.",
    icon: Download,
    color: "#06b6d4"
  },
  {
    question: "Est-ce gratuit ?",
    answer: "Une version d'essai peut etre disponible. Les fonctionnalites avancees necessitent un abonnement a partir de 10.000 FCFA.",
    icon: CreditCard,
    color: "#a855f7"
  },
  {
    question: "Puis-je utiliser ChapCam pour le streaming ?",
    answer: "Oui. ChapCam est concu pour les createurs de contenu, streamers et appels video immersifs. Compatible OBS, Streamlabs et plus.",
    icon: Sparkles,
    color: "#ec4899"
  }
]

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section id="faq" className="relative py-24 px-6 overflow-hidden">
      {/* Animated Background Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              backgroundColor: ["#8b5cf6", "#00d4ff", "#22c55e", "#e91e8c", "#f97316"][i % 5],
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.8, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Futuristic Lines */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#00d4ff]/50 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#8b5cf6]/50 to-transparent" />
      
      {/* Corner Decorations */}
      <div className="absolute top-20 left-10 w-32 h-32 border-l-2 border-t-2 border-[#00d4ff]/20 rounded-tl-3xl" />
      <div className="absolute bottom-20 right-10 w-32 h-32 border-r-2 border-b-2 border-[#8b5cf6]/20 rounded-br-3xl" />

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#8b5cf6]/20 to-[#00d4ff]/20 border border-[#8b5cf6]/30 mb-6"
          >
            <Sparkles className="w-4 h-4 text-[#00d4ff]" />
            <span className="text-sm font-medium text-white/80">Questions Frequentes</span>
          </motion.div>
          
          <h2 className="text-4xl lg:text-5xl font-black text-white mb-4">
            BESOIN D&apos;
            <span className="bg-gradient-to-r from-[#8b5cf6] via-[#00d4ff] to-[#22c55e] bg-clip-text text-transparent">AIDE</span>
            ?
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Trouve rapidement les reponses a tes questions sur ChapCam
          </p>
        </motion.div>

        {/* FAQ Accordions */}
        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const Icon = faq.icon
            const isOpen = openIndex === index
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <motion.div
                  className={`relative rounded-2xl overflow-hidden transition-all duration-500 ${
                    isOpen 
                      ? "bg-gradient-to-r from-[#111827] to-[#1e293b] shadow-[0_0_40px_rgba(139,92,246,0.2)]" 
                      : "bg-[#111827]/50 hover:bg-[#111827]/80"
                  }`}
                  style={{
                    border: isOpen ? `1px solid ${faq.color}40` : "1px solid rgba(255,255,255,0.05)"
                  }}
                >
                  {/* Glow Effect when open */}
                  {isOpen && (
                    <motion.div
                      className="absolute inset-0 opacity-20"
                      style={{
                        background: `radial-gradient(circle at 50% 0%, ${faq.color}40, transparent 70%)`
                      }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.2 }}
                    />
                  )}

                  {/* Question Header */}
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="w-full px-6 py-5 flex items-center gap-4 text-left relative z-10"
                  >
                    <motion.div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300"
                      style={{ 
                        backgroundColor: `${faq.color}20`,
                        boxShadow: isOpen ? `0 0 20px ${faq.color}40` : "none"
                      }}
                      whileHover={{ scale: 1.1 }}
                    >
                      <Icon className="w-5 h-5" style={{ color: faq.color }} />
                    </motion.div>
                    
                    <span className={`flex-1 font-semibold text-lg transition-colors ${isOpen ? "text-white" : "text-gray-300"}`}>
                      {faq.question}
                    </span>
                    
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                        isOpen ? "bg-white/10" : "bg-white/5"
                      }`}
                    >
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    </motion.div>
                  </button>

                  {/* Answer Content */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-5 pl-[88px]">
                          <motion.p
                            initial={{ y: -10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className="text-gray-400 leading-relaxed"
                          >
                            {faq.answer}
                          </motion.p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            )
          })}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 text-center"
        >
          <p className="text-gray-400 mb-4">Tu as d&apos;autres questions?</p>
          <a href="https://wa.me/225055560189" target="_blank" rel="noopener noreferrer">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#22c55e] text-white font-semibold transition-all hover:shadow-[0_0_40px_rgba(34,197,94,0.5)]"
            >
              <motion.div
                className="absolute inset-0 bg-[#22c55e] rounded-full blur-xl opacity-0 hover:opacity-50"
                animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="relative">Contacte-nous sur WhatsApp</span>
            </motion.button>
          </a>
        </motion.div>
      </div>
    </section>
  )
}
