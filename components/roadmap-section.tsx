"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { User, Smile, Mic, Star, Infinity, Shield, Users, Zap, Heart } from "lucide-react"

const phases = [
  {
    number: "01",
    phase: "PHASE 1",
    title: "TRANSFORMATION CORPS ET VISAGE ENTIER EN TEMPS REEL",
    description: "Change completement ton apparence en direct. Visage, corps, style : deviens qui tu veux, quand tu veux.",
    features: [
      { icon: User, text: "Transforme ton visage et ton corps entier" },
      { icon: Sparkles, text: "Des styles realistes et varies" },
      { icon: Zap, text: "Fluide, rapide et naturel" },
    ],
    timeline: "2026 - MAINTENANT",
    tagline: "LE DEBUT DE TA NOUVELLE IDENTITE.",
    color: "#e91e8c",
    glowColor: "rgba(233,30,140,0.6)",
  },
  {
    number: "02",
    phase: "PHASE 2",
    title: "EXPERIENCE AMELIOREE",
    description: "Plus de stabilite, plus de realisme et une experience quotidienne encore plus agreable.",
    features: [
      { icon: Smile, text: "Rendu encore plus naturel et realiste" },
      { icon: Shield, text: "Plus stable, plus agreable" },
      { icon: Users, text: "Concu pour tous tes moments" },
    ],
    timeline: "2026 - Q3",
    tagline: "PLUS DE REALISME. PLUS DE PLAISIR.",
    color: "#22c55e",
    glowColor: "rgba(34,197,94,0.6)",
  },
  {
    number: "03",
    phase: "PHASE 3",
    title: "AJOUT DE LA MODIFICATION VOCALE",
    description: "Change ta voix en temps reel et choisis celle qui te represente le mieux.",
    features: [
      { icon: Mic, text: "Change ta voix instantanement" },
      { icon: AudioWaveform, text: "Plusieurs voix disponibles" },
      { icon: Shield, text: "Ta voix, ta liberte, en toute securite" },
    ],
    timeline: "2026 - Q4",
    tagline: "TA VOIX. TON CHOIX. TON POUVOIR.",
    color: "#00d4ff",
    glowColor: "rgba(0,212,255,0.6)",
  },
  {
    number: "04",
    phase: "PHASE 4",
    title: "EXPERIENCE VOCALE ULTRA REALISTE",
    description: "Des voix ultra naturelles, emotionnelles et immersives comme jamais auparavant.",
    features: [
      { icon: Star, text: "Voix ultra naturelles et vivantes" },
      { icon: Heart, text: "Exprime toutes tes emotions" },
      { icon: Users, text: "Qualite professionnelle pour tous" },
    ],
    timeline: "2027 - Q1",
    tagline: "TA VOIX PREND VIE. SANS LIMITES.",
    color: "#f59e0b",
    glowColor: "rgba(245,158,11,0.6)",
  },
  {
    number: "05",
    phase: "PHASE 5",
    title: "LE FUTUR SANS LIMITES",
    description: "Encore plus de liberte, de creativite et de possibilites grace aux technologies de demain.",
    features: [
      { icon: Infinity, text: "Encore plus de styles et d'options" },
      { icon: Users, text: "Partage, connecte et inspire" },
      { icon: Globe, text: "Une experience mondiale et evolutive" },
    ],
    timeline: "2027 ET AU-DELA",
    tagline: "LE FUTUR T'APPARTIENT. NOUS LE CREONS AVEC TOI.",
    color: "#8b5cf6",
    glowColor: "rgba(139,92,246,0.6)",
  },
]

const missionValues = [
  { icon: Shield, text: "SECURITE AVANT TOUT", color: "#00d4ff" },
  { icon: Users, text: "POUR TOUT LE MONDE", color: "#22c55e" },
  { icon: Zap, text: "INNOVATION CONTINUE", color: "#f59e0b" },
  { icon: Heart, text: "PASSION & COMMUNAUTE", color: "#e91e8c" },
]

// Custom icons
function Sparkles({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
      <path d="M5 3v4"/>
      <path d="M19 17v4"/>
      <path d="M3 5h4"/>
      <path d="M17 19h4"/>
    </svg>
  )
}

function AudioWaveform({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 13a2 2 0 0 0 2-2V7a2 2 0 0 1 4 0v13a2 2 0 0 0 4 0V4a2 2 0 0 1 4 0v13a2 2 0 0 0 4 0v-4a2 2 0 0 1 2-2"/>
    </svg>
  )
}

function Globe({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
      <path d="M2 12h20"/>
    </svg>
  )
}

function Target({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="6"/>
      <circle cx="12" cy="12" r="2"/>
    </svg>
  )
}

// Glowing Ring Component - Clickable
function GlowingRing({ 
  number, 
  color, 
  glowColor, 
  isSelected,
  onClick 
}: { 
  number: string
  color: string
  glowColor: string
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <motion.button
      onClick={onClick}
      className="relative w-20 h-20 cursor-pointer focus:outline-none"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Outer glow ring - constant rotation */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(from 0deg, ${color}, transparent 60%, ${color})`,
          filter: `blur(2px)`,
        }}
        animate={{
          rotate: [0, 360],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "linear",
        }}
      />
      
      {/* Pulsing glow - constant */}
      <motion.div
        className="absolute inset-[-4px] rounded-full"
        style={{
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
        }}
        animate={{
          opacity: isSelected ? [0.8, 1, 0.8] : [0.3, 0.6, 0.3],
          scale: isSelected ? [1, 1.15, 1] : [1, 1.05, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      {/* Ring border */}
      <motion.div
        className="absolute inset-1 rounded-full border-2"
        style={{ borderColor: color }}
        animate={{
          boxShadow: isSelected 
            ? [
                `0 0 15px ${glowColor}, inset 0 0 15px ${glowColor}`,
                `0 0 35px ${glowColor}, inset 0 0 25px ${glowColor}`,
                `0 0 15px ${glowColor}, inset 0 0 15px ${glowColor}`,
              ]
            : [
                `0 0 8px ${glowColor}, inset 0 0 8px ${glowColor}`,
                `0 0 20px ${glowColor}, inset 0 0 12px ${glowColor}`,
                `0 0 8px ${glowColor}, inset 0 0 8px ${glowColor}`,
              ],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      {/* Inner circle with number */}
      <div 
        className="absolute inset-3 rounded-full flex items-center justify-center bg-[#0a0e1a]"
      >
        <span 
          className="text-2xl font-bold"
          style={{ color }}
        >
          {number}
        </span>
      </div>
      
      {/* Selected indicator */}
      {isSelected && (
        <motion.div
          className="absolute -bottom-3 left-1/2 -translate-x-1/2"
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div 
            className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[10px] border-l-transparent border-r-transparent"
            style={{ borderTopColor: color }}
          />
        </motion.div>
      )}
    </motion.button>
  )
}

export function RoadmapSection() {
  const [selectedPhase, setSelectedPhase] = useState(0)
  const currentPhase = phases[selectedPhase]

  return (
    <section id="roadmap" className="relative py-20 px-4 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0d1117]/80 to-transparent" />
      
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-0 w-96 h-96 bg-[#e91e8c]/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-1/2 right-0 w-96 h-96 bg-[#00d4ff]/10 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <p className="text-gray-400 text-sm tracking-widest mb-2">ROADMAP</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
            <span className="text-[#00d4ff]">5 PHASES</span> POUR TRANSFORMER
          </h2>
          <p className="text-gray-400 text-sm tracking-wide">
            TON IDENTITE, TON STYLE, TON MONDE.
          </p>
        </motion.div>

        {/* Phase Selector - Rings */}
        <div className="flex justify-center items-center gap-4 md:gap-8 mb-8 flex-wrap">
          {phases.map((phase, index) => (
            <div key={phase.number} className="flex flex-col items-center">
              <GlowingRing 
                number={phase.number} 
                color={phase.color} 
                glowColor={phase.glowColor}
                isSelected={selectedPhase === index}
                onClick={() => setSelectedPhase(index)}
              />
              <p 
                className={`text-xs font-medium mt-4 transition-colors ${
                  selectedPhase === index ? 'text-white' : 'text-gray-500'
                }`}
                style={{ color: selectedPhase === index ? phase.color : undefined }}
              >
                {phase.phase}
              </p>
            </div>
          ))}
        </div>

        {/* Timeline connector line */}
        <div className="hidden md:block relative h-1 mx-auto max-w-3xl mb-10">
          <div className="absolute inset-0 bg-gray-800 rounded-full" />
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              background: `linear-gradient(90deg, ${phases.map(p => p.color).join(', ')})`,
              width: `${((selectedPhase + 1) / phases.length) * 100}%`,
            }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {/* Selected Phase Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedPhase}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="max-w-4xl mx-auto"
          >
            {/* Card */}
            <div className="relative rounded-2xl overflow-hidden">
              {/* Animated border */}
              <motion.div
                className="absolute inset-0 rounded-2xl p-[2px]"
                style={{
                  background: `linear-gradient(135deg, ${currentPhase.color}, transparent 50%, ${currentPhase.color}50)`,
                }}
                animate={{
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />

              <div className="relative m-[2px] rounded-2xl bg-[#0d1525]/95 backdrop-blur-xl p-8 md:p-10">
                {/* Title & Timeline */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                  <h3 
                    className="text-xl md:text-2xl font-bold"
                    style={{ color: currentPhase.color }}
                  >
                    {currentPhase.title}
                  </h3>
                  
                  {/* Timeline badge */}
                  <motion.div
                    className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold self-start"
                    style={{ 
                      backgroundColor: `${currentPhase.color}20`,
                      color: currentPhase.color,
                      border: `1px solid ${currentPhase.color}40`,
                    }}
                    animate={{
                      boxShadow: [
                        `0 0 10px ${currentPhase.glowColor}`,
                        `0 0 25px ${currentPhase.glowColor}`,
                        `0 0 10px ${currentPhase.glowColor}`,
                      ],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    {currentPhase.timeline}
                  </motion.div>
                </div>

                {/* Description */}
                <p className="text-gray-300 text-base md:text-lg leading-relaxed mb-8">
                  {currentPhase.description}
                </p>

                {/* Features */}
                <div className="grid md:grid-cols-3 gap-4 mb-8">
                  {currentPhase.features.map((feature, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10"
                    >
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${currentPhase.color}20` }}
                      >
                        <feature.icon 
                          className="w-5 h-5" 
                          style={{ color: currentPhase.color }} 
                        />
                      </div>
                      <span className="text-gray-200 text-sm">{feature.text}</span>
                    </motion.div>
                  ))}
                </div>

                {/* Tagline */}
                <motion.p 
                  className="text-center text-lg md:text-xl font-bold tracking-wide"
                  style={{ color: currentPhase.color }}
                  animate={{
                    textShadow: [
                      `0 0 10px ${currentPhase.glowColor}`,
                      `0 0 30px ${currentPhase.glowColor}`,
                      `0 0 10px ${currentPhase.glowColor}`,
                    ],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  {currentPhase.tagline}
                </motion.p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Mission Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-16"
        >
          <div className="relative rounded-2xl overflow-hidden">
            {/* Animated border */}
            <motion.div
              className="absolute inset-0 rounded-2xl p-[1px]"
              style={{
                background: "linear-gradient(90deg, #00d4ff, #22c55e, #f59e0b, #e91e8c, #00d4ff)",
                backgroundSize: "300% 100%",
              }}
              animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            />

            <div className="relative m-[1px] rounded-2xl bg-[#0d1525]/95 backdrop-blur-xl p-6 md:p-8">
              <div className="flex flex-col lg:flex-row items-center gap-6">
                {/* Mission icon and title */}
                <div className="flex items-center gap-4">
                  <motion.div
                    className="w-14 h-14 rounded-full bg-gradient-to-br from-[#00d4ff]/20 to-[#22c55e]/20 flex items-center justify-center border border-[#00d4ff]/30"
                    animate={{
                      boxShadow: [
                        "0 0 15px rgba(0,212,255,0.3)",
                        "0 0 30px rgba(0,212,255,0.5)",
                        "0 0 15px rgba(0,212,255,0.3)",
                      ],
                    }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <Target className="w-7 h-7 text-[#00d4ff]" />
                  </motion.div>
                  <h3 className="text-white font-bold text-lg">NOTRE MISSION</h3>
                </div>

                {/* Mission text */}
                <div className="flex-1 text-center lg:text-left">
                  <p className="text-gray-300 text-sm leading-relaxed">
                    Donner a chacun le pouvoir de devenir qui il veut, quand il veut, avec liberte, creativite et confiance.
                  </p>
                </div>

                {/* Mission values */}
                <div className="flex flex-wrap justify-center gap-4">
                  {missionValues.map((value, index) => (
                    <motion.div
                      key={index}
                      className="flex flex-col items-center gap-2"
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                    >
                      <motion.div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${value.color}20` }}
                        animate={{
                          boxShadow: [
                            `0 0 8px ${value.color}30`,
                            `0 0 18px ${value.color}50`,
                            `0 0 8px ${value.color}30`,
                          ],
                        }}
                        transition={{ duration: 2, repeat: Infinity, delay: index * 0.3 }}
                      >
                        <value.icon className="w-5 h-5" style={{ color: value.color }} />
                      </motion.div>
                      <span className="text-gray-400 text-[10px] font-medium text-center whitespace-nowrap">
                        {value.text}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
