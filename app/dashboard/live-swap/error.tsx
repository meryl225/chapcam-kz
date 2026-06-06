'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RotateCcw, ArrowLeft } from 'lucide-react'

/**
 * Error Boundary App Router pour la page Live Swap.
 *
 * Avant, la moindre erreur runtime (ex: une lib tierce qui lit `.status` sur
 * une reponse 400 undefined) faisait planter TOUT l'arbre React : dans l'app
 * desktop ChapCam cela donnait l'ecran blanc "This page couldn't load".
 *
 * Ce composant intercepte ces erreurs et affiche un message clair + un bouton
 * "Reessayer" (reset()) au lieu de casser toute l'application.
 */
export default function LiveSwapError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[live-swap] Erreur capturee par l\'Error Boundary:', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10">
        <AlertTriangle className="h-8 w-8 text-red-500" />
      </div>

      <h1 className="text-balance text-xl font-bold text-foreground md:text-2xl">
        Le Live Swap n&apos;a pas pu se charger
      </h1>
      <p className="mt-2 max-w-md text-pretty text-sm leading-relaxed text-muted-foreground">
        Une erreur est survenue pendant le chargement de la page. Tes points et
        ton compte ne sont pas affectes. Tu peux reessayer maintenant.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <RotateCcw className="h-4 w-4" />
          Reessayer
        </button>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl border border-hairline bg-muted px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-hairline-strong"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au tableau de bord
        </Link>
      </div>

      {error?.digest && (
        <p className="mt-6 text-xs text-text-faint">Code erreur : {error.digest}</p>
      )}
    </div>
  )
}
