import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1'

function getApiKey(): string {
  return process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_API_KEY || ''
}

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
    return NextResponse.json({ voices: [], error: 'Cle API ElevenLabs manquante.' }, { status: 200 })
  }

  try {
    const res = await fetch(`${ELEVENLABS_BASE}/voices`, {
      headers: { 'xi-api-key': apiKey },
      cache: 'no-store',
    })
    if (!res.ok) {
      return NextResponse.json({ voices: [], error: `ElevenLabs HTTP ${res.status}` }, { status: 200 })
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
    return NextResponse.json({ voices })
  } catch (e) {
    return NextResponse.json({ voices: [], error: (e as Error).message }, { status: 200 })
  }
}
