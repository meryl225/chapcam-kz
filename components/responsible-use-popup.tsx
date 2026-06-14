'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

const STORAGE_KEY = 'chapcam_responsible_use_ack_v1'

export function ResponsibleUsePopup() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      const acknowledged = localStorage.getItem(STORAGE_KEY)
      if (!acknowledged) setOpen(true)
    } catch {
      // localStorage indisponible : on n'affiche pas pour ne pas bloquer.
    }
  }, [])

  function acknowledge() {
    try {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString())
    } catch {
      // ignore
    }
    setOpen(false)
  }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="responsible-use-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
      <div aria-hidden className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-hairline bg-card p-7 shadow-2xl">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-40 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(0,255,136,0.3), transparent 70%)' }}
        />

        <div className="relative flex flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15">
            <AlertTriangle className="h-7 w-7 text-primary" aria-hidden />
          </span>

          <h2 id="responsible-use-title" className="mt-5 text-xl font-bold text-foreground">
            Utilisation responsable
          </h2>

          <p className="mt-3 text-pretty text-sm leading-relaxed text-muted-foreground">
            Les contenus générés avec CHAPCAM doivent respecter les lois applicables ainsi que les droits des tiers.
          </p>

          <button
            type="button"
            onClick={acknowledge}
            className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-primary px-6 py-3.5 font-bold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            J’ai compris
          </button>

          <Link
            href="/charte"
            onClick={acknowledge}
            className="mt-3 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            Consulter la charte d’utilisation
          </Link>
        </div>
      </div>
    </div>
  )
}
