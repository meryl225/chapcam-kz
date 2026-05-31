"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Check, Zap, Crown, Star, Clock, Gift, Sparkles } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

const plans = [
  {
    id: "starter",
    name: "Starter",
    duration: "1 JOUR",
    price: "10.000",
    oldPrice: "12.000",
    discount: 17,
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
    price: "25.000",
    oldPrice: "35.000",
    discount: 29,
    currency: "FCFA",
    features: [
      "Transformation du visage et corps entier",
      "1 250 points (10 min 25 sec)",
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
    price: "50.000",
    oldPrice: "65.000",
    discount: 23,
    currency: "FCFA",
    features: [
      "Transformation du visage et corps entier",
      "2 500 points (20 min 50 sec)",
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
    id: "vip",
    name: "VIP Annuel",
    duration: "365 JOURS",
    price: "85.000",
    oldPrice: "110.000",
    discount: 23,
    currency: "FCFA",
    features: [
      "Transformation du visage et corps entier",
      "4 250 points (35 min 25 sec)",
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
            Changez d&apos;apparence en live
          </h2>
          <p className="text-emerald-400 text-2xl font-medium">avec ChapCam</p>
          <p className="text-gray-400 mt-4 text-lg">
            2 points = 1 seconde de transformation du visage et corps entier
          </p>
        </motion.div>

        {/* Free Trial Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <div className="relative overflow-hidden rounded-3xl border border-[#00ff88]/40 bg-gradient-to-r from-[#00ff88]/15 via-[#00ff88]/10 to-[#00ff88]/5 p-6 md:p-8">
            <div className="flex flex-col items-center gap-5 text-center md:flex-row md:items-center md:justify-between md:text-left">
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-[#00ff88]/20">
                  <Gift className="h-7 w-7 text-[#00ff88]" />
                </span>
                <div>
                  <div className="flex items-center justify-center gap-2 md:justify-start">
                    <h3 className="text-2xl font-black text-white md:text-3xl">
                      Essaye gratuitement
                    </h3>
                    <span className="rounded-full bg-[#00ff88] px-3 py-1 text-xs font-bold text-black">
                      2 MIN OFFERTES
                    </span>
                  </div>
                  <p className="mt-1 text-gray-300">
                    Teste le Live Face Swap en temps reel, sans carte bancaire, directement dans ton navigateur.
                  </p>
                </div>
              </div>
              <Link href="/live" className="w-full md:w-auto">
                <Button className="flex w-full items-center gap-2 rounded-2xl bg-[#00ff88] px-8 py-6 text-base font-bold text-black transition-all hover:bg-[#00dd77] md:w-auto">
                  <Sparkles className="h-5 w-5" />
                  Essayer maintenant
                </Button>
              </Link>
            </div>
          </div>
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
                {/* Discount Badge */}
                <div className="absolute -top-3 -right-3 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                  -{plan.discount}%
                </div>

                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#00ff88] text-black text-sm font-bold px-6 py-1 rounded-full">
                    MEILLEUR CHOIX
                  </div>
                )}

                <div className="flex items-center gap-3 mb-6 mt-4">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${plan.color}20` }}>
                    <Icon className="w-6 h-6" style={{ color: plan.color }} />
                  </div>
                  <div>
                    <div className="font-bold text-white text-xl">{plan.name}</div>
                    <div className="text-sm text-gray-400">{plan.duration}</div>
                  </div>
                </div>

                <div className="mb-8">
                  {/* Old Price Strikethrough */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-gray-500 text-xl line-through">{plan.oldPrice}</span>
                    <span className="text-red-400 text-sm font-semibold">-{plan.discount}%</span>
                  </div>
                  {/* New Price */}
                  <span className="text-5xl font-black text-[#00ff88]">{plan.price}</span>
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

        {/* Urgency Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 text-center"
        >
          <div className="inline-flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-full px-6 py-3">
            <Clock className="w-5 h-5 text-yellow-400" />
            <p className="text-yellow-400 font-semibold">
              Offre valable jusqu&apos;au 1er Juin 2026 ou jusqu&apos;a epuisement des places.
            </p>
          </div>
        </motion.div>

        {/* Payment Methods */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <p className="text-gray-400 mb-6">Moyens de paiement acceptes</p>
          <div className="flex items-center justify-center gap-6 flex-wrap">
            <div className="bg-white rounded-xl p-3 w-20 h-14 flex items-center justify-center">
              <Image 
                src="/images/orange-money-logo.png" 
                alt="Orange Money" 
                width={60} 
                height={40}
                className="object-contain"
              />
            </div>
            <div className="bg-white rounded-xl p-3 w-20 h-14 flex items-center justify-center">
              <Image 
                src="/images/mtn-momo-logo.jpg" 
                alt="MTN Mobile Money" 
                width={60} 
                height={40}
                className="object-contain"
              />
            </div>
            <div className="bg-[#1DC8FF] rounded-xl p-2 w-20 h-14 flex items-center justify-center">
              <Image 
                src="/images/wave-logo.png" 
                alt="Wave" 
                width={50} 
                height={40}
                className="object-contain"
              />
            </div>
            <div className="bg-white rounded-xl p-3 w-20 h-14 flex items-center justify-center">
              <Image 
                src="/images/djamo-logo.png" 
                alt="Djamo" 
                width={60} 
                height={40}
                className="object-contain"
              />
            </div>
          </div>
          <p className="text-gray-500 text-sm mt-4">Paiement securise via PayDunya</p>
        </motion.div>
      </div>
    </section>
  )
}
