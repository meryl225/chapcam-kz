'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * useDecartNoWatermark — SCAFFOLDING DORMANT (desactive par defaut).
 *
 * But : permettre, plus tard, de produire une variante du flux transforme
 * Decart destinee a certains utilisateurs (ex: clients VIP) via un pipeline
 * canvas (drawImage -> captureStream). Tant que `enabled` est `false`, ce hook
 * est un simple PASS-THROUGH : il renvoie exactement le flux d'entree, sans
 * aucun traitement, sans cout CPU.
 *
 * IMPORTANT — comportement fail-safe :
 *   - Par defaut `enabled = false` => le flux natif Decart (avec son watermark)
 *     est renvoye tel quel.
 *   - Toute activation futur DOIT etre pilotee cote serveur (flag securise),
 *     jamais decidee cote client, pour rester inviolable.
 *
 * Ce hook n'est volontairement branche nulle part pour l'instant. Il sert de
 * point d'extension propre et reactivable sans toucher au reste du code.
 */
export interface UseDecartNoWatermarkOptions {
  /** Active le pipeline de traitement. `false` = pass-through (defaut). */
  enabled?: boolean
}

export function useDecartNoWatermark(
  inputStream: MediaStream | null,
  options: UseDecartNoWatermarkOptions = {},
): MediaStream | null {
  const { enabled = false } = options
  const [outputStream, setOutputStream] = useState<MediaStream | null>(inputStream)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    // Pass-through : tant que le pipeline est desactive ou qu'il n'y a pas de
    // flux, on renvoie l'entree inchangee. C'est le chemin par defaut.
    if (!enabled || !inputStream) {
      setOutputStream(inputStream)
      return
    }

    // --- Point d'extension futur (laisse intentionnellement inerte) ---
    // Lorsque cette fonctionnalite sera reactivee, le pipeline canvas viendra
    // ici : dessiner chaque frame du flux d'entree sur un <canvas>, puis
    // produire un nouveau flux via canvas.captureStream(). Pour l'instant, et
    // par securite, on conserve le pass-through afin de ne jamais alterer le
    // flux ni retirer le watermark natif tant que rien n'est explicitement
    // active cote serveur.
    setOutputStream(inputStream)

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [enabled, inputStream])

  // Reference conservee pour un usage canvas futur (evite un warning d'unused).
  void canvasRef

  return outputStream
}
