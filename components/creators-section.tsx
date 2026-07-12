"use client"

import { motion } from "framer-motion"
import { Radio, Clapperboard, Gamepad2, Video, Bot, Building2 } from "lucide-react"

const CARDS = [
  {
    icon: Radio,
    title: "Streamers",
    desc: "Anime tes lives avec un avatar unique.",
    color: "#00d4ff",
  },
  {
    icon: Clapperboard,
    title: "Créateurs de contenu",
    desc: "Crée des vidéos virales sans te montrer.",
    color: "#e91e8c",
  },
  {
    icon: Gamepad2,
    title: "Gamers",
    desc: "Incarnation totale dans tes jeux.",
    color: "#00ff88",
  },
  {
    icon: Video,
    title: "Appels & Réunions",
    desc: "Garde ton anonymat en toutes circonstances.",
    color: "#2D8CFF",
  },
  {
    icon: Bot,
    title: "VTubers",
    desc: "Deviens ton propre personnage.",
    color: "#8b5cf6",
  },
  {
    icon: Building2,
    title: "Entreprises",
    desc: "Présentations, support et formations.",
    color: "#f97316",
  },
]

export function CreatorsSection() {
  return (
    <section className="relative px-6 py-24">
      <div className="mx-auto max-w-6xl">
        {/* En-tete */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-14 text-center"
        >
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-gray-500">
            Pour tous les créateurs
          </p>
          <h2 className="text-balance text-4xl font-black tracking-tight text-white sm:text-5xl">
            Une seule caméra. Des{" "}
            <span className="bg-gradient-to-r from-[#8b5cf6] to-[#00d4ff] bg-clip-text text-transparent">
              possibilités infinies.
            </span>
          </h2>
        </motion.div>

        {/* Grille de cartes */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {CARDS.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.06]"
            >
              {/* Halo au survol */}
              <div
                aria-hidden
                className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{ background: `radial-gradient(120px 80px at 50% 0%, ${card.color}22, transparent)` }}
              />
              <div className="relative">
                <span
                  className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{ background: `${card.color}1a`, boxShadow: `inset 0 0 0 1px ${card.color}33` }}
                >
                  <card.icon className="h-5 w-5" style={{ color: card.color }} />
                </span>
                <h3 className="mb-1.5 text-sm font-bold text-white">{card.title}</h3>
                <p className="text-xs leading-relaxed text-gray-400">{card.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
