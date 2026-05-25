"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Clock, Sparkles } from "lucide-react"

// Date de fin du compte a rebours (4 jours a partir du deploiement)
const LAUNCH_END_DATE = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).getTime()

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

function calculateTimeLeft(): TimeLeft {
  const difference = LAUNCH_END_DATE - Date.now()
  
  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 }
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
  }
}

function TimeBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <motion.div
        key={value}
        initial={{ scale: 1.2, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative"
      >
        <div className="bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] border border-[#00ff88]/30 rounded-xl px-4 py-3 md:px-6 md:py-4 min-w-[60px] md:min-w-[80px] shadow-lg shadow-[#00ff88]/10">
          <span className="text-2xl md:text-4xl font-black text-white tabular-nums">
            {value.toString().padStart(2, "0")}
          </span>
        </div>
        {/* Glow effect */}
        <div className="absolute inset-0 bg-[#00ff88]/5 rounded-xl blur-xl -z-10" />
      </motion.div>
      <span className="text-gray-400 text-xs md:text-sm mt-2 uppercase tracking-wider font-medium">
        {label}
      </span>
    </div>
  )
}

export function LaunchCountdown() {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 4, hours: 0, minutes: 0, seconds: 0 })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setTimeLeft(calculateTimeLeft())

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  if (!mounted) {
    return null
  }

  const isExpired = timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0

  return (
    <section className="relative py-12 px-6 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-[#00ff88]/10 rounded-full blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-4xl mx-auto relative z-10"
      >
        {/* Main container */}
        <div className="relative bg-gradient-to-r from-[#0a0a0a] via-[#111] to-[#0a0a0a] border border-[#00ff88]/20 rounded-3xl p-8 md:p-12 overflow-hidden">
          {/* Animated border glow */}
          <motion.div
            className="absolute inset-0 rounded-3xl opacity-50"
            style={{
              background: "linear-gradient(90deg, transparent, rgba(0,255,136,0.3), transparent)",
              backgroundSize: "200% 100%",
            }}
            animate={{
              backgroundPosition: ["200% 0", "-200% 0"],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />

          {/* Corner decorations */}
          <div className="absolute top-0 left-0 w-20 h-20 border-t-2 border-l-2 border-[#00ff88]/50 rounded-tl-3xl" />
          <div className="absolute bottom-0 right-0 w-20 h-20 border-b-2 border-r-2 border-[#00ff88]/50 rounded-br-3xl" />

          <div className="relative z-10 text-center">
            {/* Badge */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 bg-[#00ff88]/10 border border-[#00ff88]/30 px-4 py-2 rounded-full mb-6"
            >
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="w-4 h-4 text-[#00ff88]" />
              </motion.div>
              <span className="text-[#00ff88] font-bold text-sm tracking-wide">OFFRE DE LANCEMENT</span>
            </motion.div>

            {/* Title */}
            <h2 className="text-2xl md:text-4xl font-black text-white mb-2">
              {isExpired ? (
                "L'offre est terminee !"
              ) : (
                <>
                  L&apos;offre se termine dans
                </>
              )}
            </h2>
            <p className="text-gray-400 mb-8">
              Profitez de jusqu&apos;a <span className="text-[#00ff88] font-bold">-29%</span> sur tous les plans
            </p>

            {/* Countdown */}
            {!isExpired && (
              <div className="flex items-center justify-center gap-3 md:gap-6 mb-8">
                <TimeBlock value={timeLeft.days} label="Jours" />
                <span className="text-2xl md:text-4xl text-[#00ff88] font-bold mt-[-20px]">:</span>
                <TimeBlock value={timeLeft.hours} label="Heures" />
                <span className="text-2xl md:text-4xl text-[#00ff88] font-bold mt-[-20px]">:</span>
                <TimeBlock value={timeLeft.minutes} label="Minutes" />
                <span className="text-2xl md:text-4xl text-[#00ff88] font-bold mt-[-20px]">:</span>
                <TimeBlock value={timeLeft.seconds} label="Secondes" />
              </div>
            )}

            {/* Urgency text */}
            <div className="flex items-center justify-center gap-2 text-yellow-400">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">
                Places limitees - Ne manquez pas cette opportunite !
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
