"use client"

import { motion } from "framer-motion"
import { useEffect, useState } from "react"

interface Particle {
  id: number
  x: number
  y: number
  size: number
  color: string
  duration: number
  delay: number
}

interface FloatingOrb {
  id: number
  x: number
  y: number
  size: number
  color: string
  blur: number
}

export function AnimatedBackground() {
  const [particles, setParticles] = useState<Particle[]>([])
  const [orbs, setOrbs] = useState<FloatingOrb[]>([])

  useEffect(() => {
    // Generate particles
    const colors = ["#00d4ff", "#22c55e", "#f97316", "#8b5cf6", "#e91e8c"]
    const newParticles: Particle[] = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      duration: Math.random() * 10 + 15,
      delay: Math.random() * 5,
    }))
    setParticles(newParticles)

    // Generate floating orbs
    const newOrbs: FloatingOrb[] = [
      { id: 1, x: 10, y: 20, size: 300, color: "#00d4ff", blur: 150 },
      { id: 2, x: 80, y: 60, size: 250, color: "#8b5cf6", blur: 120 },
      { id: 3, x: 50, y: 80, size: 200, color: "#e91e8c", blur: 100 },
      { id: 4, x: 20, y: 70, size: 180, color: "#22c55e", blur: 90 },
      { id: 5, x: 70, y: 30, size: 220, color: "#f97316", blur: 110 },
    ]
    setOrbs(newOrbs)
  }, [])

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Animated Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,212,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
      
      {/* Floating Orbs */}
      {orbs.map((orb) => (
        <motion.div
          key={orb.id}
          className="absolute rounded-full"
          style={{
            left: `${orb.x}%`,
            top: `${orb.y}%`,
            width: orb.size,
            height: orb.size,
            background: orb.color,
            filter: `blur(${orb.blur}px)`,
            opacity: 0.15,
          }}
          animate={{
            x: [0, 50, -30, 0],
            y: [0, -40, 30, 0],
            scale: [1, 1.2, 0.9, 1],
          }}
          transition={{
            duration: 20 + orb.id * 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Particles */}
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
            background: particle.color,
            boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`,
          }}
          animate={{
            y: [0, -100, 0],
            x: [0, Math.random() * 50 - 25, 0],
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Tech Lines - Top Right */}
      <div className="absolute top-20 right-10 w-60 h-60">
        <motion.div
          className="absolute top-0 right-0 h-[2px] bg-gradient-to-l from-[#00d4ff] to-transparent"
          initial={{ width: 0 }}
          animate={{ width: [0, 200, 200, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-0 right-0 w-[2px] bg-gradient-to-b from-[#00d4ff] to-transparent"
          initial={{ height: 0 }}
          animate={{ height: [0, 200, 200, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        />
        <motion.div
          className="absolute top-10 right-10 w-3 h-3 rounded-full bg-[#00d4ff]"
          animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
          transition={{ duration: 2, repeat: Infinity, delay: 1 }}
        />
      </div>

      {/* Tech Lines - Bottom Left */}
      <div className="absolute bottom-20 left-10 w-60 h-60">
        <motion.div
          className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-[#e91e8c] to-transparent"
          initial={{ width: 0 }}
          animate={{ width: [0, 200, 200, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
        <motion.div
          className="absolute bottom-0 left-0 w-[2px] bg-gradient-to-t from-[#e91e8c] to-transparent"
          initial={{ height: 0 }}
          animate={{ height: [0, 200, 200, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 2.5 }}
        />
        <motion.div
          className="absolute bottom-10 left-10 w-3 h-3 rounded-full bg-[#e91e8c]"
          animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
          transition={{ duration: 2, repeat: Infinity, delay: 3 }}
        />
      </div>

      {/* Scanning Lines */}
      <motion.div
        className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00d4ff]/50 to-transparent"
        animate={{ top: ["0%", "100%"] }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#e91e8c]/30 to-transparent"
        animate={{ top: ["100%", "0%"] }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
      />

      {/* Corner Decorations */}
      <div className="absolute top-0 left-0 w-40 h-40">
        <div className="absolute top-4 left-4 w-20 h-[1px] bg-gradient-to-r from-[#8b5cf6]/50 to-transparent" />
        <div className="absolute top-4 left-4 w-[1px] h-20 bg-gradient-to-b from-[#8b5cf6]/50 to-transparent" />
      </div>
      <div className="absolute top-0 right-0 w-40 h-40">
        <div className="absolute top-4 right-4 w-20 h-[1px] bg-gradient-to-l from-[#00d4ff]/50 to-transparent" />
        <div className="absolute top-4 right-4 w-[1px] h-20 bg-gradient-to-b from-[#00d4ff]/50 to-transparent" />
      </div>
      <div className="absolute bottom-0 left-0 w-40 h-40">
        <div className="absolute bottom-4 left-4 w-20 h-[1px] bg-gradient-to-r from-[#22c55e]/50 to-transparent" />
        <div className="absolute bottom-4 left-4 w-[1px] h-20 bg-gradient-to-t from-[#22c55e]/50 to-transparent" />
      </div>
      <div className="absolute bottom-0 right-0 w-40 h-40">
        <div className="absolute bottom-4 right-4 w-20 h-[1px] bg-gradient-to-l from-[#f97316]/50 to-transparent" />
        <div className="absolute bottom-4 right-4 w-[1px] h-20 bg-gradient-to-t from-[#f97316]/50 to-transparent" />
      </div>

      {/* Vertical Dotted Lines */}
      <div className="absolute right-20 top-1/4 flex flex-col gap-3">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={`dot-r-${i}`}
            className="w-1.5 h-1.5 rounded-full bg-[#00d4ff]"
            animate={{ opacity: [0.2, 0.8, 0.2] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
          />
        ))}
      </div>
      <div className="absolute left-20 top-1/3 flex flex-col gap-3">
        {Array.from({ length: 15 }).map((_, i) => (
          <motion.div
            key={`dot-l-${i}`}
            className="w-1.5 h-1.5 rounded-full bg-[#e91e8c]"
            animate={{ opacity: [0.2, 0.8, 0.2] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </div>
  )
}
