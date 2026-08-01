import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET : liste des voix HeyGen disponibles (id, nom, langue, genre, apercu).
// On priorise le francais puis l'anglais pour l'UI ChapCam.
export async function GET() {
  try {
    const apiKey = process.env.HEYGEN_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "Cle API HeyGen manquante cote serveur." }, { status: 500 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 })
    }

    // Timeout : HeyGen renvoie ~2500 voix (payload lourd). On borne l'appel
    // pour ne jamais bloquer la fonction serverless.
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12_000)
    let res: Response
    try {
      res = await fetch("https://api.heygen.com/v2/voices", {
        headers: { "X-Api-Key": apiKey },
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeout)
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: `HeyGen a repondu ${res.status}.`, voices: [] },
        { status: 502 },
      )
    }

    const json = await res.json().catch(() => null)
    const voices = (json?.data?.voices || []) as Array<{
      voice_id: string
      name: string
      language: string
      gender: string
      preview_audio?: string
    }>

    // On ne garde que le francais et l'anglais (pertinent pour ChapCam) et on
    // limite le nombre : payload leger + menu utilisable cote client.
    const rank = (lang: string) => {
      const l = (lang || "").toLowerCase()
      if (l.includes("french") || l.includes("franc")) return 0
      if (l.includes("english")) return 1
      return 2
    }

    // Certaines entrees HeyGen ont un "name" qui est en fait un nom de fichier
    // brut (ex: "1860cfb5-....mov") ou un UUID : on les ecarte pour un menu propre.
    const isReadableName = (name: string) => {
      const n = (name || "").trim()
      if (!n) return false
      if (/\.(mov|mp4|wav|mp3|m4a|webm)$/i.test(n)) return false
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/i.test(n)) return false
      return true
    }

    const filtered = voices
      .filter((v) => v.voice_id && rank(v.language) < 2 && isReadableName(v.name))
      .map((v) => ({
        voice_id: v.voice_id,
        name: v.name,
        language: v.language,
        gender: v.gender,
        preview: v.preview_audio || null,
      }))
      .sort((a, b) => rank(a.language) - rank(b.language) || a.name.localeCompare(b.name))
      .slice(0, 80)

    // Repli : si aucune voix FR/EN, on renvoie les premieres voix disponibles.
    const result =
      filtered.length > 0
        ? filtered
        : voices.slice(0, 40).map((v) => ({
            voice_id: v.voice_id,
            name: v.name,
            language: v.language,
            gender: v.gender,
            preview: v.preview_audio || null,
          }))

    return NextResponse.json({ success: true, voices: result })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 },
    )
  }
}
