"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Check, Zap, Crown, Star, Clock, CreditCard, Droplet, DropletOff, Sparkles, Monitor, Palette } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { ChapCamPcPromo } from "@/components/chapcam-pc-promo"

// Statut du logo (watermark) par forfait :
// - "with"   : rendu AVEC logo ChapCam (Starter, Standard)
// - "manual" : sans logo, active manuellement sur demande (Premium 50.000 F)
// - "auto"   : sans logo automatiquement inclus (Ultimate 85.000 F)
type Watermark = "with" | "manual" | "auto"

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
    highlight: false,
    bestOffer: false,
    watermark: "with" as Watermark,
    icon: Zap
  },
  {
    id: "premium",
    name: "Premium",
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
    highlight: true,
    bestOffer: false,
    // Affichage public : AVEC logo. Retrait possible manuellement par l'admin.
    watermark: "with" as Watermark,
    icon: Star
  },
  {
    id: "ultimate",
    name: "VIP PRO",
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
    highlight: true,
    bestOffer: true,
    watermark: "auto" as Watermark,
    icon: Crown
  },
  {
    id: "vipdebout",
    name: "VIP DEBOUT",
    duration: "365 JOURS",
    price: "150.000",
    oldPrice: "180.000",
    discount: 17,
    currency: "FCFA",
    features: [
      "Transformation du visage et corps entier",
      "7 200 points (60 min)",
      "Qualite 4K Ultra HD maximale",
      "Support VIP prioritaire 24/7",
      "Acces anticipe a toutes les nouveautes"
    ],
    validity: "Valable 1 an",
    color: "#2563eb",
    bgGradient: "from-blue-500/20 to-blue-700/5",
    popular: false,
    highlight: true,
    bestOffer: false,
    watermark: "auto" as Watermark,
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

        {/* Offre ChapCam PC (logiciel a vie) - mise en avant au-dessus des offres a credit */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <ChapCamPcPromo />
        </motion.div>

        {/* Annonce ChapCam 2.0 : les offres de recharge concernent le nouveau logiciel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 p-6 md:p-8"
        >
          <div className="flex flex-col items-center gap-4 text-center md:flex-row md:items-center md:gap-6 md:text-left">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-black">
              <Sparkles className="h-7 w-7" />
            </div>
            <div className="flex-1">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-400">
                Nouveau · Sorti le 17 juillet
              </div>
              <h3 className="text-xl font-bold text-white md:text-2xl">
                Ces recharges alimentent ChapCam 2.0
              </h3>
              <p className="mt-2 text-pretty text-gray-300 leading-relaxed">
                Toutes les offres ci-dessous sont destinees a notre nouveau logiciel{" "}
                <span className="font-semibold text-emerald-400">ChapCam 2.0</span>, qui fonctionne
                desormais avec <span className="font-semibold text-white">tout type de PC</span> et
                permet meme de <span className="font-semibold text-white">changer la couleur de peau</span>.
              </p>
            </div>
            <div className="flex flex-col gap-2 text-sm text-gray-300 md:min-w-[220px]">
              <span className="inline-flex items-center gap-2">
                <Monitor className="h-4 w-4 flex-shrink-0 text-emerald-400" />
                Compatible avec tout type de PC
              </span>
              <span className="inline-flex items-center gap-2">
                <Palette className="h-4 w-4 flex-shrink-0 text-emerald-400" />
                Changement de la couleur de peau
              </span>
            </div>
          </div>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {plans.map((plan, index) => {
            const Icon = plan.icon
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -8, scale: plan.highlight ? 1.08 : 1.03 }}
                style={
                  plan.highlight
                    ? { borderColor: plan.color, boxShadow: `0 0 60px ${plan.color}55` }
                    : undefined
                }
                className={`relative rounded-3xl bg-[#111] p-8 transition-all duration-300 ${
                  plan.highlight
                    ? "border-2 lg:scale-105 z-10"
                    : "border border-white/10 hover:border-white/30"
                }`}
              >
                {/* Discount Badge */}
                <div className="absolute -top-3 -right-3 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                  -{plan.discount}%
                </div>

                {/* Badge du haut : "MEILLEURE OFFRE" pour le VIP PRO, sinon "SANS LOGO" pour les forfaits mis en avant */}
                {plan.bestOffer ? (
                  <div
                    className="absolute -top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-black text-sm font-bold px-5 py-1 rounded-full whitespace-nowrap shadow-lg"
                    style={{ backgroundColor: plan.color }}
                  >
                    <Crown className="w-4 h-4" />
                    MEILLEURE OFFRE
                  </div>
                ) : plan.highlight && plan.watermark !== "with" ? (
                  <div
                    className="absolute -top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-black text-sm font-bold px-5 py-1 rounded-full whitespace-nowrap"
                    style={{ backgroundColor: plan.color }}
                  >
                    <DropletOff className="w-4 h-4" />
                    SANS LOGO
                  </div>
                ) : null}

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
                  <span
                    className="text-5xl font-black"
                    style={{ color: plan.id === "vipdebout" ? plan.color : "#00ff88" }}
                  >
                    {plan.price}
                  </span>
                  <span className="text-gray-400 text-xl"> {plan.currency}</span>
                  <p className="text-gray-500 text-sm mt-1">{plan.validity}</p>
                </div>

                {/* Statut du logo (watermark) mis en avant */}
                {plan.watermark === "with" ? (
                  <div className="mb-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <Droplet className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-gray-300">Avec logo ChapCam</p>
                      <p className="text-xs text-gray-500">Filigrane visible sur le rendu</p>
                    </div>
                  </div>
                ) : (
                  <div
                    className="mb-6 flex items-center gap-3 rounded-2xl px-4 py-3"
                    style={{ backgroundColor: `${plan.color}1f`, border: `1px solid ${plan.color}66` }}
                  >
                    <DropletOff className="w-5 h-5 flex-shrink-0" style={{ color: plan.color }} />
                    <div>
                      <p className="text-sm font-bold" style={{ color: plan.color }}>
                        {plan.watermark === "auto" ? "Sans logo (automatique)" : "Sans logo (sur demande)"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {plan.watermark === "auto"
                          ? "Retrait du logo inclus, active automatiquement"
                          : "Retrait du logo active par notre equipe"}
                      </p>
                    </div>
                  </div>
                )}

                <ul className="space-y-4 mb-10 text-gray-300">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link href={`/dashboard/plans?plan=${plan.id}`}>
                  <Button 
                    className={`w-full py-6 text-base font-bold rounded-2xl transition-all ${
                      plan.highlight 
                        ? "bg-[#00ff88] text-black hover:bg-[#00dd77]" 
                        : "bg-white text-black hover:bg-gray-200"
                    }`}
                  >
                    Recharger
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
              Offre valable jusqu&apos;au 1er Septembre 2026 ou jusqu&apos;a epuisement des places.
            </p>
          </div>
        </motion.div>

        {/* Payment Methods */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16"
        >
          <p className="mb-6 text-center text-gray-400">Moyens de paiement acceptes</p>

          {/* Carte bancaire + Crypto mis en avant */}
          <div className="mx-auto mb-8 flex max-w-2xl flex-col items-stretch justify-center gap-3 sm:flex-row">
            <div className="flex flex-1 items-center justify-center gap-3 rounded-2xl border border-white/10 bg-[#111] px-6 py-4">
              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[#00ff88]/15">
                <CreditCard className="h-6 w-6 text-[#00ff88]" />
              </span>
              <div className="text-left">
                <p className="font-bold text-white">Carte bancaire</p>
                <p className="text-sm text-gray-400">Visa &amp; Mastercard acceptees</p>
              </div>
            </div>
            <div className="flex flex-1 items-center justify-center gap-3 rounded-2xl border border-[#f7931a]/40 bg-[#f7931a]/10 px-6 py-4">
              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl">
                <Image src="/images/bitcoin-logo.png" alt="Bitcoin" width={44} height={44} style={{ width: "auto", height: "auto" }} className="max-h-full max-w-full object-contain" />
              </span>
              <div className="text-left">
                <p className="font-bold text-white">Cryptomonnaie</p>
                <p className="text-sm text-gray-400">Bitcoin, USDT, ETH &amp; plus</p>
              </div>
            </div>
          </div>

          {/* Logos Mobile Money principaux */}
          <div className="mb-8 flex flex-wrap items-center justify-center gap-4">
            <div className="flex h-14 w-20 items-center justify-center rounded-xl bg-white p-3">
              <Image src="/images/orange-money-logo.png" alt="Orange Money" width={60} height={40} style={{ width: "auto", height: "auto" }} className="max-h-full max-w-full object-contain" />
            </div>
            <div className="flex h-14 w-20 items-center justify-center rounded-xl bg-white p-3">
              <Image src="/images/mtn-momo-logo.jpg" alt="MTN Mobile Money" width={60} height={40} style={{ width: "auto", height: "auto" }} className="max-h-full max-w-full object-contain" />
            </div>
            <div className="flex h-14 w-20 items-center justify-center rounded-xl bg-[#1DC8FF] p-2">
              <Image src="/images/wave-logo.png" alt="Wave" width={38} height={40} style={{ width: "auto", height: "auto" }} className="max-h-full max-w-full object-contain" />
            </div>
            <div className="flex h-14 w-20 items-center justify-center rounded-xl bg-white p-3">
              <Image src="/images/djamo-logo.png" alt="Djamo" width={60} height={40} style={{ width: "auto", height: "auto" }} className="max-h-full max-w-full object-contain" />
            </div>
            {/* Banniere crypto (Bitcoin, Ethereum, USDT, TON, BNB...) */}
            <div className="flex h-14 items-center justify-center overflow-hidden rounded-xl">
              <Image src="/images/crypto-accepted-logos.png" alt="Cryptomonnaies acceptees : Bitcoin, Ethereum, USDT, TON, BNB" width={150} height={56} style={{ width: "auto", height: "auto" }} className="max-h-full object-contain" />
            </div>
          </div>

          {/* Methodes par pays */}
          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { country: "Cote d'Ivoire", methods: ["Orange Money", "MTN", "Moov", "Wave", "Djamo"] },
              { country: "Benin", methods: ["Moov", "MTN"] },
              { country: "Togo", methods: ["T-Money", "Moov"] },
              { country: "Cameroun", methods: ["MTN"] },
            ].map((item) => (
              <div key={item.country} className="rounded-2xl border border-white/10 bg-[#111] p-5">
                <p className="mb-3 text-sm font-bold uppercase tracking-wide text-[#00ff88]">{item.country}</p>
                <div className="flex flex-wrap gap-2">
                  {item.methods.map((m) => (
                    <span
                      key={m}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-gray-300"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-sm text-gray-500">
            Paiement securise via PayDunya (mobile money &amp; carte) ou Trybit (crypto)
          </p>
        </motion.div>
      </div>
    </section>
  )
}
