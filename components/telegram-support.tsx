"use client"

import { motion } from "framer-motion"
import Link from "next/link"

const TELEGRAM_LINK = "https://t.me/chapcam1"

export function TelegramSupport() {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
      {/* Text label */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="hidden sm:block"
      >
        <div className="relative">
          {/* Arrow */}
          <svg 
            className="absolute -right-8 top-1/2 -translate-y-1/2 w-6 h-6 text-white/60"
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
          >
            <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-white/80 text-sm italic font-light whitespace-nowrap">
            Besoin d&apos;aide ?
          </span>
        </div>
      </motion.div>

      {/* Telegram Button */}
      <Link
        href={TELEGRAM_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative"
      >
        {/* Outer glow ring */}
        <motion.div
          className="absolute inset-0 rounded-full bg-[#0088cc]/30 blur-xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Pulse ring */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-[#0088cc]/50"
          animate={{
            scale: [1, 1.5, 1.5],
            opacity: [0.8, 0, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />

        {/* Main button */}
        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-[#0088cc] to-[#0066aa] flex items-center justify-center shadow-lg shadow-[#0088cc]/50 backdrop-blur-sm border border-[#0088cc]/30 transition-all duration-300 group-hover:shadow-xl group-hover:shadow-[#0088cc]/60"
        >
          {/* Inner glow */}
          <div className="absolute inset-1 rounded-full bg-gradient-to-br from-white/20 to-transparent" />
          
          {/* Telegram icon */}
          <svg
            className="w-7 h-7 sm:w-8 sm:h-8 text-white relative z-10 transition-transform duration-300 group-hover:scale-110"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
          </svg>
        </motion.div>

        {/* Tooltip on hover */}
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          whileHover={{ opacity: 1, y: 0, scale: 1 }}
          className="absolute bottom-full right-0 mb-3 px-3 py-2 bg-black/80 backdrop-blur-md rounded-lg border border-[#0088cc]/30 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        >
          <span className="text-white text-sm font-medium">Rejoindre le support</span>
          <div className="absolute top-full right-6 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-black/80" />
        </motion.div>
      </Link>
    </div>
  )
}
