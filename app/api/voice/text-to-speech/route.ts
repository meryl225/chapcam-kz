import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1'
const OUTPUT_FORMAT = 'mp3_44100_128'
const MAX_TEXT_LENGTH = 5000

// Modeles TTS reels acceptes. Multilingue v2 = qualite/naturel maximum (defaut).
const ALLOWED_MODELS = new Set(['eleven_multilingual_v2', 'eleven_turbo_v2_5', 'eleven_flash_v2_5'])

function getApiKey(): string {
  return process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_API_KEY || ''
}

function clamp(n: unknown, min: number, max: number, fallback: number): number {
  const v = Number(n)
  return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback
}

/**
 * Texte -> voix (ElevenLabs Text-to-Speech). La cle reste cote serveur ; le
 * client ne recoit qu'un flux MP3. Reglages bornes cote serveur pour un rendu
 * naturel, humain et expressif (pas robotique).
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const apiKey = getApiKey()
  if (!apiKey) {
    return NextResponse.json({ error: 'Clé API ElevenLabs manquante côté serveur.' }, { status: 500 })
  }

  let body: {
    text?: string
    voiceId?: string
    modelId?: string
    languageCode?: string
    stability?: number
    similarity?: number
    style?: number
    speed?: number
    speakerBoost?: boolean
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
  }

  const text = (body.text || '').trim()
  const voiceId = (body.voiceId || '').trim()
  if (!text) return NextResponse.json({ error: 'Le texte est vide.' }, { status: 400 })
  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json({ error: `Texte trop long (max ${MAX_TEXT_LENGTH} caractères).` }, { status: 400 })
  }
  if (!voiceId) return NextResponse.json({ error: 'Aucune voix sélectionnée.' }, { status: 400 })

  const modelId = ALLOWED_MODELS.has(body.modelId || '') ? (body.modelId as string) : 'eleven_multilingual_v2'

  // Reglages par defaut optimises pour une voix naturelle et expressive.
  const stability = clamp(body.stability, 0, 1, 0.5)
  const similarity = clamp(body.similarity, 0, 1, 0.85)
  const style = clamp(body.style, 0, 1, 0.2)
  const speed = clamp(body.speed, 0.7, 1.2, 1)
  const speakerBoost = body.speakerBoost !== false

  const payload: Record<string, unknown> = {
    text,
    model_id: modelId,
    voice_settings: {
      stability,
      similarity_boost: similarity,
      style,
      use_speaker_boost: speakerBoost,
      speed,
    },
  }

  // Force la langue quand fournie (ex: "fr" pour un texte francais).
  const lang = (body.languageCode || '').trim().toLowerCase()
  if (lang) payload.language_code = lang

  try {
    const res = await fetch(`${ELEVENLABS_BASE}/text-to-speech/${encodeURIComponent(voiceId)}?output_format=${OUTPUT_FORMAT}`, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => '')
      return NextResponse.json(
        { error: `ElevenLabs a refusé la génération (HTTP ${res.status}). ${detail.slice(0, 200)}` },
        { status: 502 },
      )
    }

    return new NextResponse(res.body, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 })
  }
}
