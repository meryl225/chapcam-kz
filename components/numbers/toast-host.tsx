'use client'

import { useNumbers } from '@/components/numbers/numbers-provider'
import { Bell } from 'lucide-react'

export function ToastHost() {
  const { toasts } = useNumbers()
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-start gap-3 rounded-xl border border-white/10 bg-[#0c1322]/95 p-4 shadow-2xl backdrop-blur-xl"
        >
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#2563EB]/20 text-[#60a5fa]">
            <Bell className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">{t.title}</p>
            {t.desc && <p className="mt-0.5 text-xs text-slate-400">{t.desc}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}
