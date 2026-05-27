"use client"

import { motion } from "framer-motion"
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
    isActive: true,
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

// Glowing Ring Component
function GlowingRing({ number, color, glowColor, isActive }: { number: string; color: string; glowColor: string; isActive?: boolean }) {
  return (
    <div className="relative w-20 h-20 mx-auto mb-4">
      {/* Outer glow ring */}
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
      
      {/* Pulsing glow */}
      <motion.div
        className="absolute inset-[-4px] rounded-full"
        style={{
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
        }}
        animate={{
          opacity: [0.5, 1, 0.5],
          scale: [1, 1.1, 1],
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
          boxShadow: [
            `0 0 10px ${glowColor}, inset 0 0 10px ${glowColor}`,
            `0 0 25px ${glowColor}, inset 0 0 15px ${glowColor}`,
            `0 0 10px ${glowColor}, inset 0 0 10px ${glowColor}`,
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
      
      {/* Active indicator arrow */}
      {isActive && (
        <motion.div
          className="absolute -bottom-2 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 3, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <div 
            className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent"
            style={{ borderTopColor: color }}
          />
        </motion.div>
      )}
    </div>
  )
}

export function RoadmapSection() {
  return (
    <section id="roadmap" className="relative py-24 px-4 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0d1117]/80 to-transparent" />
      
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-0 w-96 h-96 bg-[#e91e8c]/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-1/2 right-0 w-96 h-96 bg-[#00d4ff]/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-[#8b5cf6]/10 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-wider">
            CHAPCAM<span className="text-[#00d4ff]">.COM</span>
          </h2>
          <p className="text-gray-400 text-lg tracking-widest">
            ROADMAP - <span className="text-[#00d4ff]">5 PHASES</span> POUR TRANSFORMER TON IDENTITE, TON STYLE, TON MONDE.
          </p>
        </motion.div>

        {/* Timeline connector line */}
        <div className="hidden lg:block absolute top-[280px] left-[10%] right-[10%] h-[2px]">
          <motion.div
            className="h-full bg-gradient-to-r from-[#e91e8c] via-[#00d4ff] to-[#8b5cf6]"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            style={{ transformOrigin: "left" }}
          />
        </div>

        {/* Phases Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {phases.map((phase, index) => (
            <motion.div
              key={phase.number}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className="relative"
            >
              {/* Glowing Ring */}
              <GlowingRing 
                number={phase.number} 
                color={phase.color} 
                glowColor={phase.glowColor}
                isActive={phase.isActive}
              />
              
              {/* Phase label */}
              <p className="text-center text-gray-500 text-sm font-medium mb-4 tracking-wider">
                {phase.phase}
              </p>

              {/* Card */}
              <motion.div
                className="relative rounded-xl overflow-hidden h-full"
                whileHover={{ scale: 1.02, y: -5 }}
                transition={{ duration: 0.3 }}
              >
                {/* Card border glow */}
                <motion.div
                  className="absolute inset-0 rounded-xl p-[1px]"
                  style={{
                    background: `linear-gradient(135deg, ${phase.color}50, transparent 50%, ${phase.color}30)`,
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

                <div className="relative m-[1px] rounded-xl bg-[#0d1525]/95 backdrop-blur-xl p-5 h-full">
                  {/* Title */}
                  <h3 
                    className="text-sm font-bold mb-3 leading-tight"
                    style={{ color: phase.color }}
                  >
                    {phase.title}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-400 text-xs leading-relaxed mb-4">
                    {phase.description}
                  </p>

                  {/* Features */}
                  <div className="space-y-2 mb-4">
                    {phase.features.map((feature, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <feature.icon 
                          className="w-4 h-4 flex-shrink-0" 
                          style={{ color: phase.color }} 
                        />
                        <span className="text-gray-300 text-xs">{feature.text}</span>
                      </div>
                    ))}
                  </div>

                  {/* Timeline badge */}
                  <motion.div
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold mb-3"
                    style={{ 
                      backgroundColor: `${phase.color}20`,
                      color: phase.color,
                      border: `1px solid ${phase.color}40`,
                    }}
                    animate={{
                      boxShadow: [
                        `0 0 5px ${phase.glowColor}`,
                        `0 0 15px ${phase.glowColor}`,
                        `0 0 5px ${phase.glowColor}`,
                      ],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    {phase.timeline}
                  </motion.div>
                </div>
              </motion.div>

              {/* Tagline */}
              <p 
                className="text-center text-xs font-medium mt-4 px-2"
                style={{ color: phase.color }}
              >
                {phase.tagline}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Mission Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-20"
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

            <div className="relative m-[1px] rounded-2xl bg-[#0d1525]/95 backdrop-blur-xl p-8">
              <div className="flex flex-col lg:flex-row items-center gap-8">
                {/* Mission icon and title */}
                <div className="flex items-center gap-4">
                  <motion.div
                    className="w-16 h-16 rounded-full bg-gradient-to-br from-[#00d4ff]/20 to-[#22c55e]/20 flex items-center justify-center border border-[#00d4ff]/30"
                    animate={{
                      boxShadow: [
                        "0 0 20px rgba(0,212,255,0.3)",
                        "0 0 40px rgba(0,212,255,0.5)",
                        "0 0 20px rgba(0,212,255,0.3)",
                      ],
                    }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <Target className="w-8 h-8 text-[#00d4ff]" />
                  </motion.div>
                  <div>
                    <h3 className="text-white font-bold text-xl">NOTRE MISSION</h3>
                  </div>
                </div>

                {/* Mission text */}
                <div className="flex-1 text-center lg:text-left">
                  <p className="text-gray-300 text-sm leading-relaxed">
                    Donner a chacun le pouvoir de devenir qui il veut, quand il veut, avec liberte, creativite et confiance.
                  </p>
                </div>

                {/* Mission values */}
                <div className="flex flex-wrap justify-center gap-6">
                  {missionValues.map((value, index) => (
                    <motion.div
                      key={index}
                      className="flex flex-col items-center gap-2"
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.8 + index * 0.1 }}
                    >
                      <motion.div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${value.color}20` }}
                        animate={{
                          boxShadow: [
                            `0 0 10px ${value.color}30`,
                            `0 0 20px ${value.color}50`,
                            `0 0 10px ${value.color}30`,
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
