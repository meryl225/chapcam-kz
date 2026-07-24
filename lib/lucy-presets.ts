// ---------------------------------------------------------------------------
// Presets de scenes Lucy 2.5 (Decart) appliques A CHAUD pendant le Live Swap.
// Chaque preset est un prompt en anglais (le modele repond mieux en anglais)
// combine a l'intention de swap pour conserver l'avatar selectionne.
// Reserve aux offres VIP (VIP PRO "ultimate" et VIP DEBOUT "vipdebout").
// ---------------------------------------------------------------------------

/** Offres qui debloquent le Studio Lucy 2.5 (prompts en direct). */
export const VIP_PLANS = new Set(['ultimate', 'vipdebout'])

export function isVipPlan(plan: string | null | undefined): boolean {
  return VIP_PLANS.has(String(plan || '').toLowerCase())
}

/**
 * Rappel de swap ajoute EN FIN de prompt (apres la scene).
 * La scene est placee en PREMIER pour que le decor/fond/style change reellement.
 * L'image de reference de l'avatar est RENVOYEE a chaque changement de scene
 * (voir setLivePrompt -> client.set({ image, prompt })) : c'est elle qui porte
 * l'identite du visage. Ce rappel textuel court renforce le swap sans dominer
 * la scene, pour que decor + visage swappe coexistent.
 */
export const BASE_SWAP_INTENT =
  'Keep the same person from the reference image (same face and identity, face swap), with natural movements and expressions.'

export interface LucyPreset {
  id: string
  label: string
  /** Modificateur de scene ajoute au prompt de base. */
  prompt: string
}

export interface LucyPresetCategory {
  id: string
  label: string
  presets: LucyPreset[]
}

/** Construit le prompt final envoye a Lucy : SCENE d'abord, rappel identite ensuite. */
export function buildScenePrompt(scenePrompt: string): string {
  return `${scenePrompt} ${BASE_SWAP_INTENT}`.trim()
}

export const LUCY_PRESET_CATEGORIES: LucyPresetCategory[] = [
  {
    id: 'decor',
    label: 'Décors',
    presets: [
      { id: 'nightclub', label: 'Boîte de nuit', prompt: 'Set the scene in a luxury nightclub with colorful neon lights, bokeh, and a party atmosphere.' },
      { id: 'beach', label: 'Plage tropicale', prompt: 'Place the person on a sunny tropical beach with palm trees, turquoise water and warm golden light.' },
      { id: 'penthouse', label: 'Penthouse', prompt: 'Set the scene in a luxury penthouse at night with a city skyline through large windows.' },
      { id: 'studio', label: 'Studio photo', prompt: 'Place the person in a professional photo studio with a clean seamless backdrop and soft studio lighting.' },
      { id: 'office', label: 'Bureau chic', prompt: 'Set the scene in a modern upscale office with elegant lighting and a professional look.' },
      { id: 'street', label: 'Rue urbaine', prompt: 'Place the person on a vibrant city street at dusk with neon signs and cinematic lighting.' },
      { id: 'hotel', label: 'Hôtel de luxe', prompt: 'Completely replace the entire background and environment with a grand luxury hotel lobby: polished marble floors, large crystal chandeliers, golden columns, and elegant warm lighting.' },
      { id: 'airport', label: 'Aéroport', prompt: 'Completely replace the entire background and environment with a modern airport terminal: huge floor-to-ceiling windows, airplanes visible on the tarmac outside, rows of seats and bright daylight.' },
    ],
  },
  {
    id: 'style',
    label: 'Styles',
    presets: [
      { id: 'cinematic', label: 'Cinéma', prompt: 'Apply a cinematic film look with dramatic lighting, shallow depth of field and rich color grading.' },
      { id: 'anime', label: 'Anime', prompt: 'Render the scene in a high quality anime art style with clean lines and vivid colors.' },
      { id: 'cyberpunk', label: 'Cyberpunk', prompt: 'Apply a cyberpunk aesthetic with neon magenta and cyan lighting, futuristic and moody.' },
      { id: 'noir', label: 'Noir & blanc', prompt: 'Render in dramatic high-contrast black and white with film-noir lighting.' },
      { id: 'vintage', label: 'Vintage 90s', prompt: 'Apply a nostalgic 1990s film look with warm grain and retro colors.' },
      { id: 'luxury', label: 'Luxe doré', prompt: 'Apply a glamorous luxury look with warm golden tones and elegant soft lighting.' },
    ],
  },
  {
    id: 'effects',
    label: 'Effets',
    presets: [
      { id: 'snow', label: 'Neige', prompt: 'Add gently falling snow and a cold winter atmosphere with soft blue light.' },
      { id: 'rain', label: 'Pluie', prompt: 'Add cinematic rain with reflections and a moody atmosphere.' },
      { id: 'fire', label: 'Braises', prompt: 'Add warm floating embers and a dramatic fiery glow around the person.' },
      { id: 'confetti', label: 'Confettis', prompt: 'Add colorful falling confetti and a festive celebration atmosphere.' },
      { id: 'smoke', label: 'Fumée néon', prompt: 'Add colorful neon-lit haze and atmospheric smoke around the person.' },
      { id: 'sparkle', label: 'Étincelles', prompt: 'Add magical golden sparkles and a dreamy glowing bokeh atmosphere.' },
    ],
  },
  {
    id: 'background',
    label: 'Arrière-plans',
    presets: [
      { id: 'blur', label: 'Flou bokeh', prompt: 'Replace the background with a soft blurred bokeh background, keeping the person sharp.' },
      { id: 'gradient', label: 'Dégradé studio', prompt: 'Replace the background with a smooth studio gradient in complementary colors.' },
      { id: 'space', label: 'Espace', prompt: 'Replace the background with a stunning outer space scene full of stars and nebulae.' },
      { id: 'nature', label: 'Nature', prompt: 'Replace the background with a lush green nature landscape and soft daylight.' },
      { id: 'green', label: 'Fond vert', prompt: 'Replace the background with a clean solid chroma-key green screen.' },
      { id: 'city', label: 'Skyline nuit', prompt: 'Replace the background with a glowing night city skyline with bokeh lights.' },
    ],
  },
]
