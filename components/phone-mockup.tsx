"use client"

import { motion } from "framer-motion"
import Image from "next/image"

export function PhoneMockup() {
  return (
    <div className="relative">
      {/* Glow effects */}
      <motion.div 
        animate={{ opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 4, repeat: Infinity }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#00d4ff]/15 rounded-full blur-[120px]" 
      />
      <motion.div 
        animate={{ opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 4, repeat: Infinity, delay: 1 }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#e91e8c]/10 rounded-full blur-[100px]" 
      />
      
      {/* Top holographic ring */}
      <motion.div 
        animate={{ rotateX: [0, 5, 0], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="absolute -top-8 left-1/2 -translate-x-1/2 w-[320px] h-[50px]"
      >
        <div className="w-full h-full rounded-[50%] border-2 border-[#00d4ff]/60 shadow-[0_0_30px_rgba(0,212,255,0.5),inset_0_0_20px_rgba(0,212,255,0.2)]" />
      </motion.div>
      
      {/* Bottom holographic ring with gradient */}
      <motion.div 
        animate={{ rotateX: [0, -5, 0], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
        className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-[320px] h-[50px]"
      >
        <div 
          className="w-full h-full rounded-[50%] border-2 shadow-[0_0_30px_rgba(233,30,140,0.4)]"
          style={{ 
            borderImage: "linear-gradient(90deg, #00d4ff, #8b5cf6, #e91e8c, #f97316) 1",
            background: "linear-gradient(90deg, rgba(0,212,255,0.15), rgba(139,92,246,0.15), rgba(233,30,140,0.15), rgba(249,115,22,0.15))"
          }}
        />
      </motion.div>

      {/* Main phone frame */}
      <div className="relative w-[300px] h-[420px] mx-auto">
        {/* Phone border with gradient glow */}
        <div className="absolute inset-0 rounded-[40px] p-[3px] bg-gradient-to-b from-[#00d4ff]/50 via-[#8b5cf6]/30 to-[#e91e8c]/50">
          <div className="w-full h-full rounded-[37px] bg-[#0d1525] overflow-hidden relative">
            {/* Main avatar - Marie */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-full h-full bg-gradient-to-br from-[#1a1f35] to-[#0d1525]">
                {/* Placeholder female avatar */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    {/* Head/face shape - female */}
                    <div className="w-44 h-52 rounded-[50%_50%_45%_45%] bg-gradient-to-br from-[#d4a574] to-[#c49463] relative overflow-hidden">
                      {/* Hair */}
                      <div className="absolute -top-2 -left-4 -right-4 h-28 rounded-t-full bg-gradient-to-br from-[#8b6914] via-[#a67c20] to-[#c49930]" />
                      
                      {/* Face tracking points */}
                      <motion.div 
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="absolute top-20 left-10 w-4 h-4 rounded-full bg-[#00d4ff] shadow-[0_0_15px_rgba(0,212,255,0.9)]" 
                      />
                      <motion.div 
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                        className="absolute top-20 right-10 w-4 h-4 rounded-full bg-[#00d4ff] shadow-[0_0_15px_rgba(0,212,255,0.9)]" 
                      />
                      <motion.div 
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                        className="absolute top-28 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[#22c55e] shadow-[0_0_15px_rgba(34,197,94,0.9)]" 
                      />
                      
                      {/* Smile */}
                      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-20 h-8 bg-white rounded-b-full flex items-start justify-center pt-1">
                        <div className="w-16 h-2 bg-pink-200 rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Name label */}
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-[#0a0e1a]/90 backdrop-blur-sm px-6 py-2 rounded-full border border-white/10">
                  <span className="text-white text-lg font-medium">Marie</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary avatar - left (Alex) */}
        <motion.div 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="absolute -left-16 top-1/4 w-16 h-20 rounded-xl overflow-hidden border-2 border-[#00d4ff]/40 bg-[#0d1525] shadow-lg shadow-[#00d4ff]/20"
        >
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1a1f35] to-[#0d1525]">
            <div className="w-10 h-12 rounded-full bg-gradient-to-br from-[#d4a574] to-[#8b6914]" />
          </div>
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] text-white/70">Alex</div>
        </motion.div>

        {/* Secondary avatar - right (Jean) */}
        <motion.div 
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="absolute -right-16 top-1/3 w-16 h-20 rounded-xl overflow-hidden border-2 border-[#8b5cf6]/40 bg-[#0d1525] shadow-lg shadow-[#8b5cf6]/20"
        >
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1a1f35] to-[#0d1525]">
            <div className="w-10 h-12 rounded-full bg-gradient-to-br from-[#c49463] to-[#a67c52]" />
          </div>
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] text-white/70">Jean</div>
        </motion.div>
      </div>

      {/* Bottom app section */}
      <div className="absolute -bottom-28 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
        {/* ChapCam icon */}
        <motion.div 
          whileHover={{ scale: 1.1 }}
          className="w-14 h-14 rounded-xl bg-[#111827] border border-[#1e3a5f] flex items-center justify-center shadow-lg"
        >
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo%20chapcam-Zg2rUUnOrSECjteElTxoU1rcYfwF3i.jpg"
            alt="ChapCam"
            width={40}
            height={40}
            className="rounded-lg object-contain"
          />
        </motion.div>
        
        {/* Swap status button */}
        <motion.div 
          whileHover={{ scale: 1.05 }}
          className="flex items-center gap-2 bg-[#111827]/90 backdrop-blur-sm border border-[#1e3a5f] px-6 py-3 rounded-full cursor-pointer"
        >
          <span className="w-3 h-3 rounded-full bg-[#22c55e] animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.6)]" />
          <span className="text-white text-sm font-medium">Swap en temps reel</span>
        </motion.div>
      </div>
    </div>
  )
}
