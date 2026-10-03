// ============================================================
// Tarifs fournisseur ESTIMES (en USD) pour les outils IA ChapCam.
// Elles estiment ce que CHAQUE generation coute chez le fournisseur et servent
// au rapprochement admin. Photo en Video, Genjutsu / Motion Control, Traduction
// et ChapVerify sont factures en Jetons a ce cout x PROVIDER_MARGIN_MULTIPLIER.
//
// Ajuste ces valeurs si les tarifs fournisseur changent :
//   - HeyGen Avatar IV (photo -> video) : ~0,05 $/seconde de video produite.
//   - HeyGen Video Translation v3 : ~0,033 $/s (Rapide), ~0,067 $/s (Precision),
//     factures a la duree de la video SOURCE.
//   - Kling 3.0 Motion Control : 0,0714 $/seconde, plafonne a 10 s.
// ============================================================

export type ToolName = 'photo_video' | 'motion' | 'translation' | 'chapverify' | 'voice_message'

// Prix client = cout fournisseur (HeyGen, Higgsfield, Resemble) x 2,5, facture a la duree.
export const PROVIDER_MARGIN_MULTIPLIER = 2.5
// Doit rester egal a JETONS_PER_USD de lib/jetons.ts (server-only), utilise pour l'affichage.
export const DISPLAY_JETONS_PER_USD = 60

const round4 = (value: number) => Math.round(value * 10000) / 10000

export function applyProviderMargin(providerCostUsd: number) {
  return round4(round4(providerCostUsd) * PROVIDER_MARGIN_MULTIPLIER)
}

export function usdToDisplayJetons(customerPriceUsd: number) {
  return Math.max(1, Math.ceil(Math.max(0, customerPriceUsd) * DISPLAY_JETONS_PER_USD))
}

export const GENJUTSU_MARGIN_MULTIPLIER = PROVIDER_MARGIN_MULTIPLIER
export const GENJUTSU_MAX_DURATION_SECONDS = 30
// 10 secondes = 3250 FCFA, soit 325 FCFA par seconde.
export const GENJUTSU_PROVIDER_COST_PER_SECOND_USD = 0.2708333333

export type GenjutsuModel = 'genjutsu'
export type GenjutsuQuality = '720p' | '1080p'

export function estimateGenjutsuPriceUsd(model: string, quality: GenjutsuQuality, durationSeconds = GENJUTSU_MAX_DURATION_SECONDS) {
  const duration = Math.min(GENJUTSU_MAX_DURATION_SECONDS, Math.max(1, Math.floor(durationSeconds)))
  const providerCostUsd = round4(GENJUTSU_PROVIDER_COST_PER_SECOND_USD * duration)
  const customerPriceUsd = applyProviderMargin(providerCostUsd)
  return { providerCostUsd, customerPriceUsd, durationSeconds: duration, quality, model }
}

// Motion Control (Higgsfield kling3) : meme tarif a la seconde que Genjutsu, 10 s max.
export const MOTION_CONTROL_MAX_SECONDS = 10

export function genjutsuJetons(durationSeconds: number) {
  return usdToDisplayJetons(estimateGenjutsuPriceUsd('genjutsu', '720p', durationSeconds).customerPriceUsd)
}

export function estimatePhotoVideoPriceUsd(durationSeconds: number) {
  const providerCostUsd = round4(durationSeconds * TOOL_PROVIDER_COST.photo_video.perSecondUsd)
  return { providerCostUsd, customerPriceUsd: applyProviderMargin(providerCostUsd) }
}

export function photoVideoJetons(durationSeconds: number) {
  return usdToDisplayJetons(estimatePhotoVideoPriceUsd(durationSeconds).customerPriceUsd)
}

export const TRANSLATION_BILLING_MAX_SECONDS = 60

export function estimateTranslationPriceUsd(durationSeconds: number, precision: boolean) {
  const seconds = Math.min(TRANSLATION_BILLING_MAX_SECONDS, Math.max(1, Math.ceil(durationSeconds)))
  const c = TOOL_PROVIDER_COST.translation
  const providerCostUsd = round4(seconds * (precision ? c.precisionPerSecondUsd : c.perSecondUsd))
  return { providerCostUsd, customerPriceUsd: applyProviderMargin(providerCostUsd), durationSeconds: seconds }
}

export function translationJetons(durationSeconds: number, precision: boolean) {
  return usdToDisplayJetons(estimateTranslationPriceUsd(durationSeconds, precision).customerPriceUsd)
}

export type ChapVerifyMediaKind = 'image' | 'audio' | 'video'
// Resemble analyse au plus CHAPVERIFY_BILLING_MAX_SECONDS (max_video_secs / end_region).
export const CHAPVERIFY_BILLING_MAX_SECONDS = 8

export function estimateChapVerifyPriceUsd(media: ChapVerifyMediaKind, durationSeconds = CHAPVERIFY_BILLING_MAX_SECONDS) {
  const c = TOOL_PROVIDER_COST.chapverify
  const seconds = media === 'image' ? 0 : Math.min(CHAPVERIFY_BILLING_MAX_SECONDS, Math.max(1, Math.ceil(durationSeconds)))
  const providerCostUsd = round4(
    media === 'image' ? c.imageUsd : seconds * (media === 'video' ? c.videoPerSecondUsd : c.audioPerSecondUsd),
  )
  return { providerCostUsd, customerPriceUsd: applyProviderMargin(providerCostUsd), durationSeconds: seconds }
}

export function chapVerifyJetons(media: ChapVerifyMediaKind, durationSeconds = CHAPVERIFY_BILLING_MAX_SECONDS) {
  return usdToDisplayJetons(estimateChapVerifyPriceUsd(media, durationSeconds).customerPriceUsd)
}

export const TOOL_LABELS: Record<ToolName, string> = {
  photo_video: 'Studio Photo en Vidéo',
  motion: 'Motion',
  translation: 'Traduction Vidéo',
  chapverify: 'ChapVerify',
  voice_message: 'Message Vocal',
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
    perSecondUsd: 0.0714, // Kling 3.0 : tarif fournisseur fourni, après remise
    maxDurationSeconds: 10,
  },
  chapverify: {
    // Resemble Detect, forfait Flex (pay-as-you-go).
    imageUsd: 0.035,
    audioPerSecondUsd: 0.035,
    videoPerSecondUsd: 0.07,
  },
  voice_message: {
    flatUsd: 0.06, // ~15 s ElevenLabs (TTS ~240 car. ou voix->voix ~15 s)
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
  opts?: { durationSeconds?: number; precision?: boolean; media?: ChapVerifyMediaKind },
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
    const seconds = Math.min(TOOL_PROVIDER_COST.motion.maxDurationSeconds, Math.max(1, opts?.durationSeconds ?? TOOL_PROVIDER_COST.motion.maxDurationSeconds))
    usd = seconds * TOOL_PROVIDER_COST.motion.perSecondUsd
  } else if (tool === 'chapverify') {
    usd = estimateChapVerifyPriceUsd(opts?.media ?? 'video', opts?.durationSeconds).providerCostUsd
  } else if (tool === 'voice_message') {
    usd = TOOL_PROVIDER_COST.voice_message.flatUsd
  }
  // Arrondi au centime.
  return Math.round(usd * 100) / 100
}
