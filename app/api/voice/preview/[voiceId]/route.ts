import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1'
const VOICE_ID = /^[A-Za-z0-9]{10,40}$/
const CACHE_MS = 6 * 60 * 60 * 1000

type CachedPreview = { audio: ArrayBuffer; expires: number }
const previewCache = new Map<string, CachedPreview>()

function getApiKey(): string {
  return process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_API_KEY || ''
}

function isTrustedPreviewHost(url: string) {
  try {
    const { protocol, hostname } = new URL(url)
    return protocol === 'https:' && (hostname === 'storage.googleapis.com' || hostname.endsWith('.elevenlabs.io'))
  } catch {
    return false
  }
}

async function loadPreview(voiceId: string, apiKey: string): Promise<ArrayBuffer | null> {
  const cached = previewCache.get(voiceId)
  if (cached && cached.expires > Date.now()) return cached.audio

  const meta = await fetch(`${ELEVENLABS_BASE}/voices/${voiceId}`, { headers: { 'xi-api-key': apiKey }, cache: 'no-store' })
  if (!meta.ok) {
    console.error('[voice/preview] voice lookup failed', voiceId, meta.status)
    return null
  }
  const { preview_url: previewUrl } = (await meta.json()) as { preview_url?: string }
  if (!previewUrl || !isTrustedPreviewHost(previewUrl)) {
    console.error('[voice/preview] no usable preview_url', voiceId)
    return null
  }
  const needsKey = new URL(previewUrl).hostname.endsWith('.elevenlabs.io')
  const res = await fetch(previewUrl, { headers: needsKey ? { 'xi-api-key': apiKey } : undefined, cache: 'no-store' })
  if (!res.ok) {
    console.error('[voice/preview] preview download failed', voiceId, res.status)
    return null
  }
  const audio = await res.arrayBuffer()
  previewCache.set(voiceId, { audio, expires: Date.now() + CACHE_MS })
  return audio
}

/**
 * Aperçu d'une voix ElevenLabs : relaie l'échantillon public fourni par
 * ElevenLabs (aucune synthèse, aucun jeton ChapCam débité). Servi en
 * audio/mpeg avec prise en charge des requêtes Range pour AVPlayer (iOS),
 * car le stockage d'origine renvoie un type MIME text/plain.
 */
export async function GET(request: Request, { params }: { params: Promise<{ voiceId: string }> }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { voiceId } = await params
  if (!VOICE_ID.test(voiceId)) return NextResponse.json({ error: 'Voix inconnue.' }, { status: 400 })

  const apiKey = getApiKey()
  if (!apiKey) return NextResponse.json({ error: 'Aperçu indisponible pour le moment.' }, { status: 503 })

  try {
    const audio = await loadPreview(voiceId, apiKey)
    if (!audio) return NextResponse.json({ error: 'Aperçu indisponible pour cette voix.' }, { status: 404 })

    const total = audio.byteLength
    const baseHeaders = {
      'Content-Type': 'audio/mpeg',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=21600',
    }
    const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range') || '')
    if (range) {
      const start = range[1] ? Number(range[1]) : Math.max(0, total - Number(range[2]))
      const end = range[1] && range[2] ? Math.min(Number(range[2]), total - 1) : total - 1
      if (start >= total || start > end) {
        return new NextResponse(null, { status: 416, headers: { ...baseHeaders, 'Content-Range': `bytes */${total}` } })
      }
      return new NextResponse(audio.slice(start, end + 1), {
        status: 206,
        headers: { ...baseHeaders, 'Content-Range': `bytes ${start}-${end}/${total}`, 'Content-Length': String(end - start + 1) },
      })
    }
    return new NextResponse(audio, { status: 200, headers: { ...baseHeaders, 'Content-Length': String(total) } })
  } catch (e) {
    console.error('[voice/preview] unexpected error', voiceId, e)
    return NextResponse.json({ error: 'Aperçu indisponible pour le moment.' }, { status: 502 })
  }
}
