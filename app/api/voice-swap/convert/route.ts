import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1'
const STS_OUTPUT_FORMAT = 'pcm_16000'
const TARGET_SAMPLE_RATE = 16000

function getApiKey(): string {
  return process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_API_KEY || ''
}

/** Construit un conteneur WAV (PCM 16-bit) autour du PCM brut recu. */
function pcmToWav(pcm: Buffer, sampleRate = TARGET_SAMPLE_RATE, channels = 1, bitDepth = 16): Buffer {
  const blockAlign = (channels * bitDepth) / 8
  const byteRate = sampleRate * blockAlign
  const dataSize = pcm.length
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + dataSize, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(channels, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(byteRate, 28)
  header.writeUInt16LE(blockAlign, 32)
  header.writeUInt16LE(bitDepth, 34)
  header.write('data', 36)
  header.writeUInt32LE(dataSize, 40)
  return Buffer.concat([header, pcm])
}

function adminClient() {
  return createAdminClient()
}

/**
 * Convertit UN segment audio (PCM 16-bit 16kHz mono) via ElevenLabs
 * speech-to-speech, decremente le solde de minutes de l'utilisateur, et renvoie
 * le PCM converti. Tourne cote serveur web ou la cle ElevenLabs est disponible.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Non authentifie' }, { status: 401 })
  }

  const apiKey = getApiKey()
  if (!apiKey) {
    // 500 (et non 200) pour que le moteur remonte l'erreur au lieu de jouer la
    // reponse JSON comme si c'etait de l'audio (source de "voix pas nette").
    return NextResponse.json({ ok: false, error: 'Cle API ElevenLabs manquante cote serveur.' }, { status: 500 })
  }

  const url = new URL(request.url)
  const voiceId = url.searchParams.get('voiceId') || ''
  if (!voiceId) {
    return NextResponse.json({ ok: false, error: 'Aucune voix cible selectionnee.' }, { status: 400 })
  }

  // --- Reglages issus du mode de streaming (valides et bornes cote serveur) ---
  const ALLOWED_MODELS = ['eleven_multilingual_sts_v2', 'eleven_english_sts_v2']
  const reqModel = url.searchParams.get('model') || ''
  const modelId = ALLOWED_MODELS.includes(reqModel) ? reqModel : 'eleven_multilingual_sts_v2'

  const clamp01 = (raw: string | null, fallback: number) => {
    const n = Number(raw)
    return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : fallback
  }
  const stability = clamp01(url.searchParams.get('stability'), 0.65)
  const similarityBoost = clamp01(url.searchParams.get('similarity'), 0.85)
  const style = clamp01(url.searchParams.get('style'), 0)
  const useSpeakerBoost = url.searchParams.get('speakerBoost') === '1'
  const latencyRaw = Number(url.searchParams.get('latency'))
  const optimizeLatency = Number.isFinite(latencyRaw)
    ? Math.min(4, Math.max(0, Math.round(latencyRaw)))
    : 4

  // Verifie le solde de minutes (produit ChapVoice).
  const admin = adminClient()
  const { data: sub } = await admin
    .from('voice_subscriptions')
    .select('id, seconds_remaining, expires_at')
    .eq('user_id', user.id)
    .maybeSingle()

  const expired = sub?.expires_at ? new Date(sub.expires_at) < new Date() : false
  const secondsLeft = expired ? 0 : sub?.seconds_remaining ?? 0
  if (!sub || secondsLeft <= 0) {
    return NextResponse.json({ ok: false, error: 'Minutes epuisees. Recharge une offre ChapVoice.' }, { status: 402 })
  }

  const pcm = Buffer.from(await request.arrayBuffer())
  if (pcm.length === 0) {
    return NextResponse.json({ ok: false, error: 'Segment vide.' }, { status: 400 })
  }

  const t0 = Date.now()
  try {
    const wav = pcmToWav(pcm)
    const form = new FormData()
    form.append('audio', new Blob([new Uint8Array(wav)], { type: 'audio/wav' }), 'segment.wav')
    form.append('model_id', modelId)
    // Debruitage desactive : le micro applique deja son propre traitement cote
    // client, et cette option ajoute une passe (donc de la latence) chez ElevenLabs.
    form.append('remove_background_noise', 'false')
    // Reglages issus du mode de streaming choisi dans l'UI (deja bornes plus haut).
    form.append(
      'voice_settings',
      JSON.stringify({
        stability,
        similarity_boost: similarityBoost,
        style,
        use_speaker_boost: useSpeakerBoost,
      }),
    )

    const apiUrl =
      `${ELEVENLABS_BASE}/speech-to-speech/${encodeURIComponent(voiceId)}/stream` +
      `?output_format=${STS_OUTPUT_FORMAT}&optimize_streaming_latency=${optimizeLatency}`

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey },
      body: form,
    })

    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => '')
      return NextResponse.json(
        { ok: false, error: `ElevenLabs HTTP ${res.status} ${detail.slice(0, 160)}` },
        { status: 502 },
      )
    }

    const rttMs = Date.now() - t0

    // Decremente le solde : duree de l'audio source (en secondes, arrondie au sup).
    // Calcule AVANT le streaming (la taille du segment source est deja connue).
    const segmentSeconds = Math.max(1, Math.ceil(pcm.length / 2 / TARGET_SAMPLE_RATE))
    const newRemaining = Math.max(0, secondsLeft - segmentSeconds)
    await admin
      .from('voice_subscriptions')
      .update({ seconds_remaining: newRemaining, updated_at: new Date().toISOString() })
      .eq('id', sub.id)

    // Streaming direct du PCM converti vers le client : la lecture peut demarrer
    // des les premiers octets recus au lieu d'attendre tout le segment.
    return new NextResponse(res.body, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-Rtt-Ms': String(rttMs),
        'X-Seconds-Remaining': String(newRemaining),
      },
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 200 })
  }
}
