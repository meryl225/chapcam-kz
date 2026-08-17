"use client"

import { useEffect } from "react"
import { motion } from "framer-motion"

/**
 * Sentinelle "framer-motion operationnel".
 *
 * Pose la classe `mo-anim` sur <html> UNIQUEMENT quand framer-motion s'est
 * reellement charge et hydrate cote client. Le CSS (globals.css) garde tout le
 * contenu des sections `.mo-belowfold` VISIBLE par defaut tant que `mo-anim`
 * est absent ; une fois pose, framer reprend la main sur les animations au
 * scroll.
 *
 * Ce composant REND un noeud framer (`motion.span` inerte, masque) : ainsi il
 * PARTAGE le meme chunk que framer-motion. Si ce bundle echoue a se charger
 * (reseau coupe, Safari lockdown, JS desactive...), ce composant ne s'hydrate
 * pas, l'effet ne s'execute pas, `mo-anim` n'est jamais pose, et le contenu
 * reste visible en permanence. Aucun delai n'est utilise.
 */
export function MotionReady() {
  useEffect(() => {
    document.documentElement.classList.add("mo-anim")
  }, [])

  return <motion.span aria-hidden style={{ display: "none" }} />
}
