"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Check, Download, Infinity as InfinityIcon, Monitor, ShieldCheck, Sparkles, X, Zap } from "lucide-react"
import { PcCountdown } from "@/components/chapcam-pc/pc-countdown"

const includedFeatures = [
  "Change uniquement le visage (le corps n'est pas transforme)",
  "Paiement unique, acces a vie",
  "Aucun credit a recharger, jamais",
  "Change d'apparence en direct dans tous tes appels video",
  "Compatible WhatsApp, Zoom, Teams, Google Meet, Discord, Skype",
  "Installation simple sur ton ordinateur",
  "Mises a jour incluses a vie",
]

const comparison = [
  { label: "Type de paiement", credits: "Credits a racheter", pc: "Paiement unique" },
  { label: "Duree d'acces", credits: "Limite par les credits", pc: "A vie" },
  { label: "Cout dans le temps", credits: "Augmente sans fin", pc: "0F apres l'achat" },
  { label: "Utilisation", credits: "Tant qu'il reste des credits", pc: "Illimitee" },
]

export function ChapCamPcLanding() {
  return (
    <main className="min-h-screen bg-[#0a0e1a] text-white">
      {/* Hero */}
      <section className="relative overflow-hidden px-6 pt-20 pb-16">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#e91e8c]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#00d4ff]/10 rounded-full blur-3xl" />

        <div className="max-w-4xl mx-auto relative text-center">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-[#22c55e]/20 to-[#00d4ff]/20 border border-[#22c55e]/40 text-[#22c55e] text-sm font-semibold tracking-widest uppercase px-6 py-2 rounded-full"
          >
            <Sparkles className="w-4 h-4" />
            Nouvelle offre
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-balance"
          >
            Tu as un ordinateur ?{" "}
            <span className="bg-gradient-to-r from-[#00d4ff] via-[#8b5cf6] to-[#e91e8c] bg-clip-text text-transparent">
              Change d&apos;apparence a vie.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6 text-lg text-gray-300 leading-relaxed max-w-2xl mx-auto text-pretty"
          >
            Tu veux changer d&apos;apparence sans payer des credits a chaque fois ?
            Telecharge <span className="text-white font-semibold">ChapCam PC</span>, le logiciel
            a vie.             Installe-le une seule fois et transforme ton visage en direct dans tous tes appels video.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-10 flex flex-col items-center gap-6"
          >
            <PcCountdown />
            <Button className="btn-gradient rounded-full font-bold text-base px-10 py-6 hover:scale-105 transition-transform border-0 glow-magenta">
              <Download className="w-5 h-5 mr-2" />
              Telecharger ChapCam PC a vie
            </Button>
            <p className="text-sm text-gray-500">
              Prix de lancement <span className="text-[#fbbf24] font-semibold">50.000F</span> pendant 7 jours,
              puis <span className="text-white">100.000F</span>.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Pricing card */}
      <section className="px-6 py-12">
        <div className="max-w-md mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative rounded-3xl border border-[#22c55e]/40 bg-gradient-to-b from-[#22c55e]/15 to-transparent backdrop-blur-xl overflow-hidden"
          >
            <div className="bg-gradient-to-r from-[#22c55e] to-[#00d4ff] py-2 text-center">
              <span className="text-black text-xs font-black tracking-wider uppercase flex items-center justify-center gap-2">
                <InfinityIcon className="w-4 h-4" />
                Licence a vie
              </span>
            </div>

            <div className="p-8">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#22c55e]/20 flex items-center justify-center">
                  <Monitor className="w-5 h-5 text-[#22c55e]" />
                </div>
                <span className="text-sm font-bold tracking-wider uppercase text-[#22c55e]">
                  ChapCam PC
                </span>
              </div>

              <div className="mb-2 flex items-baseline gap-3">
                <span className="text-5xl font-black tracking-tight text-[#22c55e]">50.000</span>
                <span className="text-gray-400 text-sm font-medium">FCFA</span>
              </div>
              <div className="flex items-center gap-2 mb-6">
                <span className="text-gray-500 line-through text-lg">100.000 FCFA</span>
                <span className="bg-[#f97316]/20 text-[#fbbf24] text-xs font-bold px-2 py-1 rounded-full">
                  -50% lancement
                </span>
              </div>

              <div className="space-y-3 mb-8">
                {includedFeatures.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#22c55e]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-[#22c55e]" />
                    </div>
                    <span className="text-gray-300 text-sm leading-relaxed">{feature}</span>
                  </div>
                ))}
              </div>

              <Button className="w-full btn-gradient rounded-full font-bold text-base py-6 hover:scale-105 transition-transform border-0">
                <Download className="w-5 h-5 mr-2" />
                Telecharger maintenant
              </Button>
              <p className="text-center text-xs text-gray-500 mt-4">
                Achat unique &bull; Acces a vie &bull; Aucune facturation recurrente
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Comparison */}
      <section className="px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-10 tracking-tight">
            Stop aux <span className="text-[#e91e8c]">credits</span> sans fin
          </h2>
          <div className="grid grid-cols-3 gap-px rounded-2xl overflow-hidden border border-white/10 bg-white/10">
            <div className="bg-[#111827] p-4 text-sm font-semibold text-gray-400">Comparatif</div>
            <div className="bg-[#111827] p-4 text-sm font-semibold text-gray-400 text-center">
              Credits classiques
            </div>
            <div className="bg-[#111827] p-4 text-sm font-bold text-[#22c55e] text-center">
              ChapCam PC
            </div>
            {comparison.map((row) => (
              <FragmentRow key={row.label} row={row} />
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="px-6 py-16">
        <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-center gap-8 text-gray-500 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#22c55e]/20 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-[#22c55e]" />
            </div>
            <span>Paiement securise</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#00d4ff]/20 flex items-center justify-center">
              <Zap className="w-4 h-4 text-[#00d4ff]" />
            </div>
            <span>Telechargement immediat</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#e91e8c]/20 flex items-center justify-center">
              <InfinityIcon className="w-4 h-4 text-[#e91e8c]" />
            </div>
            <span>Acces a vie garanti</span>
          </div>
        </div>
      </section>
    </main>
  )
}

function FragmentRow({ row }: { row: { label: string; credits: string; pc: string } }) {
  return (
    <>
      <div className="bg-[#0a0e1a] p-4 text-sm text-gray-300">{row.label}</div>
      <div className="bg-[#0a0e1a] p-4 text-sm text-gray-400 text-center flex items-center justify-center gap-2">
        <X className="w-4 h-4 text-[#ef4444] flex-shrink-0" />
        {row.credits}
      </div>
      <div className="bg-[#0a0e1a] p-4 text-sm text-white text-center flex items-center justify-center gap-2">
        <Check className="w-4 h-4 text-[#22c55e] flex-shrink-0" />
        {row.pc}
      </div>
    </>
  )
}
