'use client'

import { Zap, Check, Crown, Clock, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'

const plans = [
  {
    id: "starter",
    name: "Starter",
    duration: "1 Jour",
    price: 10000,
    oldPrice: 12000,
    discount: 17,
    points: 500,
    minutes: "4 min 10 sec",
    features: ["Transformation du visage et corps entier", "Qualite HD"],
    buttonText: "Choisir ce plan",
    popular: false,
  },
  {
    id: "popular",
    name: "Popular",
    duration: "30 Jours",
    price: 25000,
    oldPrice: 35000,
    discount: 29,
    points: 1250,
    minutes: "10 min 25 sec",
    features: ["Transformation du visage et corps entier", "Qualite HD 1080p", "Support prioritaire"],
    buttonText: "Choisir ce plan",
    popular: true,
  },
  {
    id: "pro",
    name: "Pro",
    duration: "90 Jours",
    price: 50000,
    oldPrice: 65000,
    discount: 23,
    points: 2500,
    minutes: "20 min 50 sec",
    features: ["Transformation du visage et corps entier", "Qualite 4K Ultra HD", "Support prioritaire"],
    buttonText: "Choisir ce plan",
    popular: false,
  },
  {
    id: "vip",
    name: "VIP Annuel",
    duration: "365 Jours",
    price: 85000,
    oldPrice: 110000,
    discount: 23,
    points: 4250,
    minutes: "35 min 25 sec",
    features: ["Transformation du visage et corps entier", "Qualite 4K Ultra HD", "Support VIP 24/7", "Acces aux nouveautes"],
    buttonText: "Choisir ce plan",
    popular: false,
  },
]

export default function PlansPage() {
  const handleChoosePlan = (planId: string) => {
    window.location.href = `/dashboard/recharge?plan=${planId}`
  }

  return (
    <div className="min-h-screen bg-[#050505] py-12 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Launch Offer Banner */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="relative bg-gradient-to-r from-[#00ff88]/20 via-[#00ff88]/10 to-[#00ff88]/20 border border-[#00ff88]/50 rounded-2xl p-6 overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
              <motion.div
                animate={{ 
                  x: [0, 100, 0],
                  opacity: [0.3, 0.6, 0.3]
                }}
                transition={{ duration: 5, repeat: Infinity }}
                className="absolute top-0 left-0 w-32 h-32 bg-[#00ff88]/20 rounded-full blur-3xl"
              />
            </div>
            
            <div className="relative z-10 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-[#00ff88]" />
                <span className="text-[#00ff88] font-bold text-lg">OFFRE SPECIALE DE LANCEMENT</span>
                <Sparkles className="w-5 h-5 text-[#00ff88]" />
              </div>
              <h3 className="text-xl md:text-2xl font-black text-white mb-2">
                Jusqu&apos;a <span className="text-[#00ff88]">-29%</span> sur tous les plans !
              </h3>
              <div className="flex items-center justify-center gap-2 text-yellow-400 text-sm">
                <Clock className="w-4 h-4" />
                <span className="font-semibold">Valable jusqu&apos;au 1er Juin 2026</span>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-4">Changez d&apos;apparence en live</h1>
          <p className="text-3xl text-emerald-400 font-medium">avec ChapCam</p>
          <p className="text-gray-400 mt-6 text-lg">
            2 points = 1 seconde de transformation du visage et corps entier
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {plans.map((plan, index) => (
            <motion.div 
              key={plan.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`bg-[#111] border rounded-3xl p-8 transition-all hover:border-[#00ff88] relative flex flex-col ${
                plan.popular ? 'border-[#00ff88] scale-[1.03] shadow-2xl shadow-[#00ff88]/20' : 'border-gray-800'
              }`}
            >
              {/* Discount Badge */}
              <div className="absolute -top-3 -right-3 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                -{plan.discount}%
              </div>

              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#00ff88] text-black text-sm font-bold px-6 py-1 rounded-full flex items-center gap-1">
                  <Crown className="w-4 h-4" />
                  MEILLEUR CHOIX
                </div>
              )}

              {/* Launch Badge */}
              <div className="mb-2">
                <span className="bg-[#00ff88]/20 text-[#00ff88] text-xs font-bold px-2 py-1 rounded-full border border-[#00ff88]/50">
                  LANCEMENT
                </span>
              </div>

              <div className="text-emerald-400 text-sm font-medium">{plan.duration}</div>
              <h3 className="text-3xl font-bold text-white mt-2">{plan.name}</h3>

              <div className="mt-8 mb-2">
                {/* Old Price */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-gray-500 text-xl line-through">{plan.oldPrice.toLocaleString()}</span>
                  <span className="text-red-400 text-sm font-semibold">-{plan.discount}%</span>
                </div>
                {/* New Price */}
                <span className="text-5xl font-bold text-[#00ff88]">{plan.price.toLocaleString()}</span>
                <span className="text-gray-400 text-2xl"> FCFA</span>
              </div>

              <ul className="mt-8 space-y-4 text-gray-300 flex-1">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  {plan.points.toLocaleString()} points ({plan.minutes})
                </li>
              </ul>

              <button
                onClick={() => handleChoosePlan(plan.id)}
                className={`mt-10 w-full py-4 font-semibold rounded-2xl transition-all ${
                  plan.popular 
                    ? 'bg-[#00ff88] text-black hover:bg-[#00dd77]' 
                    : 'bg-white text-black hover:bg-gray-200'
                }`}
              >
                {plan.buttonText}
              </button>
            </motion.div>
          ))}
        </div>

        {/* Urgency Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center"
        >
          <div className="inline-flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-full px-6 py-3">
            <Clock className="w-5 h-5 text-yellow-400" />
            <p className="text-yellow-400 font-semibold">
              Offre valable jusqu&apos;au 1er Juin 2026 ou jusqu&apos;a epuisement des places.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
