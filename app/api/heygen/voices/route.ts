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

    const res = await fetch("https://api.heygen.com/v2/voices", {
      headers: { "X-Api-Key": apiKey },
    })
    const json = await res.json().catch(() => null)
    const voices = (json?.data?.voices || []) as Array<{
      voice_id: string
      name: string
      language: string
      gender: string
      preview_audio?: string
    }>

    const mapped = voices.map((v) => ({
      voice_id: v.voice_id,
      name: v.name,
      language: v.language,
      gender: v.gender,
      preview: v.preview_audio || null,
    }))

    // Tri : francais d'abord, puis anglais, puis le reste (par nom).
    const rank = (lang: string) => {
      const l = (lang || "").toLowerCase()
      if (l.includes("french") || l.includes("franc")) return 0
      if (l.includes("english")) return 1
      return 2
    }
    mapped.sort((a, b) => rank(a.language) - rank(b.language) || a.name.localeCompare(b.name))

    return NextResponse.json({ success: true, voices: mapped })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 },
    )
  }
}
