'use client'

import { useEffect } from 'react'

// Ecran de secours au niveau des pages (conserve les providers du layout).
// Capture les erreurs de rendu/chargement d'une page et propose de reessayer,
// au lieu de laisser un ecran vide sur le fond sombre.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Trace cote client pour diagnostic (visible dans la console navigateur).
    console.log('[v0] Page error boundary:', error?.message, error?.digest)
  }, [error])

  return (
    <main className="relative z-50 flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md text-center">
        <div className="mb-3 bg-gradient-to-r from-[#00ff88] to-[#00d4ff] bg-clip-text text-xl font-extrabold text-transparent">
          ChapCam
        </div>
        <h1 className="mb-2 text-xl font-bold text-foreground text-balance">
          La page n&apos;a pas pu s&apos;afficher
        </h1>
        <p className="mb-6 text-sm leading-relaxed text-muted-foreground text-pretty">
          Une erreur temporaire est survenue, souvent liee a une connexion
          instable. Reessaie : le contenu se rechargera correctement.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            onClick={() => reset()}
            className="rounded-xl bg-[#00ff88] px-6 py-3 text-sm font-bold text-[#0a0e1a] transition-opacity hover:opacity-90"
          >
            Reessayer
          </button>
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl border border-white/20 bg-transparent px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-white/5"
          >
            Recharger la page
          </button>
        </div>
      </div>
    </main>
  )
}
