import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// --- Tarification photo -> video (HeyGen Avatar IV) ---
// Cout HeyGen mesure : ~0,067 $/seconde (base securisee 4 $/min). A 1 point =
// 20 FCFA (~0,033 $), le seuil de rentabilite est ~2 points/seconde. On applique
// une marge x4 => 8 POINTS PAR SECONDE de video.
const POINTS_PER_SECOND = 8
// La duree finale n'est connue qu'apres generation : on l'ESTIME depuis la
// longueur du texte. La parole FR fait ~14 caracteres/seconde.
const CHARS_PER_SECOND = 14
// Duree maximale autorisee par video.
const MAX_SECONDS = 60
const MAX_SCRIPT_CHARS = MAX_SECONDS * CHARS_PER_SECOND // ~840 caracteres

// Estime la duree (en secondes) d'un script et le cout en points associe.
function estimateCost(script: string): { seconds: number; points: number } {
  const seconds = Math.min(MAX_SECONDS, Math.max(2, Math.ceil(script.length / CHARS_PER_SECOND)))
  return { seconds, points: seconds * POINTS_PER_SECOND }
}

const HEYGEN_API = "https://api.heygen.com"
const HEYGEN_UPLOAD = "https://upload.heygen.com/v1/asset"

function getApiKey(): string | null {
  return process.env.HEYGEN_API_KEY || null
}

// POST : cree une video a partir d'une photo + un prompt (script parle).
// Attend un multipart/form-data : file (image), script (texte), voice_id.
export async function POST(request: NextRequest) {
  try {
    const apiKey = getApiKey()
    if (!apiKey) {
      return NextResponse.json({ error: "Cle API HeyGen manquante cote serveur." }, { status: 500 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 })
    }

    const form = await request.formData()
    const file = form.get("file") as File | null
    const script = (form.get("script") as string | null)?.trim() || ""
    const voiceId = (form.get("voice_id") as string | null)?.trim() || ""

    if (!file) {
      return NextResponse.json({ error: "Photo manquante." }, { status: 400 })
    }
    if (!script) {
      return NextResponse.json({ error: "Le prompt (texte a dire) est requis." }, { status: 400 })
    }
    if (!voiceId) {
      return NextResponse.json({ error: "Aucune voix selectionnee." }, { status: 400 })
    }
    if (script.length > MAX_SCRIPT_CHARS) {
      return NextResponse.json(
        { error: `Le prompt est trop long (max ${MAX_SCRIPT_CHARS} caracteres, soit ~${MAX_SECONDS}s de video).` },
        { status: 400 },
      )
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Photo trop volumineuse (max 10 Mo)." }, { status: 400 })
    }

    // Cout estime depuis la longueur du texte (facturation proportionnelle).
    const { seconds: estimatedSeconds, points: pointsCost } = estimateCost(script)

    // Verifier les points AVANT tout appel HeyGen.
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("points")
      .eq("id", user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profil utilisateur non trouve" }, { status: 404 })
    }
    if (profile.points < pointsCost) {
      return NextResponse.json(
        { error: "Points insuffisants", points_required: pointsCost, points_available: profile.points },
        { status: 402 },
      )
    }

    // 1) Upload de la photo vers HeyGen -> asset_id
    const contentType = file.type === "image/png" ? "image/png" : "image/jpeg"
    const bytes = Buffer.from(await file.arrayBuffer())
    const uploadRes = await fetch(HEYGEN_UPLOAD, {
      method: "POST",
      headers: { "X-Api-Key": apiKey, "Content-Type": contentType },
      body: bytes,
    })
    const uploadJson = await uploadRes.json().catch(() => null)
    const assetId = uploadJson?.data?.id
    if (!uploadRes.ok || !assetId) {
      return NextResponse.json(
        { error: `Echec de l'upload de la photo vers HeyGen.`, detail: uploadJson?.message || uploadJson?.msg || "" },
        { status: 502 },
      )
    }

    // 2) Creation de la video (Avatar IV, type image = photo qui parle)
    const createRes = await fetch(`${HEYGEN_API}/v3/videos`, {
      method: "POST",
      headers: { "X-Api-Key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "image",
        script,
        voice_id: voiceId,
        image: { type: "asset_id", asset_id: assetId },
        title: "ChapCam",
      }),
    })
    const createJson = await createRes.json().catch(() => null)

    if (createRes.status === 402) {
      // Credits HeyGen epuises : NE PAS deduire les points de l'utilisateur.
      return NextResponse.json(
        { error: "Le service de generation HeyGen n'a plus de credits. Contactez l'administrateur.", code: "heygen_no_credit" },
        { status: 402 },
      )
    }
    const videoId = createJson?.data?.video_id || createJson?.video_id
    if (!createRes.ok || !videoId) {
      return NextResponse.json(
        { error: createJson?.error?.message || "Echec de la creation de la video.", detail: createJson?.error?.code || "" },
        { status: 502 },
      )
    }

    // 3) Deduire les points seulement apres succes de la creation.
    await supabase.from("profiles").update({ points: profile.points - pointsCost }).eq("id", user.id)
    await supabase.from("swap_transactions").insert({
      user_id: user.id,
      points_used: pointsCost,
      status: "processing",
    })

    return NextResponse.json({
      success: true,
      video_id: videoId,
      points_used: pointsCost,
      estimated_seconds: estimatedSeconds,
      points_remaining: profile.points - pointsCost,
    })
  } catch (error) {
    console.error("[HeyGen PhotoVideo Error]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 },
    )
  }
}

// GET : recupere le statut d'une video (?video_id=...)
export async function GET(request: NextRequest) {
  try {
    const apiKey = getApiKey()
    if (!apiKey) {
      return NextResponse.json({ error: "Cle API HeyGen manquante cote serveur." }, { status: 500 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 })
    }

    const videoId = new URL(request.url).searchParams.get("video_id")
    if (!videoId) {
      return NextResponse.json({ error: "video_id requis" }, { status: 400 })
    }

    const res = await fetch(`${HEYGEN_API}/v1/video_status.get?video_id=${encodeURIComponent(videoId)}`, {
      headers: { "X-Api-Key": apiKey },
    })
    const json = await res.json().catch(() => null)
    const data = json?.data || {}

    return NextResponse.json({
      success: true,
      status: data.status || "unknown", // pending | processing | completed | failed
      video_url: data.video_url || null,
      thumbnail_url: data.thumbnail_url || null,
      duration: data.duration || null,
      error: data.error || null,
    })
  } catch (error) {
    console.error("[HeyGen Status Error]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 },
    )
  }
}
