import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1'

function getApiKey(): string {
  return process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_API_KEY || ''
}

/**
 * Voix "premade" publiques d'ElevenLabs (IDs stables, disponibles sur tous les
 * comptes). Sert de secours quand la cle API n'a pas la permission voices_read,
 * pour que la liste ne soit jamais vide. La conversion speech-to-speech accepte
 * directement ces voice_id.
 *
 * IMPORTANT : le voice swap est du speech-to-speech (modele multilingue). Il
 * conserve la LANGUE et les mots de la personne : si vous parlez francais, la
 * sortie est en francais. Ces voix ne changent que le TIMBRE. Toutes ont ete
 * verifiees comme accessibles en STS avec la cle du projet.
 *
 * Pour de vraies voix a accent FRANCAIS natif : donner la permission
 * "voices_read" a la cle ElevenLabs et ajouter des voix francaises depuis la
 * Voice Library ElevenLabs -> elles apparaitront alors automatiquement ici.
 */
const FALLBACK_VOICES = [
  // Voix feminines (roster moderne, rendu naturel en francais)
  { id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte', description: 'Femme - douce, multilingue (bon rendu FR)', locale: 'fr' },
  { id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice', description: 'Femme - claire et posee', locale: 'fr' },
  { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', description: 'Femme - chaleureuse', locale: 'fr' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', description: 'Femme - jeune, dynamique', locale: 'fr' },
  { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', description: 'Femme - expressive', locale: 'fr' },
  { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', description: 'Femme - conversationnelle', locale: 'fr' },
  // Voix masculines
  { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', description: 'Homme - profond, narration', locale: 'fr' },
  { id: 'bIHbv24MWmeRgasZH58o', name: 'Will', description: 'Homme - naturel', locale: 'fr' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', description: 'Homme - jeune, assure', locale: 'fr' },
  { id: 'cjVigY5qzO86Huf0OWal', name: 'Eric', description: 'Homme - posé', locale: 'fr' },
  { id: 'iP95p4xoKVk53GoZ742B', name: 'Chris', description: 'Homme - decontracte', locale: 'fr' },
  { id: 'pqHfZKP75CvOlQylNhV4', name: 'Bill', description: 'Homme - mature', locale: 'fr' },
]

/**
 * Liste les voix cibles ElevenLabs. Tourne cote serveur web (la cle API y est
 * disponible), ce qui permet a la page Voice Swap d'afficher des voix meme dans
 * l'app de bureau qui n'embarque pas la cle.
 */
export async function GET() {
  // Auth : seul un utilisateur connecte peut lister les voix.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })
  }

  const apiKey = getApiKey()
  if (!apiKey) {
    return NextResponse.json({ voices: FALLBACK_VOICES, fallback: true })
  }

  try {
    const res = await fetch(`${ELEVENLABS_BASE}/voices`, {
      headers: { 'xi-api-key': apiKey },
      cache: 'no-store',
    })
    if (!res.ok) {
      // Cle restreinte (ex: permission voices_read manquante) -> voix par defaut.
      return NextResponse.json({ voices: FALLBACK_VOICES, fallback: true })
    }
    const data = await res.json()
    const voices = (data.voices || []).map(
      (v: { voice_id: string; name: string; category?: string; labels?: Record<string, string> }) => ({
        id: v.voice_id,
        name: v.name,
        description: v.labels ? Object.values(v.labels).join(', ') : v.category,
        locale: v.labels?.language,
      }),
    )
    if (voices.length === 0) {
      return NextResponse.json({ voices: FALLBACK_VOICES, fallback: true })
    }
    return NextResponse.json({ voices })
  } catch {
    return NextResponse.json({ voices: FALLBACK_VOICES, fallback: true })
  }
}
