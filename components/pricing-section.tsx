"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Check, Zap, Crown, Star } from "lucide-react"
import Link from "next/link"

const plans = [
  {
    id: "starter",
    name: "Starter",
    duration: "1 JOUR",
    price: "10.000",
    currency: "FCFA",
    features: [
      "Transformation du visage et corps entier",
      "500 points (4 min 10 sec)",
      "Qualite HD 1080p"
    ],
    validity: "Valable 24 heures",
    color: "#00d4ff",
    bgGradient: "from-cyan-500/20 to-blue-600/5",
    popular: false,
    icon: Zap
  },
  {
    id: "popular",
    name: "Popular",
    duration: "30 JOURS",
    price: "90.000",
    currency: "FCFA",
    features: [
      "Transformation du visage et corps entier",
      "6 000 points (50 minutes)",
      "Qualite HD 1080p",
      "Support prioritaire"
    ],
    validity: "Valable 1 mois",
    color: "#a855f7",
    bgGradient: "from-purple-500/20 to-purple-600/5",
    popular: true,
    icon: Star
  },
  {
    id: "pro",
    name: "Pro",
    duration: "90 JOURS",
    price: "220.000",
    currency: "FCFA",
    features: [
      "Transformation du visage et corps entier",
      "16 000 points (133 minutes)",
      "Qualite 4K Ultra HD",
      "Support prioritaire"
    ],
    validity: "Valable 3 mois",
    color: "#22c55e",
    bgGradient: "from-green-500/20 to-green-600/5",
    popular: false,
    icon: Star
  },
  {
    id: "ultimate",
    name: "Ultimate",
    duration: "365 JOURS",
    price: "550.000",
    currency: "FCFA",
    features: [
      "Transformation du visage et corps entier",
      "45 000 points (375 minutes)",
      "Qualite 4K Ultra HD",
      "Support VIP 24/7",
      "Acces aux nouveautes en avant-premiere"
    ],
    validity: "Valable 1 an",
    color: "#f97316",
    bgGradient: "from-orange-500/20 to-yellow-500/5",
    popular: false,
    icon: Crown
  }
]

export function PricingSection() {
  return (
    <section id="tarifs" className="relative py-24 px-6 bg-[#050505]">
      <div className="max-w-7xl mx-auto relative">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-black text-white mb-4">
            Changez d’apparence en live
          </h2>
          <p className="text-emerald-400 text-2xl font-medium">avec ChapCam</p>
          <p className="text-gray-400 mt-4 text-lg">
            2 points = 1 seconde de transformation du visage et corps entier
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {plans.map((plan, index) => {
            const Icon = plan.icon
            return (
              <motion.div
                key={plan.duration}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -8, scale: 1.03 }}
                className={`relative rounded-3xl border bg-[#111] p-8 transition-all duration-300 ${
                  plan.popular 
                    ? "border-[#00ff88] scale-105 shadow-2xl shadow-[#00ff88]/20" 
                    : "border-white/10 hover:border-white/30"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#00ff88] text-black text-sm font-bold px-6 py-1 rounded-full">
                    MEILLEUR CHOIX
                  </div>
                )}

                <div className="flex items-center gap-3 mb-6">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${plan.color}20` }}>
                    <Icon className="w-6 h-6" style={{ color: plan.color }} />
                  </div>
                  <div>
                    <div className="font-bold text-white text-xl">{plan.name}</div>
                    <div className="text-sm text-gray-400">{plan.duration}</div>
                  </div>
                </div>

                <div className="mb-8">
                  <span className="text-5xl font-black text-white">{plan.price}</span>
                  <span className="text-gray-400 text-xl"> {plan.currency}</span>
                  <p className="text-gray-500 text-sm mt-1">{plan.validity}</p>
                </div>

                <ul className="space-y-4 mb-10 text-gray-300">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link href={`/dashboard/recharge?plan=${plan.id}`}>
                  <Button 
                    className={`w-full py-6 text-base font-bold rounded-2xl transition-all ${
                      plan.popular 
                        ? "bg-[#00ff88] text-black hover:bg-[#00dd77]" 
                        : "bg-white text-black hover:bg-gray-200"
                    }`}
                  >
                    Choisir ce plan
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
