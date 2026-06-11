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
    return NextResponse.json({ ok: false, error: 'Cle API ElevenLabs manquante.' }, { status: 200 })
  }

  const url = new URL(request.url)
  const voiceId = url.searchParams.get('voiceId') || ''
  if (!voiceId) {
    return NextResponse.json({ ok: false, error: 'Aucune voix cible selectionnee.' }, { status: 200 })
  }

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
    return NextResponse.json({ ok: false, error: 'Segment vide.' }, { status: 200 })
  }

  const t0 = Date.now()
  try {
    const wav = pcmToWav(pcm)
    const form = new FormData()
    form.append('audio', new Blob([new Uint8Array(wav)], { type: 'audio/wav' }), 'segment.wav')
    form.append('model_id', 'eleven_multilingual_sts_v2')
    form.append('remove_background_noise', 'true')
    form.append('voice_settings', JSON.stringify({ stability: 0.5, similarity_boost: 0.75 }))

    const apiUrl =
      `${ELEVENLABS_BASE}/speech-to-speech/${encodeURIComponent(voiceId)}/stream` +
      `?output_format=${STS_OUTPUT_FORMAT}&optimize_streaming_latency=4`

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey },
      body: form,
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      return NextResponse.json(
        { ok: false, error: `ElevenLabs HTTP ${res.status} ${detail.slice(0, 120)}` },
        { status: 200 },
      )
    }

    const arrayBuf = await res.arrayBuffer()
    const rttMs = Date.now() - t0

    // Decremente le solde : duree de l'audio source (en secondes, arrondie au sup).
    const segmentSeconds = Math.max(1, Math.ceil(pcm.length / 2 / TARGET_SAMPLE_RATE))
    const newRemaining = Math.max(0, secondsLeft - segmentSeconds)
    await admin
      .from('voice_subscriptions')
      .update({ seconds_remaining: newRemaining, updated_at: new Date().toISOString() })
      .eq('id', sub.id)

    return new NextResponse(arrayBuf, {
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
