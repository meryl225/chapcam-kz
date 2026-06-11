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
 */
const FALLBACK_VOICES = [
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', description: 'Femme - calme, narration' },
  { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', description: 'Femme - energique' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', description: 'Femme - douce' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', description: 'Homme - chaleureux' },
  { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli', description: 'Femme - jeune' },
  { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', description: 'Homme - profond' },
  { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', description: 'Homme - assure' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', description: 'Homme - narration' },
  { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam', description: 'Homme - dynamique' },
  { id: 'CYw3kZ02Hs0563khs1Fj', name: 'Dave', description: 'Homme - conversationnel' },
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
