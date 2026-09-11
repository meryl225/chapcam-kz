import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveVoiceMessageBalance } from '@/lib/voice-message-access'
import { deductVoiceMessageCredits } from '@/lib/voice-message-quota'
import { logToolUsage } from '@/lib/tool-usage'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1'
const OUTPUT_FORMAT = 'mp3_44100_128'
// Message vocal plafonne a 15 s : 4 Mo couvrent largement 15 s dans tous les
// formats (webm/opus, mp4, ogg) tout en bornant l'abus et le cout ElevenLabs.
const MAX_AUDIO_BYTES = 4 * 1024 * 1024

const ALLOWED_MODELS = new Set(['eleven_multilingual_sts_v2', 'eleven_english_sts_v2'])

function getApiKey(): string {
  return process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_API_KEY || ''
}

function clamp(n: unknown, min: number, max: number, fallback: number): number {
  const v = Number(n)
  return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback
}

/**
 * Voix -> voix (ElevenLabs Speech-to-Speech / Voice Changer). Transforme le
 * TIMBRE tout en conservant au maximum l'intonation, le rythme, les emotions,
 * les pauses, les respirations, les rires, les chuchotements et la maniere de
 * parler de l'enregistrement d'origine. Modele multilingue par defaut (garde la
 * langue et les mots). Reduction de bruit activee. Sortie MP3.
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

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
  }

  const voiceId = String(form.get('voiceId') || '').trim()
  const audio = form.get('audio')
  if (!voiceId) return NextResponse.json({ error: 'Aucune voix cible sélectionnée.' }, { status: 400 })
  if (!(audio instanceof Blob) || audio.size === 0) {
    return NextResponse.json({ error: 'Aucun enregistrement audio fourni.' }, { status: 400 })
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: 'Message trop long ou trop volumineux (15 s max).' }, { status: 413 })
  }

  // Acces reserve aux abonnes : verifier le solde de messages vocaux (pool
  // partage avec le texte->voix) AVANT tout appel ElevenLabs.
  const { balance, subActive } = await resolveVoiceMessageBalance(supabase, user.id)
  if (balance < 1) {
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

  const modelId = ALLOWED_MODELS.has(String(form.get('model') || '')) ? String(form.get('model')) : 'eleven_multilingual_sts_v2'
  const stability = clamp(form.get('stability'), 0, 1, 0.5)
  const similarity = clamp(form.get('similarity'), 0, 1, 0.9)
  const style = clamp(form.get('style'), 0, 1, 0)
  const speakerBoost = String(form.get('speakerBoost') || 'true') !== 'false'
  const removeNoise = String(form.get('removeNoise') || 'true') !== 'false'

  try {
    const upstream = new FormData()
    upstream.append('audio', audio, 'message.webm')
    upstream.append('model_id', modelId)
    // Reduction de bruit : rend le changement plus propre sur un micro de telephone.
    upstream.append('remove_background_noise', removeNoise ? 'true' : 'false')
    upstream.append(
      'voice_settings',
      JSON.stringify({
        stability,
        similarity_boost: similarity,
        style,
        use_speaker_boost: speakerBoost,
      }),
    )

    const res = await fetch(`${ELEVENLABS_BASE}/speech-to-speech/${encodeURIComponent(voiceId)}?output_format=${OUTPUT_FORMAT}`, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey },
      body: upstream,
    })

    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => '')
      return NextResponse.json(
        { error: `ElevenLabs a refusé la transformation (HTTP ${res.status}). ${detail.slice(0, 200)}` },
        { status: 502 },
      )
    }

    // Deduire 1 credit UNIQUEMENT apres une transformation reussie (aucun debit
    // si ElevenLabs echoue). Le solde restant est renvoye via un en-tete.
    const remaining = await deductVoiceMessageCredits(user.id, 1)
    await logToolUsage({
      userId: user.id,
      tool: 'voice_message',
      credits: 1,
      durationSeconds: 15,
      meta: { mode: 'voice_changer' },
    })

    return new NextResponse(res.body, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
        'X-Remaining-Credits': String(Math.max(0, remaining)),
      },
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 })
  }
}
