'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Sparkles, Monitor, Smartphone, WandSparkles, Mic2, Zap, ArrowRight } from 'lucide-react'

// Version de l'annonce : incremente pour re-afficher le popup a tous les clients.
const ANNOUNCEMENT_KEY = 'chapcam-3.0-announcement-seen'

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
          <div className="mb-4 flex w-full items-center justify-center overflow-hidden rounded-2xl border border-primary/30 bg-black/50 shadow-inner">
            <video
              className="max-h-[42vh] w-full object-contain sm:max-h-[320px]"
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              aria-label="Démonstration vidéo de ChapCam 3.0"
            >
              <source src="/videos/chapcam-3-topup.mov" type="video/quicktime" />
              Votre navigateur ne prend pas en charge la vidéo de démonstration.
            </video>
          </div>
          <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">
            <Zap className="h-3.5 w-3.5" />
            Nouveau · ChapCam 3.0 disponible
          </span>
          <h2 className="text-balance text-2xl font-bold text-foreground">
            ChapCam 3.0 est disponible
          </h2>
          <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
            Une nouvelle génération d’outils créatifs est disponible. Recharge ton compte pour en profiter dès maintenant.
          </p>
        </div>

        {/* Nouveautes */}
        <div className="grid gap-3 px-6 py-6 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-2xl border border-hairline bg-muted/50 px-4 py-3">
            <WandSparkles className="h-5 w-5 flex-shrink-0 text-primary" />
            <span className="text-sm text-foreground">Genjutsu & Motion Control</span>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-hairline bg-muted/50 px-4 py-3">
            <Mic2 className="h-5 w-5 flex-shrink-0 text-primary" />
            <span className="text-sm text-foreground">Voix humaine naturelle</span>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-hairline bg-muted/50 px-4 py-3 sm:col-span-2">
            <Monitor className="h-5 w-5 flex-shrink-0 text-primary" />
            <Smartphone className="h-5 w-5 flex-shrink-0 text-primary" />
            <span className="text-sm text-foreground">Compatible téléphone et ordinateur</span>
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
