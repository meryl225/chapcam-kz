"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { ArrowLeft, Check, CreditCard, Smartphone, Loader2, Shield, Zap } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import Image from "next/image"

const plans = [
  {
    id: "starter",
    name: "Starter",
    price: 10000,
    points: 500,
    duration: "1 jour",
    popular: false,
  },
  {
    id: "popular",
    name: "Popular",
    price: 25000,
    points: 1250,
    duration: "30 jours",
    popular: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: 50000,
    points: 2500,
    duration: "90 jours",
    popular: false,
  },
  {
    id: "vip",
    name: "VIP Annuel",
    price: 85000,
    points: 4250,
    duration: "365 jours",
    popular: false,
  },
]

const paymentMethods = [
  {
    id: "orange",
    name: "Orange Money",
    logo: "/images/orange-money-logo.png",
    color: "#FF6600",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500",
  },
  {
    id: "mtn",
    name: "MTN Mobile Money",
    logo: "/images/mtn-momo-logo.jpg",
    color: "#FFCC00",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500",
  },
  {
    id: "wave",
    name: "Wave",
    logo: "/images/wave-logo.png",
    color: "#1DC8FF",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500",
  },
  {
    id: "djamo",
    name: "Djamo",
    logo: "/images/djamo-logo.png",
    color: "#6366F1",
    bgColor: "bg-indigo-500/10",
    borderColor: "border-indigo-500",
  },
]

export default function RechargePage() {
  const searchParams = useSearchParams()
  const planParam = searchParams.get("plan")
  
  const [selectedPlan, setSelectedPlan] = useState(
    plans.find(p => p.id === planParam) || plans[1]
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handlePayment = async () => {
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/payment/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan: selectedPlan.name,
          amount: selectedPlan.price,
          points: selectedPlan.points,
          duration: selectedPlan.duration,
          userEmail: "user@example.com", // TODO: Get from auth
          userName: "Utilisateur", // TODO: Get from auth
        }),
      })

      const data = await response.json()

      if (data.success && data.invoice_url) {
        // Rediriger vers la page de paiement PayDunya
        window.location.href = data.invoice_url
      } else {
        setError(data.error || "Une erreur est survenue")
      }
    } catch {
      setError("Erreur de connexion. Veuillez reessayer.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#00ff88]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link 
            href="/dashboard/plans" 
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Recharger mes points</h1>
            <p className="text-gray-400">Paiement securise via Mobile Money</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Plans Selection */}
          <div className="space-y-6">
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-[#00ff88]" />
                Choisir votre plan
              </h2>
              
              <div className="space-y-3">
                {plans.map((plan) => (
                  <motion.button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan)}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left relative ${
                      selectedPlan.id === plan.id
                        ? "border-[#00ff88] bg-[#00ff88]/10"
                        : "border-white/10 bg-white/5 hover:border-white/20"
                    }`}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    {plan.popular && (
                      <span className="absolute -top-2 right-4 bg-[#00ff88] text-black text-xs font-bold px-2 py-0.5 rounded-full">
                        POPULAIRE
                      </span>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-lg">{plan.name}</div>
                        <div className="text-sm text-gray-400">
                          {plan.points.toLocaleString()} points - {plan.duration}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-[#00ff88]">
                          {plan.price.toLocaleString()} FCFA
                        </div>
                        {selectedPlan.id === plan.id && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-6 h-6 bg-[#00ff88] rounded-full flex items-center justify-center ml-auto mt-1"
                          >
                            <Check className="w-4 h-4 text-black" />
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Payment Methods Info */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-[#00ff88]" />
                Methodes de paiement acceptees
              </h2>
              
              <div className="grid grid-cols-2 gap-3">
                {paymentMethods.map((method) => (
                  <div
                    key={method.id}
                    className={`p-3 rounded-xl ${method.bgColor} border border-white/10 flex items-center gap-3`}
                  >
                    <div className="w-10 h-10 rounded-lg overflow-hidden">
                      <Image 
                        src={method.logo} 
                        alt={method.name}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-sm font-medium">{method.name}</span>
                  </div>
                ))}
              </div>
              
              <p className="text-xs text-gray-500 mt-4 text-center">
                Paiement securise via PayDunya
              </p>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:sticky lg:top-8 h-fit">
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#00ff88]" />
                Resume de la commande
              </h2>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center py-3 border-b border-white/10">
                  <span className="text-gray-400">Plan selectionne</span>
                  <span className="font-semibold">{selectedPlan.name}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-white/10">
                  <span className="text-gray-400">Points</span>
                  <span className="font-semibold text-[#00ff88]">
                    {selectedPlan.points.toLocaleString()} pts
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-white/10">
                  <span className="text-gray-400">Duree</span>
                  <span className="font-semibold">{selectedPlan.duration}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-white/10">
                  <span className="text-gray-400">Temps de transformation</span>
                  <span className="font-semibold">
                    ~{Math.floor(selectedPlan.points / 2 / 60)} minutes
                  </span>
                </div>
              </div>

              <div className="bg-black/30 rounded-xl p-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-lg">Total a payer</span>
                  <span className="text-2xl font-bold text-[#00ff88]">
                    {selectedPlan.price.toLocaleString()} FCFA
                  </span>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <motion.button
                onClick={handlePayment}
                disabled={isLoading}
                className="w-full py-4 bg-[#00ff88] hover:bg-[#00ff88]/90 text-black font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Redirection...
                  </>
                ) : (
                  <>
                    <Smartphone className="w-5 h-5" />
                    Payer avec Mobile Money
                  </>
                )}
              </motion.button>

              <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-500">
                <Shield className="w-4 h-4" />
                <span>Paiement 100% securise via PayDunya</span>
              </div>

              {/* Logos des operateurs */}
              <div className="flex items-center justify-center gap-4 mt-6 pt-6 border-t border-white/10">
                <span className="text-xs text-gray-500">Accepte:</span>
                <div className="flex gap-2">
                  {paymentMethods.map((method) => (
                    <div 
                      key={method.id}
                      className="w-8 h-8 rounded-md overflow-hidden"
                      title={method.name}
                    >
                      <Image 
                        src={method.logo} 
                        alt={method.name}
                        width={32}
                        height={32}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
