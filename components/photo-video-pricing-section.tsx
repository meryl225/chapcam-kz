"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Check, Clapperboard, Sparkles, Mic, Wand2 } from "lucide-react"
import Link from "next/link"
import { PHOTO_VIDEO_OFFERS } from "@/lib/photo-video-offers"

// Section landing dediee au "Studio ChapCam Photo en Video".
// Reutilise la source de verite des packs (lib/photo-video-offers) pour rester
// synchronisee avec le tunnel d'achat du dashboard. Les CTA renvoient vers la
// page /dashboard/photo-video ou l'achat (paiement) est gere.
export function PhotoVideoPricingSection() {
  return (
    <section id="studio-photo-video" className="relative py-24 px-6 bg-[#050505]">
      <div className="max-w-7xl mx-auto relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-emerald-400">
            <Sparkles className="h-4 w-4" />
            Nouveau · Studio Photo en Vidéo
          </div>
          <h2 className="text-4xl lg:text-5xl font-black text-white mb-4 text-balance">
            Anime ta photo, elle se met à parler
          </h2>
          <p className="text-gray-400 mt-4 text-lg max-w-2xl mx-auto text-pretty">
            Transforme une simple photo en vidéo TikTok verticale : l&apos;IA la fait parler avec
            gestes et voix personnalisée. 1 crédit = 1 vidéo de 30 secondes.
          </p>
        </motion.div>

        {/* Points forts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto mb-14 flex max-w-3xl flex-col items-stretch justify-center gap-3 sm:flex-row"
        >
          {[
            { icon: Clapperboard, label: "Vidéo 9:16 prête pour TikTok" },
            { icon: Mic, label: "Voix ChapCam ou clonage de la tienne" },
            { icon: Wand2, label: "Gestes & expressivité réalistes" },
          ].map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.label}
                className="flex flex-1 items-center justify-center gap-3 rounded-2xl border border-white/10 bg-[#111] px-5 py-4 text-center sm:text-left"
              >
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#00ff88]/15">
                  <Icon className="h-5 w-5 text-[#00ff88]" />
                </span>
                <span className="text-sm font-medium text-gray-300">{item.label}</span>
              </div>
            )
          })}
        </motion.div>

        {/* Packs de credits */}
        <div className="grid md:grid-cols-3 gap-8">
          {PHOTO_VIDEO_OFFERS.map((offer, index) => {
            const pricePerVideo = Math.round(offer.price / offer.credits)
            return (
              <motion.div
                key={offer.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -8, scale: offer.highlight ? 1.05 : 1.03 }}
                style={
                  offer.highlight
                    ? { borderColor: "#00ff88", boxShadow: "0 0 60px rgba(0,255,136,0.35)" }
                    : undefined
                }
                className={`relative rounded-3xl p-8 transition-all duration-300 ${
                  offer.highlight
                    ? "border-2 bg-[#111] lg:scale-105 z-10"
                    : "border border-white/10 bg-[#111] hover:border-white/30"
                }`}
              >
                {offer.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[#00ff88] px-5 py-1 text-sm font-bold text-black shadow-lg">
                    <Sparkles className="w-4 h-4" />
                    POPULAIRE
                  </div>
                )}

                <div className="flex items-center gap-3 mb-6 mt-2">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-[#00ff88]/15">
                    <Clapperboard className="w-6 h-6 text-[#00ff88]" />
                  </div>
                  <div>
                    <div className="font-bold text-white text-xl">{offer.name}</div>
                    <div className="text-sm text-gray-400">{offer.credits} vidéos de 30s</div>
                  </div>
                </div>

                <div className="mb-8">
                  <span className="text-5xl font-black text-[#00ff88]">
                    {offer.price.toLocaleString("fr-FR")}
                  </span>
                  <span className="text-gray-400 text-xl"> FCFA</span>
                  <p className="text-gray-500 text-sm mt-1">
                    soit {pricePerVideo.toLocaleString("fr-FR")} FCFA / vidéo
                  </p>
                </div>

                <ul className="space-y-4 mb-10 text-gray-300">
                  {offer.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link href="/dashboard/photo-video">
                  <Button
                    className={`w-full py-6 text-base font-bold rounded-2xl transition-all ${
                      offer.highlight
                        ? "bg-[#00ff88] text-black hover:bg-[#00dd77]"
                        : "bg-white text-black hover:bg-gray-200"
                    }`}
                  >
                    Acheter des vidéos
                  </Button>
                </Link>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
