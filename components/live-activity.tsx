"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { UserPlus, Sparkles, Download, X } from "lucide-react"

type ActivityType = "signup" | "swap" | "download"

const NAMES = [
  "Kouassi A.",
  "Aminata D.",
  "NeoStream",
  "Fatou B.",
  "Yao K.",
  "LilaVibes",
  "Ibrahim S.",
  "GameMasterCI",
  "Awa T.",
  "ShadowZ",
  "Moussa K.",
  "CyberFatou",
  "Serge O.",
  "Mariam C.",
  "TchakGamer",
  "Prisca N.",
  "Didier G.",
  "AyaStream",
  "Boubacar L.",
  "NashPlay",
  "Konan Y.",
  "Rokia S.",
  "DjustReal",
  "Emmanuel K.",
  "Nadège A.",
  "VibzMaster",
  "Salif T.",
  "Chantal B.",
  "KingZeus_",
  "Ousmane D.",
  "Grace M.",
  "PixelWarrior",
  "Adjoua K.",
  "Franck N.",
  "MissLive228",
  "Bakary C.",
  "Sandrine O.",
  "ZoukGamer",
  "Habib T.",
  "Clarisse E.",
]

const CITIES = [
  "Abidjan",
  "Cotonou",
  "Lomé",
  "Douala",
  "Yaoundé",
  "Yamoussoukro",
  "Bouaké",
  "Porto-Novo",
  "Dakar",
  "Ouagadougou",
  "Bamako",
  "Conakry",
  "San-Pédro",
  "Korhogo",
  "Garoua",
  "Kara",
]

const ACTIONS: Record<
  ActivityType,
  { label: string; icon: typeof UserPlus; color: string; bg: string }
> = {
  signup: {
    label: "vient de s'inscrire",
    icon: UserPlus,
    color: "#00ff88",
    bg: "rgba(0,255,136,0.14)",
  },
  swap: {
    label: "vient de commencer un swap",
    icon: Sparkles,
    color: "#00d4ff",
    bg: "rgba(0,212,255,0.14)",
  },
  download: {
    label: "vient de télécharger l'app",
    icon: Download,
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.16)",
  },
}

type Item = {
  id: number
  type: ActivityType
  name: string
  city: string
  minutes: number
}

function pick<T>(list: T[], exclude?: T): T {
  let value = list[Math.floor(Math.random() * list.length)]
  // Evite de repeter la meme valeur que la notification precedente
  let guard = 0
  while (exclude !== undefined && value === exclude && list.length > 1 && guard < 10) {
    value = list[Math.floor(Math.random() * list.length)]
    guard++
  }
  return value
}

function randomItem(id: number, prev?: Item | null): Item {
  const types: ActivityType[] = ["signup", "swap", "download", "signup", "swap"]
  return {
    id,
    type: pick(types, prev?.type),
    name: pick(NAMES, prev?.name),
    city: pick(CITIES, prev?.city),
    minutes: Math.floor(Math.random() * 12) + 1,
  }
}

export function LiveActivity() {
  const [current, setCurrent] = useState<Item | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [counter, setCounter] = useState(1)
  const lastRef = useRef<Item | null>(null)

  const showNext = useCallback(() => {
    const next = randomItem(Date.now(), lastRef.current)
    lastRef.current = next
    setCurrent(next)
    setCounter((c) => c + 1)
  }, [])

  useEffect(() => {
    if (dismissed) return
    // Premiere notification apres 3.5s
    const firstTimer = setTimeout(showNext, 3500)
    return () => clearTimeout(firstTimer)
  }, [dismissed, showNext])

  useEffect(() => {
    if (dismissed || !current) return
    // Masquer apres 5s, reafficher une nouvelle 4s plus tard
    const hideTimer = setTimeout(() => setCurrent(null), 5000)
    const nextTimer = setTimeout(showNext, 9000)
    return () => {
      clearTimeout(hideTimer)
      clearTimeout(nextTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [counter, dismissed])

  if (dismissed) return null

  return (
    <div className="pointer-events-none fixed bottom-5 left-4 z-40 sm:bottom-6 sm:left-6">
      <AnimatePresence mode="wait">
        {current && (
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 24, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="pointer-events-auto flex w-[300px] items-center gap-3 rounded-2xl border border-white/10 bg-[#0d1220]/85 p-3 pr-9 shadow-[0_18px_50px_-16px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl"
          >
            {(() => {
              const action = ACTIONS[current.type]
              const Icon = action.icon
              return (
                <>
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: action.bg, color: action.color }}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm text-white">
                      <span className="font-bold" style={{ color: action.color }}>
                        {current.name}
                      </span>{" "}
                      <span className="text-gray-300">{action.label}</span>
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-gray-500">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#00ff88] shadow-[0_0_6px_#00ff88]" />
                      {current.city} · il y a {current.minutes} min
                    </p>
                  </div>
                </>
              )
            })()}

            <button
              type="button"
              aria-label="Fermer la notification"
              onClick={() => setDismissed(true)}
              className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
