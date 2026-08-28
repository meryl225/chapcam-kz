"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Check, Zap, Crown, Star, Clock, CreditCard, Droplet, DropletOff, Sparkles, Monitor, Palette, Gift, Clapperboard } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useState, useEffect } from "react"
import { useT } from "@/lib/i18n/language-provider"
import {
  CURRENCIES,
  useXofRates,
  formatConverted,
  guessCurrency,
} from "@/lib/currency-convert"

// Statut du logo (watermark) par forfait :
// - "with"   : rendu AVEC logo ChapCam (Starter, Standard)
// - "manual" : sans logo, active manuellement sur demande (Premium 50.000 F)
  // - "auto"   : sans logo automatiquement inclus (Premium 50.000 F, VIP PRO, VIP DEBOUT)
type Watermark = "with" | "manual" | "auto"

const plans = [
  {
    id: "testeur",
    name: "Forfait Testeur",
    duration: "Idéal pour tester",
    price: "5.000",
    oldPrice: "",
    discount: 0,
    currency: "FCFA",
    features: [
      "Transformation du visage et corps entier",
      "360 points (3 min)",
      "Qualite HD"
    ],
    photoVideos: 0,
    validity: "Valable 30 jours",
    color: "#00ff88",
    bgGradient: "from-emerald-500/20 to-emerald-600/5",
    popular: false,
    highlight: false,
    bestOffer: false,
    watermark: "with" as Watermark,
    icon: Star
  },
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
      "720 points (6 min)",
      "Qualite HD 1080p"
    ],
    photoVideos: 2,
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
      "3 600 points (30 min)",
      "Rendu sans logo ChapCam inclus",
      "Qualite 4K Ultra HD",
      "Support prioritaire"
    ],
    photoVideos: 5,
    validity: "Valable 3 mois",
    color: "#22c55e",
    bgGradient: "from-green-500/20 to-green-600/5",
    popular: false,
    highlight: true,
    bestOffer: false,
    // Sans logo automatique inclus des l'achat.
    watermark: "auto" as Watermark,
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
      "5 400 points (45 min)",
      "Rendu Full HD 1080p sans logo",
      "Studio CHAPCAM : scènes en direct (décors, styles, effets)",
      "Prompts personnalisés en direct + Enhance",
      "Suivi temps réel : chrono précis & qualité réseau",
      "Support VIP 24/7",
      "Acces aux nouveautes en avant-premiere"
    ],
    photoVideos: 8,
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
    discount: 25,
    currency: "FCFA",
    features: [
      "Transformation du visage et corps entier",
      "8 400 points (1 h 10 min)",
      "Rendu Full HD 1080p sans logo",
      "Studio CHAPCAM complet : scènes en direct (décors, styles, effets, arrière-plans)",
      "Prompts personnalisés illimités en direct + Enhance",
      "Suivi temps réel : chrono précis & qualité réseau",
      "Support VIP prioritaire 24/7",
      "Acces anticipe a toutes les nouveautes"
    ],
    photoVideos: 15,
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
  const t = useT()
  const { rates } = useXofRates()
  const [currencyCode, setCurrencyCode] = useState("XOF")

  // Devine la devise du visiteur au montage (cote client uniquement).
  useEffect(() => {
    setCurrencyCode(guessCurrency())
  }, [])

  const currency = CURRENCIES.find((c) => c.code === currencyCode) ?? CURRENCIES[0]

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
            {t("Changez d'apparence en live")}
          </h2>
          <p className="text-emerald-400 text-2xl font-medium">{t("avec ChapCam")}</p>
          <p className="text-gray-400 mt-4 text-lg">
            {t("2 points = 1 seconde de transformation du visage et corps entier")}
          </p>

          {/* Selecteur de devise indicative */}
          <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2">
            <label htmlFor="currency-select" className="text-sm text-gray-400">
              {t("Afficher les prix en")}
            </label>
            <select
              id="currency-select"
              value={currency.code}
              onChange={(e) => setCurrencyCode(e.target.value)}
              className="cursor-pointer rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-sm font-semibold text-white outline-none focus:border-emerald-400"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code} className="bg-[#0a0a0a] text-white">
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          {currency.code !== "XOF" && (
            <p className="mt-3 text-xs text-gray-500">
              {t("Montants convertis a titre indicatif. Vous serez debite en FCFA (XOF).")}
            </p>
          )}
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
                {t("Nouveau · Sorti le 17 juillet")}
              </div>
              <h3 className="text-xl font-bold text-white md:text-2xl">
                {t("Ces recharges alimentent ChapCam 2.0")}
              </h3>
              <p className="mt-2 text-pretty text-gray-300 leading-relaxed">
                {t("Toutes les offres ci-dessous sont destinees a notre nouveau logiciel")}{" "}
                <span className="font-semibold text-emerald-400">ChapCam 2.0</span>
                {t(", qui fonctionne desormais avec")}{" "}
                <span className="font-semibold text-white">{t("tout type de PC")}</span>{" "}
                {t("et permet meme de")}{" "}
                <span className="font-semibold text-white">{t("changer la couleur de peau")}</span>.
              </p>
            </div>
            <div className="flex flex-col gap-2 text-sm text-gray-300 md:min-w-[220px]">
              <span className="inline-flex items-center gap-2">
                <Monitor className="h-4 w-4 flex-shrink-0 text-emerald-400" />
                {t("Compatible avec tout type de PC")}
              </span>
              <span className="inline-flex items-center gap-2">
                <Palette className="h-4 w-4 flex-shrink-0 text-emerald-400" />
                {t("Changement de la couleur de peau")}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8">
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
                  plan.id === "vipdebout"
                    ? { borderColor: "#facc15", boxShadow: "0 0 70px rgba(250,204,21,0.35)" }
                    : plan.highlight
                    ? { borderColor: plan.color, boxShadow: `0 0 60px ${plan.color}55` }
                    : undefined
                }
                className={`relative rounded-3xl p-8 transition-all duration-300 ${
                  plan.id === "vipdebout"
                    ? "border-2 bg-gradient-to-b from-[#161310] to-[#111] lg:scale-105 z-10"
                    : plan.highlight
                    ? "border-2 bg-[#111] lg:scale-105 z-10"
                    : "border border-white/10 bg-[#111] hover:border-white/30"
                }`}
              >
                {/* Discount Badge (masque si aucune reduction, ex: Forfait Testeur) */}
                {plan.discount > 0 && (
                  <div className="absolute -top-3 -right-3 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                    -{plan.discount}%
                  </div>
                )}

                {/* Badge du haut : "POPULAIRE" pour VIP PRO, "MEILLEURE OFFRE" pour VIP DEBOUT (premium) */}
                {plan.id === "vipdebout" ? (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 whitespace-nowrap rounded-full bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 px-5 py-1 text-sm font-bold text-black shadow-[0_0_20px_rgba(250,204,21,0.55)]">
                    <Crown className="w-4 h-4" />
                    {t("MEILLEURE OFFRE")}
                  </div>
                ) : plan.bestOffer ? (
                  <div
                    className="absolute -top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-black text-sm font-bold px-5 py-1 rounded-full whitespace-nowrap shadow-lg"
                    style={{ backgroundColor: plan.color }}
                  >
                    <Crown className="w-4 h-4" />
                    {t("POPULAIRE")}
                  </div>
                ) : null}

                <div className="flex items-center gap-3 mb-6 mt-4">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center"
                    style={{ backgroundColor: plan.id === "vipdebout" ? "#facc1522" : `${plan.color}20` }}
                  >
                    <Icon className="w-6 h-6" style={{ color: plan.id === "vipdebout" ? "#facc15" : plan.color }} />
                  </div>
                  <div>
                    <div className="font-bold text-white text-xl">{plan.name}</div>
                    <div className="text-sm text-gray-400">{t(plan.duration)}</div>
                  </div>
                </div>

                <div className="mb-8">
                  {/* Old Price Strikethrough (masque pour le Forfait Testeur) */}
                  {plan.oldPrice && (
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-gray-500 text-xl line-through">{plan.oldPrice}</span>
                      <span className="text-red-400 text-sm font-semibold">-{plan.discount}%</span>
                    </div>
                  )}
                  {/* New Price */}
                  <span
                    className="text-5xl font-black"
                    style={{ color: plan.id === "vipdebout" ? "#facc15" : "#00ff88" }}
                  >
                    {plan.price}
                  </span>
                  <span className="text-gray-400 text-xl"> {plan.currency}</span>
                  {formatConverted(plan.price, currency, rates) && (
                    <p className="text-sm font-medium mt-1" style={{ color: plan.color }}>
                      ≈ {formatConverted(plan.price, currency, rates)}
                    </p>
                  )}
                  <p className="text-gray-500 text-sm mt-1">{t(plan.validity)}</p>
                </div>

                {/* Statut du logo (watermark) mis en avant */}
                {plan.watermark === "with" ? (
                  <div className="mb-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <Droplet className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-gray-300">{t("Avec logo ChapCam")}</p>
                      <p className="text-xs text-gray-500">{t("Filigrane visible sur le rendu")}</p>
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
                        {plan.watermark === "auto" ? t("Sans logo (automatique)") : t("Sans logo (sur demande)")}
                      </p>
                      <p className="text-xs text-gray-400">
                        {plan.watermark === "auto"
                          ? t("Retrait du logo inclus, active automatiquement")
                          : t("Retrait du logo active par notre equipe")}
                      </p>
                    </div>
                  </div>
                )}

                {/* Cadeau physique offert (uniquement VIP DEBOUT) */}
                {plan.id === "vipdebout" && (
                  <div className="mb-6 flex items-center gap-4 rounded-2xl border border-amber-400/50 bg-amber-400/10 p-4">
                    <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-black/40">
                      <Image
                        src="/images/voice-changer-i9.png"
                        alt="Appareil changeur de voix i9 offert avec l'offre VIP DEBOUT"
                        width={64}
                        height={64}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div>
                      <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-black">
                        <Gift className="h-3 w-3" />
                        {t("Cadeau inclus")}
                      </div>
                      <p className="text-sm font-bold text-white">{t("Changeur de voix i9 offert")}</p>
                      <p className="text-xs text-gray-400">{t("Boîtier + accessoires livrés")}</p>
                    </div>
                  </div>
                )}

                <ul className="space-y-4 mb-6 text-gray-300">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span>{t(feature)}</span>
                    </li>
                  ))}
                </ul>

                {/* Studio Photo en Video inclus dans le forfait Live Swap.
                    Non affiche pour Starter (10.000 F) ni le Forfait Testeur. */}
                {plan.id !== "starter" && plan.id !== "testeur" && (
                  <div className="mb-8 flex items-center gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3">
                    <Clapperboard className="h-5 w-5 flex-shrink-0 text-emerald-400" />
                    <p className="text-sm font-semibold text-emerald-300 leading-snug">
                      {t("Studio Photo en Vidéo :")} {plan.photoVideos} {t("vidéos de 30s incluses")}
                    </p>
                  </div>
                )}

                {/* Le Forfait Testeur (5.000 F) est le pack minutes "anniv_5" (3 min)
                    deja cable au paiement -> on redirige vers cet identifiant. */}
                <Link href={`/dashboard/plans?plan=${plan.id === "testeur" ? "anniv_5" : plan.id}`}>
                  <button
                    type="button"
                    style={{
                      // Meme rendu "SaaS premium" que le menu de recharge :
                      // degrade de surface vers la couleur d'accent du forfait +
                      // liseré + ombre nette, et reflet qui balaie au survol.
                      backgroundImage: `linear-gradient(180deg, color-mix(in srgb, #fff 18%, ${plan.color}) 0%, ${plan.color} 48%, ${plan.color}e6 100%)`,
                      boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.18), inset 0 1px 0 rgba(255,255,255,0.38), 0 6px 14px -8px rgba(0,0,0,0.55), 0 2px 4px -2px ${plan.color}4d`,
                    }}
                    className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl py-4 text-base font-bold text-black transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0"
                  >
                    {/* Reflet brillant qui balaie le bouton au survol */}
                    <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
                    <span className="relative">{t("Recharger")}</span>
                    <CreditCard className="relative h-5 w-5" />
                  </button>
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
              {t("Offre valable jusqu'au 1er Septembre 2026 ou jusqu'a epuisement des places.")}
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
          <p className="mb-6 text-center text-gray-400">{t("Moyens de paiement acceptes")}</p>

          {/* Carte bancaire + Crypto mis en avant */}
          <div className="mx-auto mb-8 flex max-w-2xl flex-col items-stretch justify-center gap-3 sm:flex-row">
            <div className="flex flex-1 items-center justify-center gap-3 rounded-2xl border border-white/10 bg-[#111] px-6 py-4">
              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[#00ff88]/15">
                <CreditCard className="h-6 w-6 text-[#00ff88]" />
              </span>
              <div className="text-left">
                <p className="font-bold text-white">{t("Carte bancaire")}</p>
                <p className="text-sm text-gray-400">{t("Visa & Mastercard acceptees")}</p>
              </div>
            </div>
            <div className="flex flex-1 items-center justify-center gap-3 rounded-2xl border border-[#f7931a]/40 bg-[#f7931a]/10 px-6 py-4">
              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl">
                <Image src="/images/bitcoin-logo.png" alt="Bitcoin" width={44} height={44} style={{ width: "auto", height: "auto" }} className="max-h-full max-w-full object-contain" />
              </span>
              <div className="text-left">
                <p className="font-bold text-white">{t("Cryptomonnaie")}</p>
                <p className="text-sm text-gray-400">{t("Bitcoin, USDT, ETH & plus")}</p>
              </div>
            </div>
          </div>

          {/* Logos cartes + Mobile Money principaux */}
          <div className="mb-8 flex flex-wrap items-center justify-center gap-4">
            <div className="flex h-14 w-20 items-center justify-center rounded-xl bg-white px-3">
              <img src="/images/visa-logo.svg" alt="Visa" className="max-h-5 max-w-full object-contain" />
            </div>
            <div className="flex h-14 w-20 items-center justify-center rounded-xl bg-white p-3">
              <img src="/images/mastercard-logo.svg" alt="Mastercard" className="max-h-full max-w-full object-contain" />
            </div>
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

          <p className="mt-8 text-center text-sm text-gray-500">
            {t("Paiement securise via PayDunya (mobile money & carte) ou NOWPayments (crypto)")}
          </p>
        </motion.div>
      </div>
    </section>
  )
}
