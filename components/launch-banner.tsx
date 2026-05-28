"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Rocket, Clock } from "lucide-react"
import Link from "next/link"

// Date de lancement: Samedi 30 Mai 2026 a 19h00 GMT
const LAUNCH_DATE = new Date('2026-05-30T19:00:00Z').getTime()

export function LaunchBanner() {
  const [isVisible, setIsVisible] = useState(true)
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    // Check if banner was dismissed
    const dismissed = sessionStorage.getItem('launch-banner-dismissed')
    if (dismissed) {
      setIsVisible(false)
    }

    const timer = setInterval(() => {
      const difference = LAUNCH_DATE - Date.now()
      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
      } else {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        })
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const handleDismiss = () => {
    setIsVisible(false)
    sessionStorage.setItem('launch-banner-dismissed', 'true')
  }

  if (!mounted || !isVisible) return null

  const isLaunched = timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="relative z-50 overflow-hidden"
        >
          {/* Animated gradient background */}
          <div className="relative bg-gradient-to-r from-[#7c3aed] via-[#ec4899] to-[#f59e0b] py-3 px-4">
            {/* Animated shine effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            />
            
            <div className="max-w-7xl mx-auto flex items-center justify-center gap-4 text-white relative">
              {/* Rocket icon */}
              <motion.div
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Rocket className="w-5 h-5" />
              </motion.div>

              {/* Message */}
              <div className="flex items-center gap-3 text-sm md:text-base font-medium">
                {isLaunched ? (
                  <span>ChapCam est maintenant disponible !</span>
                ) : (
                  <>
                    <span className="hidden sm:inline">LANCEMENT OFFICIEL</span>
                    <span className="font-bold">Samedi 30 Mai a 19h GMT</span>
                    <span className="hidden md:inline">-</span>
                    <span className="hidden md:flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {timeLeft.days}j {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
                    </span>
                  </>
                )}
              </div>

              {/* CTA Button */}
              <Link
                href={isLaunched ? "/download" : "#tarifs"}
                className="hidden sm:inline-flex items-center gap-1 bg-white text-black px-4 py-1.5 rounded-full text-sm font-bold hover:bg-white/90 transition-colors"
              >
                {isLaunched ? "Telecharger" : "Voir les offres"}
              </Link>

              {/* Close button */}
              <button
                onClick={handleDismiss}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/20 rounded-full transition-colors"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
