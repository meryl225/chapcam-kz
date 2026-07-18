'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Sparkles, Monitor, Palette, Zap, ArrowRight } from 'lucide-react'

// Version de l'annonce : incremente pour re-afficher le popup a tous les clients.
const ANNOUNCEMENT_KEY = 'chapcam-2.0-announcement-seen'

export function ChapCam2Announcement() {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    // Affiche le popup une seule fois par client (jusqu'a fermeture).
    try {
      const seen = localStorage.getItem(ANNOUNCEMENT_KEY)
      if (!seen) {
        // Petit delai pour laisser le dashboard s'afficher avant le popup.
        const t = setTimeout(() => setOpen(true), 600)
        return () => clearTimeout(t)
      }
    } catch {
      setOpen(true)
    }
  }, [])

  const dismiss = () => {
    try {
      localStorage.setItem(ANNOUNCEMENT_KEY, '1')
    } catch {
      // ignore
    }
    setOpen(false)
  }

  const goToRecharge = () => {
    dismiss()
    router.push('/dashboard/plans')
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-primary/40 bg-card shadow-[0_0_50px_rgba(16,185,129,0.25)]">
        <button
          onClick={dismiss}
          className="absolute right-4 top-4 z-10 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Fermer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* En-tete */}
        <div className="flex flex-col items-center bg-gradient-to-br from-primary/20 to-primary/5 px-6 pb-6 pt-10 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Sparkles className="h-8 w-8" />
          </div>
          <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">
            <Zap className="h-3.5 w-3.5" />
            Nouveau · Sorti le 17 juillet
          </span>
          <h2 className="text-balance text-2xl font-bold text-foreground">
            ChapCam 2.0 est disponible
          </h2>
          <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
            Notre nouveau logiciel est teste et pret. Recharge ton compte pour en profiter des
            maintenant.
          </p>
        </div>

        {/* Nouveautes */}
        <div className="space-y-3 px-6 py-6">
          <div className="flex items-center gap-3 rounded-2xl border border-hairline bg-muted/50 px-4 py-3">
            <Monitor className="h-5 w-5 flex-shrink-0 text-primary" />
            <span className="text-sm text-foreground">Compatible avec tout type de PC</span>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-hairline bg-muted/50 px-4 py-3">
            <Palette className="h-5 w-5 flex-shrink-0 text-primary" />
            <span className="text-sm text-foreground">Change meme la couleur de peau</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 px-6 pb-6">
          <button
            onClick={goToRecharge}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voir les recharges
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            onClick={dismiss}
            className="w-full rounded-2xl py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Plus tard
          </button>
        </div>
      </div>
    </div>
  )
}
