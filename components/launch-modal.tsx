"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Rocket, Calendar, Clock, Sparkles, Bell, Download } from "lucide-react"
import Link from "next/link"

// Date de lancement: Samedi 30 Mai 2026 a 19h00 GMT
const LAUNCH_DATE = new Date('2026-05-30T19:00:00Z').getTime()

export function LaunchModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [mounted, setMounted] = useState(false)
  const [notifyEnabled, setNotifyEnabled] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    // Show modal after 2 seconds if not already seen in this session
    const hasSeenModal = sessionStorage.getItem('launch-modal-seen')
    if (!hasSeenModal) {
      const timer = setTimeout(() => {
        setIsOpen(true)
        sessionStorage.setItem('launch-modal-seen', 'true')
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
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

  const handleClose = () => {
    setIsOpen(false)
  }

  const handleNotify = () => {
    setNotifyEnabled(true)
    // Could integrate with email/push notifications here
    setTimeout(() => {
      handleClose()
    }, 1500)
  }

  if (!mounted) return null

  const isLaunched = timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={handleClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg bg-gradient-to-b from-[#1a1a2e] to-[#0f0f1a] border border-[#00ff88]/30 rounded-3xl overflow-hidden shadow-2xl shadow-[#00ff88]/20"
          >
            {/* Animated border glow */}
            <div className="absolute inset-0 rounded-3xl">
              <motion.div
                className="absolute inset-0 rounded-3xl opacity-50"
                style={{
                  background: "conic-gradient(from 0deg, #00ff88, #00d4ff, #e91e8c, #f59e0b, #00ff88)",
                  padding: "2px",
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              />
            </div>

            {/* Content */}
            <div className="relative bg-gradient-to-b from-[#1a1a2e] to-[#0f0f1a] m-[2px] rounded-3xl p-8">
              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>

              {/* Icon */}
              <div className="flex justify-center mb-6">
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="relative"
                >
                  <div className="w-20 h-20 bg-gradient-to-br from-[#00ff88] to-[#00d4ff] rounded-2xl flex items-center justify-center shadow-lg shadow-[#00ff88]/30">
                    <Rocket className="w-10 h-10 text-black" />
                  </div>
                  {/* Sparkles */}
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute -top-2 -right-2"
                  >
                    <Sparkles className="w-6 h-6 text-yellow-400" />
                  </motion.div>
                </motion.div>
              </div>

              {/* Title */}
              <h2 className="text-2xl md:text-3xl font-black text-white text-center mb-2">
                {isLaunched ? "ChapCam est LIVE !" : "Lancement Officiel"}
              </h2>

              {/* Date */}
              <div className="flex items-center justify-center gap-2 text-[#00ff88] mb-6">
                <Calendar className="w-4 h-4" />
                <span className="font-bold">Samedi 30 Mai 2026 a 19h GMT</span>
              </div>

              {/* Countdown */}
              {!isLaunched && (
                <div className="flex items-center justify-center gap-4 mb-6">
                  {[
                    { value: timeLeft.days, label: "Jours" },
                    { value: timeLeft.hours, label: "Heures" },
                    { value: timeLeft.minutes, label: "Min" },
                    { value: timeLeft.seconds, label: "Sec" },
                  ].map((item, index) => (
                    <div key={index} className="text-center">
                      <div className="bg-black/50 border border-[#00ff88]/30 rounded-xl px-3 py-2 min-w-[50px]">
                        <span className="text-2xl font-black text-white">
                          {item.value.toString().padStart(2, "0")}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 mt-1">{item.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Features */}
              <div className="bg-black/30 rounded-xl p-4 mb-6">
                <p className="text-white/80 text-center text-sm mb-3">
                  A l&apos;occasion du lancement, profitez de :
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2 text-white/70">
                    <span className="text-[#00ff88]">-</span>
                    Jusqu&apos;a <span className="text-[#00ff88] font-bold">-29%</span> sur tous les plans
                  </li>
                  <li className="flex items-center gap-2 text-white/70">
                    <span className="text-[#00ff88]">-</span>
                    Acces prioritaire au support
                  </li>
                  <li className="flex items-center gap-2 text-white/70">
                    <span className="text-[#00ff88]">-</span>
                    Avatars exclusifs offerts
                  </li>
                </ul>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3">
                {isLaunched ? (
                  <Link
                    href="/download"
                    className="w-full bg-gradient-to-r from-[#00ff88] to-[#00d4ff] text-black font-bold py-3 rounded-xl text-center hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Telecharger ChapCam
                  </Link>
                ) : (
                  <>
                    {notifyEnabled ? (
                      <div className="w-full bg-[#00ff88]/20 border border-[#00ff88] text-[#00ff88] font-bold py-3 rounded-xl text-center flex items-center justify-center gap-2">
                        <Bell className="w-5 h-5" />
                        Tu seras notifie !
                      </div>
                    ) : (
                      <button
                        onClick={handleNotify}
                        className="w-full bg-gradient-to-r from-[#00ff88] to-[#00d4ff] text-black font-bold py-3 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                      >
                        <Bell className="w-5 h-5" />
                        Me rappeler le jour J
                      </button>
                    )}
                    <Link
                      href="#tarifs"
                      onClick={handleClose}
                      className="w-full bg-white/10 border border-white/20 text-white font-bold py-3 rounded-xl text-center hover:bg-white/20 transition-colors"
                    >
                      Voir les offres de lancement
                    </Link>
                  </>
                )}
              </div>

              {/* Footer text */}
              <p className="text-center text-white/40 text-xs mt-4">
                <Clock className="w-3 h-3 inline mr-1" />
                Offre valable uniquement pendant la periode de lancement
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
