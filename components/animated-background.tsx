"use client"

import { motion, useReducedMotion } from "framer-motion"
import { useEffect, useState } from "react"

interface Particle {
  id: number
  x: number
  y: number
  size: number
  color: string
  duration: number
  delay: number
  driftX: number
}

// Orbes STATIQUES : le flou (filter: blur) n'est rasterise qu'une seule fois par
// le navigateur et mis en cache sur sa couche. Auparavant ces orbes etaient
// animes (scale/position), ce qui forcait un recalcul du flou a CHAQUE frame —
// la principale cause de lenteur/jank cote client.
const ORBS = [
  { id: 1, x: 10, y: 20, size: 300, color: "#00d4ff", blur: 120 },
  { id: 2, x: 80, y: 60, size: 250, color: "#8b5cf6", blur: 110 },
  { id: 3, x: 45, y: 80, size: 200, color: "#e91e8c", blur: 100 },
]

export function AnimatedBackground() {
  const [particles, setParticles] = useState<Particle[]>([])
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (reduceMotion) return
    const colors = ["#00d4ff", "#22c55e", "#f97316", "#8b5cf6", "#e91e8c"]
    // 15 particules (au lieu de 50) et sans box-shadow (couteux a repeindre).
    const newParticles: Particle[] = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      duration: Math.random() * 10 + 15,
      delay: Math.random() * 5,
      driftX: Math.random() * 40 - 20,
    }))
    setParticles(newParticles)
  }, [reduceMotion])

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Grille statique (aucune animation) */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,212,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />

      {/* Orbes d'ambiance STATIQUES */}
      {ORBS.map((orb) => (
        <div
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
        />
      ))}

      {/* Particules legeres (transform/opacity uniquement, composite GPU) */}
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
            willChange: "transform, opacity",
          }}
          animate={{
            y: [0, -100, 0],
            x: [0, particle.driftX, 0],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Decors d'angle STATIQUES (cheap) */}
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

      {/* Une seule ligne de scan (transform GPU) */}
      {!reduceMotion && (
        <motion.div
          className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00d4ff]/40 to-transparent"
          style={{ willChange: "transform" }}
          animate={{ top: ["0%", "100%"] }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        />
      )}
    </div>
  )
}
