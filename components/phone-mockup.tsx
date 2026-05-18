"use client"

import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { useState, useEffect } from "react"

const swapPersonas = [
  { 
    name: "Marie", 
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=600&fit=crop&crop=face",
    color: "#e91e8c"
  },
  { 
    name: "Jean", 
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=600&fit=crop&crop=face",
    color: "#00d4ff"
  },
  { 
    name: "Sophie", 
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=600&fit=crop&crop=face",
    color: "#22c55e"
  },
  { 
    name: "Alex", 
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop&crop=face",
    color: "#8b5cf6"
  },
  { 
    name: "Emma", 
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=600&fit=crop&crop=face",
    color: "#f97316"
  },
  { 
    name: "Lucas", 
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=600&fit=crop&crop=face",
    color: "#06b6d4"
  },
]

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
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isSwapping, setIsSwapping] = useState(false)
  const [nextIndex, setNextIndex] = useState(1)

  useEffect(() => {
    const interval = setInterval(() => {
      setIsSwapping(true)
      setNextIndex((currentIndex + 1) % swapPersonas.length)
      
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % swapPersonas.length)
        setIsSwapping(false)
      }, 1500)
    }, 4000)

    return () => clearInterval(interval)
  }, [currentIndex])

  const currentPersona = swapPersonas[currentIndex]
  const nextPersona = swapPersonas[nextIndex]

  return (
    <div className="relative">
      {/* Large rotating glow ring */}
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px]"
      >
        <div className="w-full h-full rounded-full border border-[#00d4ff]/20" />
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

      {/* Pulsing glow backgrounds */}
      <motion.div 
        animate={{ 
          opacity: [0.2, 0.4, 0.2],
          scale: [1, 1.1, 1]
        }}
        transition={{ duration: 4, repeat: Infinity }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-gradient-radial from-[#00d4ff]/20 via-[#8b5cf6]/10 to-transparent rounded-full blur-3xl" 
      />
      
      {/* Dynamic glow based on current persona */}
      <motion.div 
        animate={{ 
          opacity: isSwapping ? [0.3, 0.8, 0.3] : [0.15, 0.3, 0.15],
          scale: isSwapping ? [1, 1.3, 1] : [1.1, 1, 1.1]
        }}
        transition={{ duration: isSwapping ? 1 : 4, repeat: Infinity }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full blur-3xl"
        style={{ background: `radial-gradient(circle, ${currentPersona.color}40, transparent)` }}
      />
      
      {/* Top holographic ring */}
      <motion.div 
        animate={{ 
          rotateX: [0, 10, 0], 
          opacity: isSwapping ? [0.8, 1, 0.8] : [0.6, 1, 0.6],
          scale: [1, 1.02, 1]
        }}
        transition={{ duration: isSwapping ? 0.5 : 3, repeat: Infinity }}
        className="absolute -top-6 left-1/2 -translate-x-1/2 w-[340px] h-[60px]"
        style={{ perspective: "1000px" }}
      >
        <motion.div 
          className="w-full h-full rounded-[50%] border-2"
          animate={{ borderColor: isSwapping ? nextPersona.color : currentPersona.color }}
          style={{ 
            boxShadow: `0 0 40px ${currentPersona.color}90, inset 0 0 30px ${currentPersona.color}50`
          }}
        />
      </motion.div>
      
      {/* Bottom holographic ring */}
      <motion.div 
        animate={{ 
          rotateX: [0, -10, 0], 
          opacity: isSwapping ? [0.9, 1, 0.9] : [0.7, 1, 0.7],
          scale: [1, 1.03, 1]
        }}
        transition={{ duration: isSwapping ? 0.5 : 3, repeat: Infinity }}
        className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-[340px] h-[60px]"
      >
        <div 
          className="w-full h-full rounded-[50%] border-2"
          style={{ 
            borderImage: "linear-gradient(90deg, #00d4ff, #22c55e, #8b5cf6, #e91e8c, #f97316) 1",
            boxShadow: `0 0 40px ${currentPersona.color}70`
          }}
        />
      </motion.div>

      {/* Floating avatars */}
      {floatingAvatars.map((avatar) => {
        const isActive = avatar.name === nextPersona.name && isSwapping
        return (
          <motion.div
            key={avatar.id}
            className="absolute w-16 h-20 rounded-xl overflow-hidden"
            style={{ ...avatar.position }}
            animate={{ 
              opacity: 1, 
              scale: isActive ? 1.3 : 1,
              y: isActive ? [-10, -30, -10] : [0, -10, 0],
              rotate: [-2, 2, -2],
              zIndex: isActive ? 100 : 10
            }}
            transition={{ 
              y: { duration: isActive ? 1 : 4, repeat: Infinity, delay: avatar.delay },
              rotate: { duration: 6, repeat: Infinity, delay: avatar.delay },
              scale: { duration: 0.5 }
            }}
          >
            <motion.div 
              className="absolute inset-0 rounded-xl"
              animate={{ 
                boxShadow: isActive 
                  ? [`0 0 30px ${nextPersona.color}`, `0 0 60px ${nextPersona.color}`, `0 0 30px ${nextPersona.color}`]
                  : [`0 0 15px ${glowColors[avatar.id % glowColors.length]}50`, `0 0 25px ${glowColors[avatar.id % glowColors.length]}80`, `0 0 15px ${glowColors[avatar.id % glowColors.length]}50`]
              }}
              transition={{ duration: isActive ? 0.5 : 2, repeat: Infinity }}
            />
            <div 
              className="relative w-full h-full border-2 rounded-xl overflow-hidden bg-[#0d1525]"
              style={{ borderColor: isActive ? nextPersona.color : `${glowColors[avatar.id % glowColors.length]}60` }}
            >
              <Image src={avatar.image} alt={avatar.name} fill className="object-cover" />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1">
                <span className="text-white text-[10px] font-medium">{avatar.name}</span>
              </div>
            </div>
          </motion.div>
        )
      })}

      {/* Main phone frame */}
      <div className="relative w-[300px] h-[420px] mx-auto z-10">
        <motion.div 
          className="absolute inset-0 rounded-[40px] p-[3px]"
          animate={{
            background: isSwapping 
              ? [`linear-gradient(135deg, ${currentPersona.color}, ${nextPersona.color}, ${currentPersona.color})`, `linear-gradient(135deg, ${nextPersona.color}, ${currentPersona.color}, ${nextPersona.color})`]
              : "linear-gradient(135deg, #00d4ff, #8b5cf6, #e91e8c, #f97316, #00d4ff)",
            backgroundSize: "400% 400%",
            backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"]
          }}
          transition={{ duration: isSwapping ? 1.5 : 5, repeat: Infinity, ease: "linear" }}
        >
          <div className="w-full h-full rounded-[37px] bg-[#0d1525] overflow-hidden relative">
            
            {/* Swap transition effect - scanning lines */}
            <AnimatePresence>
              {isSwapping && (
                <>
                  {/* Horizontal scan lines */}
                  {[...Array(8)].map((_, i) => (
                    <motion.div
                      key={`scan-${i}`}
                      className="absolute left-0 right-0 h-1 pointer-events-none z-30"
                      style={{ 
                        top: `${(i + 1) * 12}%`,
                        background: `linear-gradient(90deg, transparent, ${nextPersona.color}, transparent)`
                      }}
                      initial={{ scaleX: 0, opacity: 0 }}
                      animate={{ scaleX: [0, 1, 0], opacity: [0, 1, 0] }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1, delay: i * 0.08 }}
                    />
                  ))}
                  
                  {/* Glitch effect overlay */}
                  <motion.div
                    className="absolute inset-0 z-20 pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.5, 0, 0.3, 0] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.2 }}
                    style={{
                      background: `linear-gradient(180deg, transparent 0%, ${nextPersona.color}30 25%, transparent 50%, ${currentPersona.color}30 75%, transparent 100%)`,
                      mixBlendMode: "overlay"
                    }}
                  />

                  {/* Vertical glitch slices */}
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={`glitch-${i}`}
                      className="absolute top-0 bottom-0 w-full pointer-events-none z-25"
                      style={{
                        clipPath: `polygon(${i * 20}% 0, ${(i + 1) * 20}% 0, ${(i + 1) * 20}% 100%, ${i * 20}% 100%)`,
                      }}
                      animate={{ 
                        x: [0, (i % 2 === 0 ? 10 : -10), 0],
                        opacity: [1, 0.8, 1]
                      }}
                      transition={{ duration: 0.3, delay: 0.5 + i * 0.05 }}
                    />
                  ))}

                  {/* Bright flash */}
                  <motion.div
                    className="absolute inset-0 z-30 pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.8, 0] }}
                    transition={{ duration: 0.5, delay: 0.7 }}
                    style={{ background: `radial-gradient(circle, ${nextPersona.color}80, transparent)` }}
                  />
                </>
              )}
            </AnimatePresence>

            {/* Current face */}
            <AnimatePresence mode="wait">
              <motion.div 
                key={currentIndex}
                className="absolute inset-0"
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.8 }}
              >
                <Image
                  src={currentPersona.image}
                  alt={currentPersona.name}
                  fill
                  className="object-cover"
                  priority
                />
              </motion.div>
            </AnimatePresence>
            
            {/* Face tracking overlay */}
            <div className="absolute inset-0 z-10 pointer-events-none">
              {/* Animated tracking points */}
              <motion.div 
                animate={{ 
                  scale: isSwapping ? [1, 2, 1] : [1, 1.3, 1], 
                  opacity: [0.8, 1, 0.8],
                  boxShadow: isSwapping 
                    ? [`0 0 20px ${nextPersona.color}`, `0 0 40px ${nextPersona.color}`, `0 0 20px ${nextPersona.color}`]
                    : [`0 0 20px ${currentPersona.color}`, `0 0 30px ${currentPersona.color}`, `0 0 20px ${currentPersona.color}`]
                }}
                transition={{ duration: isSwapping ? 0.5 : 1.5, repeat: Infinity }}
                className="absolute top-[35%] left-[30%] w-4 h-4 rounded-full"
                style={{ backgroundColor: isSwapping ? nextPersona.color : currentPersona.color }}
              />
              <motion.div 
                animate={{ 
                  scale: isSwapping ? [1, 2, 1] : [1, 1.3, 1], 
                  opacity: [0.8, 1, 0.8] 
                }}
                transition={{ duration: isSwapping ? 0.5 : 1.5, repeat: Infinity, delay: 0.2 }}
                className="absolute top-[35%] right-[30%] w-4 h-4 rounded-full"
                style={{ 
                  backgroundColor: isSwapping ? nextPersona.color : currentPersona.color,
                  boxShadow: `0 0 20px ${isSwapping ? nextPersona.color : currentPersona.color}`
                }}
              />
              <motion.div 
                animate={{ 
                  scale: isSwapping ? [1, 2.5, 1] : [1, 1.4, 1], 
                  opacity: [0.8, 1, 0.8] 
                }}
                transition={{ duration: isSwapping ? 0.5 : 1.5, repeat: Infinity, delay: 0.4 }}
                className="absolute top-[50%] left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[#22c55e]"
                style={{ boxShadow: "0 0 20px rgba(34,197,94,1)" }}
              />
              
              {/* Face mesh animation */}
              <svg className="absolute inset-0 w-full h-full" style={{ opacity: isSwapping ? 0.6 : 0.25 }}>
                <motion.ellipse
                  cx="150"
                  cy="200"
                  rx="80"
                  ry="100"
                  stroke={isSwapping ? nextPersona.color : currentPersona.color}
                  strokeWidth="1"
                  fill="none"
                  strokeDasharray="10 5"
                  animate={{ 
                    strokeDashoffset: [0, 100],
                    opacity: isSwapping ? [0.8, 1, 0.8] : [0.3, 0.6, 0.3]
                  }}
                  transition={{ duration: isSwapping ? 1 : 4, repeat: Infinity }}
                />
                <motion.path
                  d="M 100 140 Q 150 120 200 140"
                  stroke={isSwapping ? nextPersona.color : "#00d4ff"}
                  strokeWidth={isSwapping ? 2 : 1}
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: [0, 1, 0] }}
                  transition={{ duration: isSwapping ? 1 : 3, repeat: Infinity }}
                />
                <motion.path
                  d="M 80 180 Q 150 200 220 180"
                  stroke={isSwapping ? nextPersona.color : "#00d4ff"}
                  strokeWidth={isSwapping ? 2 : 1}
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: [0, 1, 0] }}
                  transition={{ duration: isSwapping ? 1 : 3, repeat: Infinity, delay: 0.5 }}
                />
                {/* Additional mesh lines during swap */}
                {isSwapping && (
                  <>
                    <motion.line x1="110" y1="140" x2="110" y2="240" stroke={nextPersona.color} strokeWidth="1" 
                      animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1 }} />
                    <motion.line x1="150" y1="120" x2="150" y2="260" stroke={nextPersona.color} strokeWidth="1" 
                      animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1, delay: 0.1 }} />
                    <motion.line x1="190" y1="140" x2="190" y2="240" stroke={nextPersona.color} strokeWidth="1" 
                      animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1, delay: 0.2 }} />
                  </>
                )}
              </svg>
            </div>
            
            {/* "SWAPPING" indicator */}
            <AnimatePresence>
              {isSwapping && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="absolute top-4 left-1/2 -translate-x-1/2 z-40"
                >
                  <div 
                    className="px-4 py-2 rounded-full backdrop-blur-md border flex items-center gap-2"
                    style={{ 
                      backgroundColor: `${nextPersona.color}30`,
                      borderColor: nextPersona.color,
                      boxShadow: `0 0 20px ${nextPersona.color}60`
                    }}
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-t-transparent rounded-full"
                      style={{ borderColor: nextPersona.color, borderTopColor: "transparent" }}
                    />
                    <span className="text-white text-xs font-bold tracking-wider">SWAPPING...</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Name label */}
            <motion.div 
              className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20"
              animate={{ 
                scale: isSwapping ? [1, 1.1, 1] : 1,
              }}
              transition={{ duration: 0.5 }}
            >
              <motion.div 
                className="bg-[#0a0e1a]/90 backdrop-blur-md px-6 py-2 rounded-full border"
                animate={{
                  borderColor: currentPersona.color,
                  boxShadow: isSwapping 
                    ? [`0 0 20px ${currentPersona.color}60`, `0 0 40px ${nextPersona.color}80`, `0 0 20px ${nextPersona.color}60`]
                    : `0 0 15px ${currentPersona.color}40`
                }}
                transition={{ duration: 0.5 }}
              >
                <AnimatePresence mode="wait">
                  <motion.span 
                    key={currentPersona.name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-white text-lg font-semibold"
                  >
                    {currentPersona.name}
                  </motion.span>
                </AnimatePresence>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>

        {/* Progress indicator */}
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
          {swapPersonas.map((persona, index) => (
            <motion.div
              key={persona.name}
              className="w-2 h-2 rounded-full cursor-pointer"
              style={{ 
                backgroundColor: index === currentIndex ? persona.color : "#374151",
                boxShadow: index === currentIndex ? `0 0 10px ${persona.color}` : "none"
              }}
              animate={{ 
                scale: index === currentIndex ? [1, 1.3, 1] : 1 
              }}
              transition={{ duration: 1, repeat: index === currentIndex ? Infinity : 0 }}
              onClick={() => {
                if (!isSwapping) {
                  setNextIndex(index)
                  setIsSwapping(true)
                  setTimeout(() => {
                    setCurrentIndex(index)
                    setIsSwapping(false)
                  }, 1500)
                }
              }}
            />
          ))}
        </div>
      </div>

      {/* Bottom app section */}
      <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 z-20">
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
        
        <motion.div 
          whileHover={{ scale: 1.05 }}
          className="flex items-center gap-3 bg-[#111827]/90 backdrop-blur-md border border-[#22c55e]/30 px-8 py-4 rounded-full cursor-pointer shadow-[0_0_20px_rgba(34,197,94,0.2)]"
          animate={{
            boxShadow: isSwapping 
              ? [`0 0 20px ${currentPersona.color}40`, `0 0 40px ${nextPersona.color}60`, `0 0 20px ${nextPersona.color}40`]
              : "0 0 20px rgba(34,197,94,0.2)"
          }}
        >
          <motion.span 
            animate={{ 
              scale: [1, 1.3, 1],
              backgroundColor: isSwapping ? nextPersona.color : "#22c55e",
              boxShadow: isSwapping 
                ? [`0 0 10px ${nextPersona.color}`, `0 0 20px ${nextPersona.color}`, `0 0 10px ${nextPersona.color}`]
                : ["0 0 10px rgba(34,197,94,0.5)", "0 0 20px rgba(34,197,94,0.8)", "0 0 10px rgba(34,197,94,0.5)"]
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-3 h-3 rounded-full" 
          />
          <span className="text-white text-sm font-semibold">Swap en temps reel</span>
        </motion.div>
      </div>
    </div>
  )
}
