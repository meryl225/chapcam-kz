import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// POST : genere un APERCU AUDIO du texte exact avec la voix choisie, via
// l'endpoint TTS HeyGen (/v3/voices/speech). Permet a l'utilisateur d'ECOUTER
// le rendu vocal AVANT de lancer la generation video (bien plus couteuse).
// Meme moteur de voix que la video -> l'apercu correspond au resultat final.
const HEYGEN_API = "https://api.heygen.com"

// Meme borne que la page : ~14 caracteres/seconde pour 30s -> ~420 caracteres.
const MAX_SCRIPT_CHARS = 30 * 14

// Detecte le VRAI format audio sur les premiers octets (l'extension de l'URL
// HeyGen ne correspond pas au contenu).
function sniffAudioType(buf: Buffer): string | null {
  if (buf.length < 12) return null
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WAVE") {
    return "audio/wav"
  }
  if (buf.subarray(0, 3).toString("ascii") === "ID3") return "audio/mpeg"
  if (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) return "audio/mpeg"
  if (buf.subarray(0, 4).toString("ascii") === "OggS") return "audio/ogg"
  if (buf.subarray(4, 8).toString("ascii") === "ftyp") return "audio/mp4"
  return null
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.HEYGEN_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "Cle API HeyGen manquante cote serveur." }, { status: 500 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const text = (body?.text as string | undefined)?.trim() || ""
    const voiceId = (body?.voice_id as string | undefined)?.trim() || ""
    // Vitesse d'elocution (0.5 = tres lent, 2.0 = tres rapide). Defaut 1.0.
    const speedRaw = Number(body?.speed)
    const speed = Number.isFinite(speedRaw) ? Math.min(2, Math.max(0.5, speedRaw)) : 1.0
    const locale = (body?.locale as string | undefined)?.trim() || ""

    if (!text) {
      return NextResponse.json({ error: "Le texte a ecouter est requis." }, { status: 400 })
    }
    if (!voiceId) {
      return NextResponse.json({ error: "Aucune voix selectionnee." }, { status: 400 })
    }
    if (text.length > MAX_SCRIPT_CHARS) {
      return NextResponse.json(
        { error: `Texte trop long (max ${MAX_SCRIPT_CHARS} caracteres).` },
        { status: 400 },
      )
    }

    const payload: Record<string, unknown> = { text, voice_id: voiceId, speed }
    if (locale) payload.locale = locale

    const res = await fetch(`${HEYGEN_API}/v3/voices/speech`, {
      method: "POST",
      headers: { "X-Api-Key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const json = await res.json().catch(() => null)

    if (!res.ok) {
      return NextResponse.json(
        { error: json?.error?.message || "Impossible de generer l'apercu vocal.", detail: json?.error?.code || "" },
        { status: 502 },
      )
    }

    const audioUrl = json?.data?.audio_url || null
    if (!audioUrl) {
      return NextResponse.json({ error: "Aucun audio renvoye par HeyGen." }, { status: 502 })
    }

    // IMPORTANT : HeyGen renvoie une URL en ".wav" dont le CONTENU est du MP3.
    // Plusieurs navigateurs (Safari / iOS surtout) se fient a l'extension,
    // tentent de decoder du WAV, echouent, et le lecteur reste muet -> "les
    // clients n'arrivent pas a ecouter la voix". On telecharge donc l'audio
    // cote serveur et on le renvoie NOUS-MEMES avec le bon Content-Type
    // (detecte sur les octets), en meme origine : plus d'ambiguite de format,
    // plus de CORS / CSP / bloqueurs, lecture fiable partout.
    const audioRes = await fetch(audioUrl)
    if (!audioRes.ok) {
      return NextResponse.json({ error: "Audio HeyGen inaccessible." }, { status: 502 })
    }
    const buf = Buffer.from(await audioRes.arrayBuffer())
    const contentType = sniffAudioType(buf) || audioRes.headers.get("content-type") || "audio/mpeg"

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(buf.length),
        "Cache-Control": "private, no-store",
        "X-Audio-Duration": String(json?.data?.duration ?? ""),
      },
    })
  } catch (error) {
    console.error("[HeyGen VoicePreview Error]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 },
    )
  }
}
