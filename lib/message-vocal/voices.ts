/**
 * Message Vocal - Catalogue de voix ElevenLabs (cote serveur uniquement).
 * ======================================================================
 * Recupere les VRAIES voix disponibles sur le compte ElevenLabs via l'API v2
 * et les classe en 4 categories, voix francaises EN PREMIER :
 *   1. Femmes francaises
 *   2. Hommes francais
 *   3. Femmes internationales
 *   4. Hommes internationaux
 *
 * La cle API reste cote serveur. Seules les metadonnees de voix + l'URL d'apercu
 * (preview_url, CDN public ElevenLabs) sont renvoyees au client. Aucun faux
 * voice_id : tout provient du compte reel. Le repli (fallback) n'utilise que des
 * voix "premade" ElevenLabs dont les identifiants sont stables et reels.
 */

const ELEVENLABS_BASE = 'https://api.elevenlabs.io'

function getApiKey(): string {
  return process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_API_KEY || ''
}

export type VoiceGender = 'female' | 'male' | 'neutral'
export type VoiceCategory = 'french_female' | 'french_male' | 'intl_female' | 'intl_male'

export interface CatalogVoice {
  id: string
  name: string
  shortName: string
  gender: VoiceGender
  genderLabel: string
  language: string
  languageLabel: string
  accent?: string
  accentLabel?: string
  description?: string
  previewUrl?: string
  category: VoiceCategory
  isFrench: boolean
}

export interface VoiceGroup {
  category: VoiceCategory
  label: string
  voices: CatalogVoice[]
}

export interface VoiceCatalog {
  groups: VoiceGroup[]
  total: number
  fallback: boolean
}

export const CATEGORY_ORDER: VoiceCategory[] = ['french_female', 'french_male', 'intl_female', 'intl_male']

export const CATEGORY_LABELS: Record<VoiceCategory, string> = {
  french_female: 'Femmes françaises',
  french_male: 'Hommes français',
  intl_female: 'Femmes internationales',
  intl_male: 'Hommes internationaux',
}

const LANGUAGE_LABELS: Record<string, string> = {
  fr: 'Français',
  en: 'Anglais',
  es: 'Espagnol',
  de: 'Allemand',
  it: 'Italien',
  pt: 'Portugais',
  nl: 'Néerlandais',
  ar: 'Arabe',
  pl: 'Polonais',
  ru: 'Russe',
  ja: 'Japonais',
  zh: 'Chinois',
  hi: 'Hindi',
}

const ACCENT_LABELS: Record<string, string> = {
  standard: 'France',
  parisian: 'Parisien',
  french: 'France',
  quebec: 'Québécois',
  belgian: 'Belge',
  swiss: 'Suisse',
  canadian: 'Canadien',
  american: 'Américain',
  british: 'Britannique',
  australian: 'Australien',
  irish: 'Irlandais',
  transatlantic: 'Transatlantique',
}

const GENDER_LABELS: Record<VoiceGender, string> = {
  female: 'Femme',
  male: 'Homme',
  neutral: 'Neutre',
}

// Accents de "France" prioritaires (affiches avant le quebecois/belge/suisse).
const FRANCE_ACCENTS = new Set(['standard', 'parisian', 'french'])

function labelLanguage(code?: string): string {
  if (!code) return 'Multilingue'
  return LANGUAGE_LABELS[code.toLowerCase()] || code.toUpperCase()
}

function labelAccent(accent?: string): string | undefined {
  if (!accent) return undefined
  return ACCENT_LABELS[accent.toLowerCase()] || accent.charAt(0).toUpperCase() + accent.slice(1)
}

function shortenName(name: string): string {
  // "Victoria - Warm and calm" -> "Victoria"
  return name.split(/\s+[-–—]\s+/)[0].trim() || name
}

interface RawVoice {
  voice_id: string
  name: string
  category?: string
  preview_url?: string
  labels?: Record<string, string>
  verified_languages?: { language: string }[]
}

function classify(v: RawVoice): CatalogVoice {
  const labels = v.labels || {}
  const rawGender = (labels.gender || '').toLowerCase()
  const gender: VoiceGender = rawGender === 'female' ? 'female' : rawGender === 'male' ? 'male' : rawGender === 'neutral' ? 'neutral' : 'male'

  const language = (labels.language || '').toLowerCase()
  const accent = (labels.accent || '').toLowerCase()
  const verified = (v.verified_languages || []).map((l) => l.language)

  const isFrench =
    language === 'fr' ||
    FRANCE_ACCENTS.has(accent) ||
    accent === 'quebec' ||
    accent === 'belgian' ||
    accent === 'swiss'

  const isFemale = gender === 'female'

  let category: VoiceCategory
  if (isFrench) category = isFemale ? 'french_female' : 'french_male'
  else category = isFemale ? 'intl_female' : 'intl_male'

  // Description lisible a partir des labels ElevenLabs.
  const descBits = [labels.descriptive, labels.use_case?.replace(/_/g, ' ')].filter(Boolean)
  const description = descBits.length ? descBits.join(' · ') : v.category

  return {
    id: v.voice_id,
    name: v.name,
    shortName: shortenName(v.name),
    gender,
    genderLabel: GENDER_LABELS[gender],
    language: language || (verified[0] ?? ''),
    languageLabel: labelLanguage(language || verified[0]),
    accent: accent || undefined,
    accentLabel: labelAccent(accent),
    description,
    previewUrl: v.preview_url,
    category,
    isFrench,
  }
}

// Tri interne d'une categorie : pour les groupes francais, on remonte les
// accents de France (standard/parisien) avant le quebecois/belge/suisse. Puis
// ordre alphabetique par nom court pour un rendu stable.
function sortVoices(voices: CatalogVoice[]): CatalogVoice[] {
  return [...voices].sort((a, b) => {
    const aFrance = a.accent && FRANCE_ACCENTS.has(a.accent) ? 0 : 1
    const bFrance = b.accent && FRANCE_ACCENTS.has(b.accent) ? 0 : 1
    if (aFrance !== bFrance) return aFrance - bFrance
    return a.shortName.localeCompare(b.shortName, 'fr')
  })
}

function buildGroups(voices: CatalogVoice[]): VoiceGroup[] {
  return CATEGORY_ORDER.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    voices: sortVoices(voices.filter((v) => v.category === category)),
  })).filter((g) => g.voices.length > 0)
}

/**
 * Voix de repli : uniquement des voix "premade" ElevenLabs (identifiants reels
 * et stables, disponibles sur tous les comptes). Sert quand la cle n'a pas la
 * permission de lister les voix. Aucune n'est inventee.
 */
const FALLBACK_RAW: RawVoice[] = [
  { voice_id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', labels: { gender: 'female', language: 'en', accent: 'american', descriptive: 'professional' } },
  { voice_id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice', labels: { gender: 'female', language: 'en', accent: 'british', descriptive: 'clear' } },
  { voice_id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', labels: { gender: 'female', language: 'en', accent: 'american', descriptive: 'warm' } },
  { voice_id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', labels: { gender: 'female', language: 'en', accent: 'british', descriptive: 'confident' } },
  { voice_id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', labels: { gender: 'male', language: 'en', accent: 'british', descriptive: 'mature' } },
  { voice_id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', labels: { gender: 'male', language: 'en', accent: 'american', descriptive: 'deep' } },
  { voice_id: 'cjVigY5qzO86Huf0OWal', name: 'Eric', labels: { gender: 'male', language: 'en', accent: 'american', descriptive: 'smooth' } },
  { voice_id: 'bIHbv24MWmeRgasZH58o', name: 'Will', labels: { gender: 'male', language: 'en', accent: 'american', descriptive: 'chill' } },
]

/**
 * Recupere et classe le catalogue de voix. Appele depuis un composant serveur
 * (RSC) : la cle ElevenLabs n'est jamais exposee au navigateur.
 */
export async function getVoiceCatalog(): Promise<VoiceCatalog> {
  const apiKey = getApiKey()
  if (!apiKey) {
    const voices = FALLBACK_RAW.map(classify)
    return { groups: buildGroups(voices), total: voices.length, fallback: true }
  }

  try {
    const res = await fetch(`${ELEVENLABS_BASE}/v2/voices?page_size=100`, {
      headers: { 'xi-api-key': apiKey },
      cache: 'no-store',
    })
    if (!res.ok) {
      const voices = FALLBACK_RAW.map(classify)
      return { groups: buildGroups(voices), total: voices.length, fallback: true }
    }
    const data = (await res.json()) as { voices?: RawVoice[] }
    const raw = data.voices || []
    if (raw.length === 0) {
      const voices = FALLBACK_RAW.map(classify)
      return { groups: buildGroups(voices), total: voices.length, fallback: true }
    }
    const voices = raw.map(classify)
    return { groups: buildGroups(voices), total: voices.length, fallback: false }
  } catch {
    const voices = FALLBACK_RAW.map(classify)
    return { groups: buildGroups(voices), total: voices.length, fallback: true }
  }
}
