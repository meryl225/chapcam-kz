'use client'

import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'

interface TimeLeft {
  hours: number
  minutes: number
  seconds: number
}

// Cycle perpetuel de 3h : le compte a rebours descend de 3h00 a 0, puis se
// relance seul a 3h00. On l'ancre sur une grille globale (Date.now() % CYCLE)
// pour que tous les visiteurs voient exactement la meme valeur et qu'un simple
// rechargement de page ne remette pas le minuteur a 3h00.
const CYCLE_MS = 3 * 60 * 60 * 1000

function computeTimeLeft(): TimeLeft {
  const diff = CYCLE_MS - (Date.now() % CYCLE_MS)
  return {
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  }
}

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

// Compte a rebours de l'offre de lancement ChapCam PC.
// Affiche un contour + un decompte de 3h qui se relance en boucle.
// `compact` = version plus petite pour les bandeaux.
export function ChapCamPcCountdown({ compact = false }: { compact?: boolean }) {
  // null tant que le composant n'est pas monte cote client (evite le mismatch SSR)
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null)

  useEffect(() => {
    setTimeLeft(computeTimeLeft())
    const id = setInterval(() => setTimeLeft(computeTimeLeft()), 1000)
    return () => clearInterval(id)
  }, [])

  const units = [
    { label: 'H', value: timeLeft?.hours ?? 0 },
    { label: 'M', value: timeLeft?.minutes ?? 0 },
    { label: 'S', value: timeLeft?.seconds ?? 0 },
  ]

  return (
    <div
      className={`rounded-2xl border-2 border-dashed border-red-500/60 bg-red-500/10 ${
        compact ? 'px-3 py-2.5' : 'px-4 py-3'
      }`}
    >
      <div className="flex items-center justify-center gap-1.5 text-red-400">
        <Clock className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        <span
          className={`font-bold uppercase tracking-wide ${
            compact ? 'text-[10px]' : 'text-[11px]'
          }`}
        >
          Offre de lancement · fin dans
        </span>
      </div>

      <div className={`mt-1.5 flex items-center justify-center ${compact ? 'gap-1.5' : 'gap-2'}`}>
        {units.map((u, i) => (
          <div key={u.label} className="flex items-center">
            <div className="flex flex-col items-center">
              <span
                className={`font-mono font-black tabular-nums text-foreground ${
                  compact ? 'text-lg' : 'text-2xl'
                }`}
              >
                {pad(u.value)}
              </span>
              <span className="text-[9px] font-bold uppercase text-muted-foreground">{u.label}</span>
            </div>
            {i < units.length - 1 && (
              <span
                className={`px-1 font-black text-red-400/60 ${compact ? 'text-base' : 'text-xl'}`}
              >
                :
              </span>
            )}
          </div>
        ))}
      </div>

      <p
        className={`mt-1 text-center text-muted-foreground ${
          compact ? 'text-[10px]' : 'text-xs'
        }`}
      >
        50 000 FCFA a vie pendant l&apos;offre, puis 100 000 FCFA
      </p>
    </div>
  )
}
