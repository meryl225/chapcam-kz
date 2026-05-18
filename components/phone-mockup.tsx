"use client"

import { motion } from "framer-motion"
import Image from "next/image"

const floatingAvatars = [
  { 
    id: 1, 
    name: "Alex", 
    position: { top: "15%", left: "-15%" },
    delay: 0,
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
  },
  { 
    id: 2, 
    name: "Sophie", 
    position: { top: "45%", left: "-20%" },
    delay: 0.3,
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face"
  },
  { 
    id: 3, 
    name: "Jean", 
    position: { top: "75%", left: "-12%" },
    delay: 0.6,
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face"
  },
  { 
    id: 4, 
    name: "Emma", 
    position: { top: "20%", right: "-18%" },
    delay: 0.2,
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face"
  },
  { 
    id: 5, 
    name: "Lucas", 
    position: { top: "55%", right: "-15%" },
    delay: 0.5,
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
  },
  { 
    id: 6, 
    name: "Lea", 
    position: { top: "80%", right: "-20%" },
    delay: 0.8,
    image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face"
  },
]

const glowColors = ["#00d4ff", "#8b5cf6", "#e91e8c", "#22c55e", "#f97316"]

export function PhoneMockup() {
  return (
    <div className="relative">
      {/* Large rotating glow ring */}
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px]"
      >
        <div className="w-full h-full rounded-full border border-[#00d4ff]/20" />
        {/* Orbiting dots */}
        {[0, 72, 144, 216, 288].map((deg, i) => (
          <motion.div
            key={i}
            className="absolute w-3 h-3 rounded-full"
            style={{
              top: "50%",
              left: "50%",
              transform: `rotate(${deg}deg) translateX(275px) translateY(-50%)`,
              background: glowColors[i],
              boxShadow: `0 0 15px ${glowColors[i]}, 0 0 30px ${glowColors[i]}50`,
            }}
            animate={{ scale: [1, 1.5, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </motion.div>

      {/* Secondary rotating ring */}
      <motion.div 
        animate={{ rotate: -360 }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px]"
      >
        <div className="w-full h-full rounded-full border border-[#e91e8c]/15" />
      </motion.div>

      {/* Pulsing glow background */}
      <motion.div 
        animate={{ 
          opacity: [0.2, 0.4, 0.2],
          scale: [1, 1.1, 1]
        }}
        transition={{ duration: 4, repeat: Infinity }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-gradient-radial from-[#00d4ff]/20 via-[#8b5cf6]/10 to-transparent rounded-full blur-3xl" 
      />
      <motion.div 
        animate={{ 
          opacity: [0.15, 0.3, 0.15],
          scale: [1.1, 1, 1.1]
        }}
        transition={{ duration: 4, repeat: Infinity, delay: 1 }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gradient-radial from-[#e91e8c]/15 via-transparent to-transparent rounded-full blur-3xl" 
      />
      
      {/* Top holographic ring */}
      <motion.div 
        animate={{ 
          rotateX: [0, 10, 0], 
          opacity: [0.6, 1, 0.6],
          scale: [1, 1.02, 1]
        }}
        transition={{ duration: 3, repeat: Infinity }}
        className="absolute -top-6 left-1/2 -translate-x-1/2 w-[340px] h-[60px]"
        style={{ perspective: "1000px" }}
      >
        <div className="w-full h-full rounded-[50%] border-2 border-[#00d4ff]/70 shadow-[0_0_40px_rgba(0,212,255,0.6),inset_0_0_30px_rgba(0,212,255,0.3)]" />
      </motion.div>
      
      {/* Bottom holographic ring with gradient */}
      <motion.div 
        animate={{ 
          rotateX: [0, -10, 0], 
          opacity: [0.7, 1, 0.7],
          scale: [1, 1.03, 1]
        }}
        transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
        className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-[340px] h-[60px]"
      >
        <div 
          className="w-full h-full rounded-[50%] border-2 shadow-[0_0_40px_rgba(233,30,140,0.5)]"
          style={{ 
            borderImage: "linear-gradient(90deg, #00d4ff, #22c55e, #8b5cf6, #e91e8c, #f97316) 1",
            background: "linear-gradient(90deg, rgba(0,212,255,0.1), rgba(34,197,94,0.1), rgba(139,92,246,0.1), rgba(233,30,140,0.1), rgba(249,115,22,0.1))"
          }}
        />
      </motion.div>

      {/* Floating avatars around the cylinder */}
      {floatingAvatars.map((avatar) => (
        <motion.div
          key={avatar.id}
          className="absolute w-16 h-20 rounded-xl overflow-hidden"
          style={{
            ...avatar.position,
          }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ 
            opacity: 1, 
            scale: 1,
            y: [0, -10, 0],
            rotate: [-2, 2, -2]
          }}
          transition={{ 
            opacity: { delay: avatar.delay, duration: 0.5 },
            scale: { delay: avatar.delay, duration: 0.5 },
            y: { duration: 4, repeat: Infinity, delay: avatar.delay },
            rotate: { duration: 6, repeat: Infinity, delay: avatar.delay }
          }}
          whileHover={{ scale: 1.15, zIndex: 50 }}
        >
          {/* Glow effect */}
          <motion.div 
            className="absolute inset-0 rounded-xl"
            animate={{ 
              boxShadow: [
                `0 0 15px ${glowColors[avatar.id % glowColors.length]}50`,
                `0 0 25px ${glowColors[avatar.id % glowColors.length]}80`,
                `0 0 15px ${glowColors[avatar.id % glowColors.length]}50`,
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <div className="relative w-full h-full border-2 rounded-xl overflow-hidden bg-[#0d1525]"
            style={{ borderColor: `${glowColors[avatar.id % glowColors.length]}60` }}
          >
            <Image
              src={avatar.image}
              alt={avatar.name}
              fill
              className="object-cover"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1">
              <span className="text-white text-[10px] font-medium">{avatar.name}</span>
            </div>
          </div>
        </motion.div>
      ))}

      {/* Main phone frame */}
      <div className="relative w-[300px] h-[420px] mx-auto z-10">
        {/* Phone border with animated gradient glow */}
        <motion.div 
          className="absolute inset-0 rounded-[40px] p-[3px]"
          style={{
            background: "linear-gradient(135deg, #00d4ff, #8b5cf6, #e91e8c, #f97316, #00d4ff)",
            backgroundSize: "400% 400%"
          }}
          animate={{
            backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"]
          }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
        >
          <div className="w-full h-full rounded-[37px] bg-[#0d1525] overflow-hidden relative">
            {/* Main avatar - Marie */}
            <div className="absolute inset-0">
              <Image
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=600&fit=crop&crop=face"
                alt="Marie"
                fill
                className="object-cover"
              />
              
              {/* Face tracking overlay */}
              <div className="absolute inset-0">
                {/* Tracking points */}
                <motion.div 
                  animate={{ scale: [1, 1.3, 1], opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute top-[35%] left-[30%] w-4 h-4 rounded-full bg-[#00d4ff] shadow-[0_0_20px_rgba(0,212,255,1)]" 
                />
                <motion.div 
                  animate={{ scale: [1, 1.3, 1], opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                  className="absolute top-[35%] right-[30%] w-4 h-4 rounded-full bg-[#00d4ff] shadow-[0_0_20px_rgba(0,212,255,1)]" 
                />
                <motion.div 
                  animate={{ scale: [1, 1.4, 1], opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                  className="absolute top-[50%] left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[#22c55e] shadow-[0_0_20px_rgba(34,197,94,1)]" 
                />
                
                {/* Face mesh lines */}
                <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.3 }}>
                  <motion.path
                    d="M 100 140 Q 150 120 200 140"
                    stroke="#00d4ff"
                    strokeWidth="1"
                    fill="none"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: [0, 1, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  />
                  <motion.path
                    d="M 80 180 Q 150 200 220 180"
                    stroke="#00d4ff"
                    strokeWidth="1"
                    fill="none"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: [0, 1, 0] }}
                    transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
                  />
                </svg>
              </div>
              
              {/* Name label */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
                className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-[#0a0e1a]/90 backdrop-blur-md px-6 py-2 rounded-full border border-white/10"
              >
                <span className="text-white text-lg font-semibold">Marie</span>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom app section */}
      <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 z-20">
        {/* ChapCam icon */}
        <motion.div 
          whileHover={{ scale: 1.1, rotate: 5 }}
          className="w-16 h-16 rounded-2xl bg-[#111827] border border-[#1e3a5f] flex items-center justify-center shadow-[0_0_30px_rgba(0,212,255,0.2)]"
        >
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo%20chapcam-Zg2rUUnOrSECjteElTxoU1rcYfwF3i.jpg"
            alt="ChapCam"
            width={48}
            height={48}
            className="rounded-xl object-contain"
          />
        </motion.div>
        
        {/* Swap status button */}
        <motion.div 
          whileHover={{ scale: 1.05 }}
          className="flex items-center gap-3 bg-[#111827]/90 backdrop-blur-md border border-[#22c55e]/30 px-8 py-4 rounded-full cursor-pointer shadow-[0_0_20px_rgba(34,197,94,0.2)]"
        >
          <motion.span 
            animate={{ 
              scale: [1, 1.3, 1],
              boxShadow: [
                "0 0 10px rgba(34,197,94,0.5)",
                "0 0 20px rgba(34,197,94,0.8)",
                "0 0 10px rgba(34,197,94,0.5)"
              ]
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-3 h-3 rounded-full bg-[#22c55e]" 
          />
          <span className="text-white text-sm font-semibold">Swap en temps reel</span>
        </motion.div>
      </div>
    </div>
  )
}
