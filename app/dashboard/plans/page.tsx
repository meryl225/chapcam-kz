'use client'

import { Zap, Check, Crown } from 'lucide-react'

const plans = [
  {
    id: "starter",
    name: "Starter",
    duration: "1 Jour",
    price: 10000,
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
    price: 90000,
    points: 6000,
    minutes: "50 minutes",
    features: ["Transformation du visage et corps entier", "Qualite HD 1080p", "Support prioritaire"],
    buttonText: "Choisir ce plan",
    popular: true,
  },
  {
    id: "pro",
    name: "Pro",
    duration: "90 Jours",
    price: 220000,
    points: 16000,
    minutes: "133 minutes",
    features: ["Transformation du visage et corps entier", "Qualite 4K Ultra HD", "Support prioritaire"],
    buttonText: "Choisir ce plan",
    popular: false,
  },
  {
    id: "ultimate",
    name: "Ultimate",
    duration: "365 Jours",
    price: 550000,
    points: 45000,
    minutes: "375 minutes",
    features: ["Transformation du visage et corps entier", "Qualite 4K Ultra HD", "Support VIP 24/7", "Acces aux nouveautes"],
    buttonText: "Choisir ce plan",
    popular: false,
  },
]

export default function PlansPage() {
  const handleChoosePlan = (planId: string) => {
    // Redirection vers la page de paiement avec le plan selectionne
    window.location.href = `/dashboard/recharge?plan=${planId}`
  }

  return (
    <div className="min-h-screen bg-[#050505] py-12 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-4">Changez d’apparence en live</h1>
          <p className="text-3xl text-emerald-400 font-medium">avec ChapCam</p>
          <p className="text-gray-400 mt-6 text-lg">
            2 points = 1 seconde de transformation du visage et corps entier
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {plans.map((plan) => (
            <div 
              key={plan.id}
              className={`bg-[#111] border rounded-3xl p-8 transition-all hover:border-[#00ff88] relative flex flex-col ${
                plan.popular ? 'border-[#00ff88] scale-[1.03] shadow-2xl' : 'border-gray-800'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#00ff88] text-black text-sm font-bold px-6 py-1 rounded-full flex items-center gap-1">
                  <Crown className="w-4 h-4" />
                  MEILLEUR CHOIX
                </div>
              )}

              <div className="text-emerald-400 text-sm font-medium">{plan.duration}</div>
              <h3 className="text-3xl font-bold text-white mt-2">{plan.name}</h3>

              <div className="mt-8 mb-2">
                <span className="text-5xl font-bold text-white">{plan.price.toLocaleString()}</span>
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
                  {plan.points} points ({plan.minutes})
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
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
