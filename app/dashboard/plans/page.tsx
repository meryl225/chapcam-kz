"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Check, Zap, Crown, Star, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

const plans = [
  {
    id: "1day",
    duration: "1 JOUR",
    price: "10.000",
    currency: "FCFA",
    features: [
      "Acces complet a toutes les fonctionnalites",
      "Face swap illimite",
      "Qualite HD 1080p"
    ],
    validity: "Valable 24 heures",
    color: "#00d4ff",
    bgGradient: "from-cyan-500/20 to-blue-600/5",
    popular: false,
    icon: Zap
  },
  {
    id: "30days",
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
    id: "90days",
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
    id: "365days",
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

export default function PlansPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

  const handleChoosePlan = async (planId: string) => {
    setLoadingPlan(planId)
    try {
      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la creation du paiement")
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url
    } catch (error) {
      console.error("Checkout error:", error)
      toast({
        title: "Erreur",
        description: "Impossible de lancer le paiement. Reessaie.",
        variant: "destructive",
      })
      setLoadingPlan(null)
    }
  }

  return (
    <div className="min-h-full p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-10 text-center">
        <h1 className="text-2xl font-black uppercase tracking-tight text-white md:text-3xl">
          CHOISIR UN ABONNEMENT
        </h1>
        <p className="mt-2 text-gray-400">
          Paiement <span className="font-semibold text-green-400">100% securise</span> · Acces instantane
        </p>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan, index) => {
          const Icon = plan.icon
          const isLoading = loadingPlan === plan.id

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative overflow-hidden rounded-3xl border bg-gradient-to-b ${plan.bgGradient} backdrop-blur-xl ${
                plan.popular
                  ? "border-[#f97316] shadow-xl shadow-[#f97316]/30"
                  : "border-white/10"
              }`}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div className="absolute left-0 right-0 top-0 bg-gradient-to-r from-[#f97316] to-[#fbbf24] py-2 text-center">
                  <span className="flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider text-black">
                    <Crown className="h-4 w-4" />
                    MEILLEUR CHOIX
                  </span>
                </div>
              )}

              <div className={`p-6 ${plan.popular ? "pt-14" : ""}`}>
                {/* Icon + Duration */}
                <div className="mb-6 flex items-center gap-2">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${plan.color}20` }}
                  >
                    <Icon className="h-5 w-5" style={{ color: plan.color }} />
                  </div>
                  <span
                    className="text-sm font-bold uppercase tracking-wider"
                    style={{ color: plan.color }}
                  >
                    {plan.duration}
                  </span>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span
                      className="text-4xl font-black tracking-tight"
                      style={{ color: plan.color }}
                    >
                      {plan.price}
                    </span>
                    <span className="text-sm font-medium text-gray-400">
                      {plan.currency}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">{plan.validity}</p>
                </div>

                {/* Features */}
                <div className="mb-8 space-y-3">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div
                        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: `${plan.color}30` }}
                      >
                        <Check className="h-3 w-3" style={{ color: plan.color }} />
                      </div>
                      <span className="text-sm leading-relaxed text-gray-300">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <Button
                  onClick={() => handleChoosePlan(plan.id)}
                  disabled={!!loadingPlan}
                  className={`w-full rounded-full py-6 text-base font-bold transition-all duration-300 hover:scale-105 ${
                    plan.popular
                      ? "bg-gradient-to-r from-[#f97316] to-[#fbbf24] text-black hover:shadow-lg hover:shadow-[#f97316]/50"
                      : ""
                  }`}
                  style={
                    !plan.popular
                      ? {
                          backgroundColor: `${plan.color}20`,
                          color: plan.color,
                          border: `1px solid ${plan.color}50`,
                        }
                      : {}
                  }
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {isLoading ? "Chargement..." : "Choisir ce plan"}
                </Button>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Trust badges */}
      <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/20">
            <Check className="h-4 w-4 text-green-400" />
          </div>
          <span>Paiement securise SSL</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20">
            <Zap className="h-4 w-4 text-blue-400" />
          </div>
          <span>Activation instantanee</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20">
            <Crown className="h-4 w-4 text-purple-400" />
          </div>
          <span>Satisfait ou rembourse</span>
        </div>
      </div>
    </div>
  )
}
