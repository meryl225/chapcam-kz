import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { VOICE_MESSAGE_MAX_CHARS } from '@/lib/plans'
import { resolveVoiceMessageBalance } from '@/lib/voice-message-access'
import {
  deductVoiceMessageJetons,
  mp3DurationSeconds,
  voiceMessageCostForDuration,
  VOICE_MESSAGE_COST_JETONS,
} from '@/lib/voice-message-quota'
import { logToolUsage } from '@/lib/tool-usage'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1'
const OUTPUT_FORMAT = 'mp3_44100_128'
// Message vocal plafonne a ~15 s de parole -> borne les caracteres factures.
const MAX_TEXT_LENGTH = VOICE_MESSAGE_MAX_CHARS

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

  // Acces reserve aux abonnes : verifier le solde de messages vocaux (pool
  // partage avec le changement de voix) AVANT tout appel ElevenLabs.
  const { balance, subActive } = await resolveVoiceMessageBalance(supabase, user.id)
  if (balance < VOICE_MESSAGE_COST_JETONS) {
    return NextResponse.json(
      {
        error: subActive
          ? 'Vous avez utilisé tous vos messages vocaux inclus. La recharge de crédits arrive bientôt.'
          : 'Les messages vocaux sont inclus avec un abonnement. Choisissez un forfait pour en profiter.',
        code: subActive ? 'quota_exhausted' : 'no_plan',
        remaining: 0,
      },
      { status: 402 },
    )
  }

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

    // Facturation a la duree reelle de l'audio genere, UNIQUEMENT apres succes.
    const audioBuffer = await res.arrayBuffer()
    const seconds = mp3DurationSeconds(audioBuffer.byteLength)
    const costJetons = voiceMessageCostForDuration(seconds)
    const remainingJetons = await deductVoiceMessageJetons(user.id, costJetons, {
      mode: 'tts',
      chars: text.length,
      durationSeconds: Math.round(seconds * 10) / 10,
    })
    if (remainingJetons < 0) {
      return NextResponse.json(
        {
          error: `Ce message dure ${Math.ceil(seconds)} s et coûte ${costJetons} jetons. Votre solde est insuffisant.`,
          code: 'insufficient_jetons',
          requiredJetons: costJetons,
        },
        { status: 402 },
      )
    }
    const remaining = Math.max(0, Math.floor(remainingJetons / VOICE_MESSAGE_COST_JETONS))
    await logToolUsage({
      userId: user.id,
      tool: 'voice_message',
      credits: costJetons / VOICE_MESSAGE_COST_JETONS,
      durationSeconds: Math.ceil(seconds),
      meta: { mode: 'tts', chars: text.length, costJetons, walletAlreadyCharged: true },
    })

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
        'X-Remaining-Credits': String(remaining),
        'X-Remaining-Jetons': String(Math.max(0, remainingJetons)),
        'X-Charged-Jetons': String(costJetons),
        'X-Audio-Duration': String(Math.round(seconds * 10) / 10),
      },
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 })
  }
}
