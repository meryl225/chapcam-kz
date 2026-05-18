"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { ArrowLeft, Zap, Star, Crown, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PRODUCTS } from "@/lib/products"
import { Checkout } from "@/components/checkout"

export default function PricingClient() {
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)

  const formatPrice = (cents: number) => {
    return (cents / 100).toLocaleString("fr-FR")
  }

  const getIcon = (planType: string) => {
    switch (planType) {
      case "1_day": return Zap
      case "30_days": return Star
      case "90_days": return Star
      case "365_days": return Crown
      default: return Zap
    }
  }

  if (selectedProduct) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] p-4">
        <div className="max-w-2xl mx-auto">
          <Button
            onClick={() => setSelectedProduct(null)}
            variant="ghost"
            className="text-gray-400 hover:text-white mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux forfaits
          </Button>
          
          <div className="bg-[#111827]/50 rounded-2xl border border-white/10 p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Finaliser ton achat</h2>
            <Checkout productId={selectedProduct} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#111827]/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo%20chapcam-Zg2rUUnOrSECjteElTxoU1rcYfwF3i.jpg"
              alt="ChapCam"
              width={40}
              height={40}
              className="rounded-lg"
            />
            <span className="text-xl font-bold bg-gradient-to-r from-[#8b5cf6] via-[#00d4ff] via-[#22c55e] to-[#f97316] bg-clip-text text-transparent">
              ChapCam
            </span>
          </Link>

          <Link href="/dashboard">
            <Button variant="ghost" className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour au dashboard
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-black text-white mb-4">
            Choisis ton{" "}
            <span className="bg-gradient-to-r from-[#f97316] via-[#22c55e] to-[#00d4ff] bg-clip-text text-transparent">
              Abonnement
            </span>
          </h1>
          <p className="text-gray-400 text-lg">
            Paiement 100% securise - Acces instantane
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PRODUCTS.map((product, index) => {
            const Icon = getIcon(product.planType)
            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative bg-[#111827]/50 rounded-2xl border ${product.popular ? "border-[#f97316]/50 scale-105" : "border-white/10"} p-6 hover:border-white/30 transition-all group`}
              >
                {product.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-[#f97316] to-[#f59e0b] rounded-full text-xs font-bold text-white">
                    MEILLEUR CHOIX
                  </div>
                )}

                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${product.color}20` }}
                >
                  <Icon className="w-6 h-6" style={{ color: product.color }} />
                </div>

                <h3 className="text-sm font-medium text-gray-400 mb-1">{product.duration}</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-3xl font-black" style={{ color: product.color }}>
                    {formatPrice(product.priceInCents)}
                  </span>
                  <span className="text-gray-500 text-sm">FCFA</span>
                </div>

                <ul className="space-y-2 mb-6">
                  <li className="flex items-center gap-2 text-sm text-gray-300">
                    <Check className="w-4 h-4" style={{ color: product.color }} />
                    Acces complet
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-300">
                    <Check className="w-4 h-4" style={{ color: product.color }} />
                    Face swap illimite
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-300">
                    <Check className="w-4 h-4" style={{ color: product.color }} />
                    Qualite HD/4K
                  </li>
                </ul>

                <Button
                  onClick={() => setSelectedProduct(product.id)}
                  className="w-full font-semibold"
                  style={{ 
                    backgroundColor: product.color,
                    color: product.color === "#00d4ff" || product.color === "#22c55e" ? "#000" : "#fff"
                  }}
                >
                  Choisir ce plan
                </Button>
              </motion.div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
