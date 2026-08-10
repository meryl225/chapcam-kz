// ============================================================
// Tarifs fournisseur ESTIMES (en USD) pour les outils IA ChapCam.
// Ces constantes servent uniquement au suivi/rapprochement cote admin : elles
// estiment ce que CHAQUE generation coute chez le fournisseur (HeyGen, fal.ai),
// afin de rapprocher la facture reelle et de voir quel utilisateur consomme quoi.
// Elles n'ont AUCUN impact sur les credits factures aux utilisateurs.
//
// Ajuste ces valeurs si les tarifs fournisseur changent :
//   - HeyGen Avatar IV (photo -> video) : ~0,05 $/seconde de video produite.
//   - HeyGen Video Translation v3 : ~0,033 $/s (Rapide), ~0,067 $/s (Precision),
//     factures a la duree de la video SOURCE.
//   - fal.ai Kling Motion Control : cout au clip (~10 s max).
// ============================================================

export type ToolName = 'photo_video' | 'motion' | 'translation'

export const TOOL_LABELS: Record<ToolName, string> = {
  photo_video: 'Studio Photo en Vidéo',
  motion: 'Motion',
  translation: 'Traduction Vidéo',
}

// Parametres de cout par outil (modifiables).
export const TOOL_PROVIDER_COST = {
  photo_video: {
    perSecondUsd: 0.05,
    defaultDurationSeconds: 30, // la route photo-video produit des clips de 30 s
  },
  translation: {
    perSecondUsd: 0.0333, // mode Rapide
    precisionPerSecondUsd: 0.0667, // mode Precision (meilleure synchro labiale)
    defaultDurationSeconds: 60, // source plafonnee a 60 s
  },
  motion: {
    flatUsd: 0.35, // estimation par clip de motion-transfer
  },
} as const

/**
 * Estime le cout fournisseur (USD) d'une generation.
 * @param tool  Outil concerne.
 * @param opts  durationSeconds : duree reelle si connue (sinon defaut de l'outil).
 *              precision : true pour la traduction en mode Precision.
 */
export function estimateToolCostUsd(
  tool: ToolName,
  opts?: { durationSeconds?: number; precision?: boolean },
): number {
  let usd = 0
  if (tool === 'photo_video') {
    const c = TOOL_PROVIDER_COST.photo_video
    const seconds = opts?.durationSeconds ?? c.defaultDurationSeconds
    usd = seconds * c.perSecondUsd
  } else if (tool === 'translation') {
    const c = TOOL_PROVIDER_COST.translation
    const seconds = opts?.durationSeconds ?? c.defaultDurationSeconds
    const rate = opts?.precision ? c.precisionPerSecondUsd : c.perSecondUsd
    usd = seconds * rate
  } else if (tool === 'motion') {
    usd = TOOL_PROVIDER_COST.motion.flatUsd
  }
  // Arrondi au centime.
  return Math.round(usd * 100) / 100
}
