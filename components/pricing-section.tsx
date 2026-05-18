"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Check, Zap, Crown, Star } from "lucide-react"

const plans = [
  {
    duration: "1 JOUR",
    price: "10.000",
    currency: "FCFA",
    features: [
      "Acces complet a toutes les fonctionnalites",
      "Face swap illimite",
      "Qualite HD 1080p"
    ],
    validity: "Valable 24 heures",
    color: "#f97316",
    bgGradient: "from-orange-500/20 to-orange-600/5",
    popular: false,
    icon: Zap
  },
  {
    duration: "30 JOURS",
    price: "50.000",
    currency: "FCFA",
    features: [
      "Acces complet a toutes les fonctionnalites",
      "Face swap illimite",
      "Qualite HD 1080p",
      "Support prioritaire"
    ],
    validity: "Valable 1 mois",
    color: "#a855f7",
    bgGradient: "from-purple-500/20 to-purple-600/5",
    popular: false,
    icon: Star
  },
  {
    duration: "90 JOURS",
    price: "100.000",
    currency: "FCFA",
    features: [
      "Acces complet a toutes les fonctionnalites",
      "Face swap illimite",
      "Qualite 4K Ultra HD",
      "Support prioritaire",
      "Mises a jour exclusives"
    ],
    validity: "Valable 3 mois",
    color: "#22c55e",
    bgGradient: "from-green-500/20 to-green-600/5",
    popular: false,
    icon: Star
  },
  {
    duration: "365 JOURS",
    price: "150.000",
    currency: "FCFA",
    features: [
      "Acces complet a toutes les fonctionnalites",
      "Face swap illimite",
      "Qualite 4K Ultra HD",
      "Support VIP 24/7",
      "Mises a jour exclusives",
      "Acces beta aux nouvelles fonctionnalites"
    ],
    validity: "Valable 1 an",
    color: "#f97316",
    bgGradient: "from-orange-500/20 to-yellow-500/5",
    popular: true,
    icon: Crown
  }
]

export function PricingSection() {
  return (
    <section id="tarifs" className="relative py-24 px-6">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0e1a] to-[#0a0e1a]" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
      
      <div className="max-w-7xl mx-auto relative">
        {/* Section Title */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-4"
        >
          <span className="inline-block bg-gradient-to-r from-[#f97316]/20 to-[#fbbf24]/20 border border-[#f97316]/30 text-[#fbbf24] text-sm font-semibold tracking-widest uppercase px-6 py-2 rounded-full">
            Tarifs
          </span>
        </motion.div>

        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-4xl lg:text-5xl font-black text-center mb-4 tracking-tight"
        >
          <span className="bg-gradient-to-r from-[#fbbf24] via-[#f97316] to-[#ef4444] bg-clip-text text-transparent">
            CHOISIS TON ABONNEMENT
          </span>
        </motion.h2>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-gray-400 text-center text-lg mb-16 max-w-xl mx-auto"
        >
          Paiement <span className="text-green-400 font-semibold">100% securise</span> &bull; Acces instantane
        </motion.p>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan, index) => {
            const Icon = plan.icon
            return (
              <motion.div
                key={plan.duration}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -10, scale: 1.02 }}
                className={`relative rounded-3xl border bg-gradient-to-b ${plan.bgGradient} backdrop-blur-xl overflow-hidden group ${
                  plan.popular 
                    ? "border-[#f97316] shadow-xl shadow-[#f97316]/30 lg:scale-105 lg:z-10" 
                    : "border-white/10 hover:border-white/20"
                }`}
              >
                {/* Popular badge */}
                {plan.popular && (
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-[#f97316] to-[#fbbf24] py-2 text-center">
                    <span className="text-black text-xs font-black tracking-wider uppercase flex items-center justify-center gap-2">
                      <Crown className="w-4 h-4" />
                      MEILLEUR CHOIX
                    </span>
                  </div>
                )}

                <div className={`p-8 ${plan.popular ? "pt-14" : ""}`}>
                  {/* Duration badge */}
                  <div className="flex items-center gap-2 mb-6">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${plan.color}20` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: plan.color }} />
                    </div>
                    <span 
                      className="text-sm font-bold tracking-wider uppercase"
                      style={{ color: plan.color }}
                    >
                      {plan.duration}
                    </span>
                  </div>

                  {/* Price */}
                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span 
                        className="text-5xl font-black tracking-tight"
                        style={{ color: plan.color }}
                      >
                        {plan.price}
                      </span>
                      <span className="text-gray-400 text-sm font-medium">
                        {plan.currency}
                      </span>
                    </div>
                    <p className="text-gray-500 text-sm mt-2">{plan.validity}</p>
                  </div>

                  {/* Features */}
                  <div className="space-y-3 mb-8">
                    {plan.features.map((feature, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div 
                          className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ backgroundColor: `${plan.color}30` }}
                        >
                          <Check className="w-3 h-3" style={{ color: plan.color }} />
                        </div>
                        <span className="text-gray-300 text-sm leading-relaxed">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* CTA Button */}
                  <Button 
                    className={`w-full rounded-full font-bold text-base py-6 transition-all duration-300 hover:scale-105 border-0 ${
                      plan.popular 
                        ? "bg-gradient-to-r from-[#f97316] to-[#fbbf24] text-black hover:shadow-lg hover:shadow-[#f97316]/50" 
                        : ""
                    }`}
                    style={!plan.popular ? { 
                      backgroundColor: `${plan.color}20`,
                      color: plan.color,
                      border: `1px solid ${plan.color}50`
                    } : {}}
                  >
                    Choisir ce plan
                  </Button>
                </div>

                {/* Glow effect on hover */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{ 
                    background: `radial-gradient(circle at center, ${plan.color}15 0%, transparent 70%)` 
                  }}
                />
              </motion.div>
            )
          })}
        </div>

        {/* Trust badges */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-8 mt-16 text-gray-500 text-sm"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
              <Check className="w-4 h-4 text-green-400" />
            </div>
            <span>Paiement securise SSL</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Zap className="w-4 h-4 text-blue-400" />
            </div>
            <span>Activation instantanee</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Crown className="w-4 h-4 text-purple-400" />
            </div>
            <span>Satisfait ou rembourse</span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
