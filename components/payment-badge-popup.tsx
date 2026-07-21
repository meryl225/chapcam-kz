"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { AnimatePresence, motion } from "framer-motion"
import { X } from "lucide-react"

// Les deux badges (moyens de paiement + cryptos) affiches en popup a gauche.
const BADGES = [
  {
    src: "/images/badge-all-payments.jpg",
    alt: "Nous acceptons tous les paiements : Wave, Orange Money, Moov Money, MTN Mobile Money, TMoney",
    glow: "#2563eb",
  },
  {
    src: "/images/badge-all-crypto.jpg",
    alt: "Nous acceptons toutes les crypto-monnaies : Bitcoin, Ethereum, USDT, BNB et plus",
    glow: "#f7931a",
  },
]

export function PaymentBadgePopup() {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  // Index de depart aleatoire pour varier l'affichage a chaque visite.
  const [index, setIndex] = useState(() => Math.floor(Math.random() * BADGES.length))

  // Apparition apres un court delai (effet d'arrivee).
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 2000)
    return () => clearTimeout(t)
  }, [])

  // Alterne entre les deux badges tant que le popup est ouvert.
  useEffect(() => {
    if (!visible || dismissed) return
    const t = setInterval(() => setIndex((i) => (i + 1) % BADGES.length), 6500)
    return () => clearInterval(t)
  }, [visible, dismissed])

  if (dismissed) return null

  const badge = BADGES[index]

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 80, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 80, scale: 0.85 }}
          transition={{ type: "spring", stiffness: 220, damping: 24 }}
          className="fixed bottom-40 left-3 z-40 sm:bottom-44 sm:left-5"
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            className="relative"
          >
            {/* Anneau lumineux rotatif derriere le badge */}
            <motion.div
              aria-hidden
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
              className="absolute -inset-3 rounded-full opacity-70 blur-md"
              style={{
                background: `conic-gradient(from 0deg, transparent, ${badge.glow}, transparent 60%)`,
              }}
            />

            {/* Bouton fermer */}
            <button
              type="button"
              aria-label="Fermer"
              onClick={() => setDismissed(true)}
              className="absolute -right-1 -top-1 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-[#0d1220] text-gray-300 shadow-lg transition-colors hover:bg-[#1a2133] hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Badge (fondu entre les deux) */}
            <div className="relative h-[150px] w-[150px] overflow-hidden rounded-full border border-white/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9)] sm:h-[180px] sm:w-[180px] md:h-[210px] md:w-[210px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={badge.src}
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0"
                >
                  <Image
                    src={badge.src || "/placeholder.svg"}
                    alt={badge.alt}
                    fill
                    className="object-cover"
                    sizes="210px"
                    priority
                  />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Petites pastilles indicatrices */}
            <div className="mt-3 flex items-center justify-center gap-1.5">
              {BADGES.map((b, i) => (
                <span
                  key={b.src}
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: i === index ? 18 : 6,
                    backgroundColor: i === index ? badge.glow : "rgba(255,255,255,0.25)",
                  }}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
