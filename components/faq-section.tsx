"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, HelpCircle } from "lucide-react"

const faqs = [
  {
    question: "Comment fonctionne ChapCam ?",
    answer: "ChapCam utilise une technologie IA exclusive pour remplacer votre visage en temps reel par un avatar de votre choix. Il vous suffit de selectionner un avatar, d'activer votre webcam et de lancer le swap. Le resultat est instantane et fonctionne avec toutes vos applications video."
  },
  {
    question: "Est-ce que ca fonctionne avec WhatsApp, Zoom, Teams ?",
    answer: "Oui ! ChapCam cree une camera virtuelle qui peut etre utilisee avec toutes les applications de visioconference : WhatsApp, Telegram, Zoom, Microsoft Teams, Google Meet, Discord, Skype, TikTok Live, et bien d'autres."
  },
  {
    question: "Quelle est la qualite du swap en temps reel ?",
    answer: "Notre technologie offre un swap ultra-realiste avec une latence minimale. La qualite depend de votre connexion internet et de la luminosite de votre environnement, mais nos utilisateurs obtiennent generalement des resultats impressionnants."
  },
  {
    question: "Combien d'avatars puis-je creer ?",
    answer: "Le nombre d'avatars depend de votre plan : Starter (3 avatars), Pro (10 avatars), Business (25 avatars), Enterprise (avatars illimites). Vous pouvez upgrader a tout moment pour debloquer plus de fonctionnalites."
  },
  {
    question: "Mes donnees sont-elles securisees ?",
    answer: "Absolument. Vos photos d'avatars sont stockees de maniere securisee et chiffree. Nous ne partageons jamais vos donnees avec des tiers. Le traitement du swap se fait en temps reel sans stockage des flux video."
  },
  {
    question: "Comment fonctionnent les points ?",
    answer: "Les points ChapCam permettent d'utiliser le swap en temps reel. Chaque plan inclut un nombre de points mensuel. Vous pouvez acheter des points supplementaires a tout moment via la page Recharge si vous en avez besoin."
  },
  {
    question: "Quel plan choisir ?",
    answer: "Le plan Starter est ideal pour debuter (3 avatars, 1000 pts). Le plan Pro convient aux utilisateurs reguliers (10 avatars, 5000 pts). Business et Enterprise sont concus pour les professionnels et equipes avec des besoins avances."
  },
  {
    question: "Comment contacter le support ?",
    answer: "Vous pouvez nous contacter via WhatsApp au +225 05 55 56 01 89 pour une assistance rapide, ou par email. Notre equipe repond generalement sous 24 heures."
  }
]

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section id="faq" className="relative py-24 px-6">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#8b5cf6]/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, type: "spring" }}
            className="inline-flex items-center gap-2 bg-[#8b5cf6]/20 border border-[#8b5cf6]/30 px-4 py-2 rounded-full mb-6"
          >
            <HelpCircle className="w-4 h-4 text-[#8b5cf6]" />
            <span className="text-[#8b5cf6] text-sm font-medium">FAQ</span>
          </motion.div>
          
          <h2 className="text-4xl lg:text-5xl font-black text-white mb-4">
            Questions{" "}
            <span className="bg-gradient-to-r from-[#8b5cf6] to-[#00d4ff] bg-clip-text text-transparent">
              frequentes
            </span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Tout ce que vous devez savoir sur ChapCam et le face swap en temps reel
          </p>
        </motion.div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <div
                className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                  openIndex === index
                    ? "bg-white/5 border-[#8b5cf6]/50 shadow-[0_0_30px_rgba(139,92,246,0.15)]"
                    : "bg-white/[0.02] border-white/10 hover:border-white/20"
                }`}
              >
                <button
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  className="w-full flex items-center justify-between p-6 text-left"
                >
                  <span className={`font-semibold text-lg transition-colors ${
                    openIndex === index ? "text-white" : "text-gray-300"
                  }`}>
                    {faq.question}
                  </span>
                  <motion.div
                    animate={{ rotate: openIndex === index ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex-shrink-0 ml-4 ${
                      openIndex === index ? "text-[#8b5cf6]" : "text-gray-500"
                    }`}
                  >
                    <ChevronDown className="w-5 h-5" />
                  </motion.div>
                </button>
                
                <AnimatePresence>
                  {openIndex === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="px-6 pb-6">
                        <div className="h-px bg-gradient-to-r from-transparent via-[#8b5cf6]/30 to-transparent mb-4" />
                        <p className="text-gray-400 leading-relaxed">
                          {faq.answer}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Contact CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 text-center"
        >
          <p className="text-gray-400 mb-4">
            Vous avez d&apos;autres questions ?
          </p>
          <a
            href="https://wa.me/2250555560189"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#22c55e] hover:bg-[#16a34a] text-white px-6 py-3 rounded-full font-semibold transition-all shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:shadow-[0_0_30px_rgba(34,197,94,0.6)]"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Contactez-nous sur WhatsApp
          </a>
        </motion.div>
      </div>
    </section>
  )
}
