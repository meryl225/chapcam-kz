"use client"

import { useEffect, useState } from "react"
import { Clock } from "lucide-react"

// Launch offer ends 7 days after this date. Update LAUNCH_START when you ship.
const LAUNCH_START = new Date("2026-06-06T00:00:00Z").getTime()
const OFFER_DURATION_MS = 7 * 24 * 60 * 60 * 1000

function getRemaining() {
  const end = LAUNCH_START + OFFER_DURATION_MS
  const diff = Math.max(0, end - Date.now())
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
  const minutes = Math.floor((diff / (1000 * 60)) % 60)
  const seconds = Math.floor((diff / 1000) % 60)
  return { days, hours, minutes, seconds, ended: diff === 0 }
}

export function PcCountdown() {
  const [time, setTime] = useState(getRemaining())

  useEffect(() => {
    const id = setInterval(() => setTime(getRemaining()), 1000)
    return () => clearInterval(id)
  }, [])

  const units = [
    { label: "Jours", value: time.days },
    { label: "Heures", value: time.hours },
    { label: "Min", value: time.minutes },
    { label: "Sec", value: time.seconds },
  ]

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-2 text-[#fbbf24]">
        <Clock className="w-4 h-4" />
        <span className="text-sm font-semibold tracking-wide uppercase">
          {time.ended ? "Offre de lancement terminee" : "Fin du prix de lancement dans"}
        </span>
      </div>
      <div className="flex items-center gap-3">
        {units.map((u) => (
          <div
            key={u.label}
            className="flex flex-col items-center justify-center rounded-2xl border border-[#f97316]/30 bg-[#111827] px-4 py-3 min-w-[64px]"
          >
            <span className="text-3xl font-black text-[#fbbf24] tabular-nums">
              {String(u.value).padStart(2, "0")}
            </span>
            <span className="text-xs text-gray-400 uppercase tracking-wider mt-1">
              {u.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
