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

    type HeygenVoice = {
      voice_id: string
      name: string
      language: string
      gender: string
      preview_audio_url?: string | null
    }

    // API v3 : filtre de langue cote HeyGen (FR puis EN), appels bornes dans le temps.
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12_000)
    let lists: Array<{ ok: boolean; status: number; voices: HeygenVoice[] }>
    try {
      lists = await Promise.all(
        ["French", "English"].map(async (language) => {
          const res = await fetch(`https://api.heygen.com/v3/voices?type=public&language=${language}&limit=100`, {
            headers: { "X-Api-Key": apiKey },
            signal: controller.signal,
          })
          const json = await res.json().catch(() => null)
          return { ok: res.ok, status: res.status, voices: (json?.data || []) as HeygenVoice[] }
        }),
      )
    } finally {
      clearTimeout(timeout)
    }

    if (lists.every((l) => !l.ok)) {
      return NextResponse.json(
        { error: `HeyGen a repondu ${lists[0].status}.`, voices: [] },
        { status: 502 },
      )
    }

    const rankById = new Map<string, number>()
    const voices: HeygenVoice[] = []
    lists.forEach((list, rank) => {
      for (const v of list.voices) {
        if (!v.voice_id || rankById.has(v.voice_id)) continue
        rankById.set(v.voice_id, rank)
        voices.push(v)
      }
    })
    const rank = (v: HeygenVoice) => rankById.get(v.voice_id) ?? 2

    // Certaines entrees HeyGen ont un "name" qui est en fait un nom de fichier
    // brut (ex: "1860cfb5-....mov") ou un UUID : on les ecarte pour un menu propre.
    const isReadableName = (name: string) => {
      const n = (name || "").trim()
      if (!n) return false
      if (/\.(mov|mp4|wav|mp3|m4a|webm)$/i.test(n)) return false
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/i.test(n)) return false
      return true
    }

    const toClient = (v: HeygenVoice) => ({
      voice_id: v.voice_id,
      name: v.name,
      language: v.language,
      gender: v.gender,
      preview: v.preview_audio_url || null,
    })

    const filtered = voices
      .filter((v) => isReadableName(v.name))
      .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name))
      .slice(0, 80)
      .map(toClient)

    // Repli : si aucune voix FR/EN, on renvoie les premieres voix disponibles.
    const result = filtered.length > 0 ? filtered : voices.slice(0, 40).map(toClient)

    return NextResponse.json({ success: true, voices: result })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 },
    )
  }
}
