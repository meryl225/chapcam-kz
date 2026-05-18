"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"

const plans = [
  {
    duration: "1 JOUR",
    price: "10.000F",
    description: "Acces complet",
    validity: "Valable 1 jour",
    color: "#f97316",
    popular: false
  },
  {
    duration: "30 JOURS",
    price: "50.000F",
    description: "Acces complet",
    validity: "Valable 30 jours",
    color: "#a855f7",
    popular: false
  },
  {
    duration: "90 JOURS",
    price: "100.000F",
    description: "Acces complet",
    validity: "Valable 90 jours",
    color: "#22c55e",
    popular: false
  },
  {
    duration: "363 JOURS",
    price: "150.000F",
    description: "Acces complet",
    validity: "Valable 363 jours",
    color: "#f97316",
    popular: true
  }
]

export function PricingSection() {
  return (
    <section id="tarifs" className="relative py-20 px-6">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0e1a] to-[#0a0e1a]" />
      
      <div className="max-w-6xl mx-auto relative">
        {/* Section Title */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-4"
        >
          <span className="text-gray-400 text-sm font-medium tracking-wider uppercase">Tarifs</span>
        </motion.div>

        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-3xl lg:text-4xl font-bold text-center mb-2"
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
          className="text-gray-400 text-center mb-12"
        >
          Paiement 100% securise - Acces instantane
        </motion.p>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.duration}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -10, scale: 1.02 }}
              className={`relative rounded-2xl border bg-[#0d1525]/80 backdrop-blur-xl p-6 overflow-hidden group ${
                plan.popular 
                  ? "border-[#f97316] shadow-lg shadow-[#f97316]/20" 
                  : "border-white/10 hover:border-white/20"
              }`}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div className="absolute top-4 right-4">
                  <span className="bg-[#f97316] text-white text-xs font-bold px-3 py-1 rounded-full">
                    MEILLEUR CHOIX
                  </span>
                </div>
              )}

              {/* Glow effect on hover */}
              <div 
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ 
                  background: `radial-gradient(circle at center, ${plan.color}10 0%, transparent 70%)` 
                }}
              />

              {/* Duration */}
              <div className="text-gray-400 text-sm font-medium mb-4 tracking-wider">
                {plan.duration}
              </div>

              {/* Price */}
              <div className="mb-4">
                <span 
                  className="text-4xl font-bold"
                  style={{ color: plan.color }}
                >
                  {plan.price}
                </span>
              </div>

              {/* Description */}
              <div className="text-gray-400 text-sm mb-1">{plan.description}</div>
              <div className="text-gray-500 text-sm mb-6">{plan.validity}</div>

              {/* CTA Button */}
              <Button 
                className="w-full rounded-full font-medium transition-all hover:scale-105 border-0"
                style={{ 
                  backgroundColor: plan.color,
                  color: plan.color === "#f97316" ? "#000" : "#fff"
                }}
              >
                Choisir ce plan
              </Button>

              {/* Animated border */}
              <div 
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{
                  boxShadow: `inset 0 0 20px ${plan.color}20`
                }}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
