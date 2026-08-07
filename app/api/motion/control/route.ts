import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { fal } from "@fal-ai/client"

// --- Motion Control REEL (Kling Motion Control via fal.ai) ---
// C'est le moteur EXACT que Higgsfield expose dans son UI "Motion Control" :
// on transfere le mouvement d'une VIDEO de reference sur une IMAGE de personnage.
// Contrairement a Higgsfield (qui ne l'expose pas via API), fal.ai le rend
// accessible via le modele fal-ai/kling-video/v3/*/motion-control.
//
// Flux : on soumet image + video a la file fal (async), on renvoie le request_id,
// puis le client poll le statut via GET ?request_id=...
//
// Facturation : AUCUNE deduction pour l'instant (a brancher plus tard),
// acces reserve aux utilisateurs connectes.

fal.config({ credentials: process.env.FAL_KEY })

// Allowlist stricte des modeles cote serveur (le client ne peut pas injecter un slug).
const MODELS: Record<string, string> = {
  standard: "fal-ai/kling-video/v3/standard/motion-control",
  pro: "fal-ai/kling-video/v3/pro/motion-control",
}
const DEFAULT_MODEL = "standard"

const MAX_IMAGE = 10 * 1024 * 1024 // 10 Mo
const MAX_VIDEO = 100 * 1024 * 1024 // 100 Mo

// GET : statut d'une generation fal (?request_id=...&model=standard|pro)
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 })
  }

  const params = new URL(request.url).searchParams
  const requestId = params.get("request_id")
  const modelKey = params.get("model") === "pro" ? "pro" : "standard"
  const model = MODELS[modelKey]

  if (!requestId) {
    return NextResponse.json({ error: "request_id requis" }, { status: 400 })
  }

  try {
    const status = await fal.queue.status(model, { requestId, logs: false })
    // fal renvoie COMPLETED | IN_PROGRESS | IN_QUEUE | (erreur via exception)
    const s = String(status.status || "").toUpperCase()

    if (s === "COMPLETED") {
      const result = await fal.queue.result(model, { requestId })
      const videoUrl = (result.data as { video?: { url?: string } })?.video?.url || null
      return NextResponse.json({ success: true, status: "completed", video_url: videoUrl })
    }

    return NextResponse.json({
      success: true,
      status: s === "IN_PROGRESS" ? "in_progress" : "queued",
      video_url: null,
    })
  } catch (err) {
    console.error("[MotionControl] status error:", err instanceof Error ? err.message : err)
    return NextResponse.json({ success: true, status: "failed", error: "La generation a echoue." })
  }
}

// POST : lance un motion-transfer. multipart/form-data :
// image (File requis), video (File requis), prompt (opt), model (standard|pro),
// orientation (video|image), keep_sound (bool)
export async function POST(request: NextRequest) {
  try {
    if (!process.env.FAL_KEY) {
      return NextResponse.json({ error: "Cle fal manquante cote serveur." }, { status: 500 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 })
    }

    const form = await request.formData()
    const image = form.get("image") as File | null
    const video = form.get("video") as File | null
    const prompt = (form.get("prompt") as string | null)?.trim() || ""
    const modelKey = (form.get("model") as string | null)?.trim() === "pro" ? "pro" : "standard"
    // 'video' = suit le mouvement de la video (max 30s), 'image' = suit l'orientation
    // de l'image (max 10s). Par defaut on privilegie le mouvement (comme Higgsfield).
    const orientation = (form.get("orientation") as string | null)?.trim() === "image" ? "image" : "video"
    const keepSound = (form.get("keep_sound") as string | null) === "true"

    if (!image) {
      return NextResponse.json({ error: "Image du personnage manquante." }, { status: 400 })
    }
    if (!video) {
      return NextResponse.json({ error: "Video de reference manquante." }, { status: 400 })
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(image.type)) {
      return NextResponse.json({ error: "Image invalide (JPG, PNG ou WebP)." }, { status: 400 })
    }
    if (!["video/mp4", "video/quicktime", "video/webm"].includes(video.type)) {
      return NextResponse.json({ error: "Video invalide (MP4, MOV ou WebM)." }, { status: 400 })
    }
    if (image.size > MAX_IMAGE) {
      return NextResponse.json({ error: "Image trop volumineuse (max 10 Mo)." }, { status: 400 })
    }
    if (video.size > MAX_VIDEO) {
      return NextResponse.json({ error: "Video trop volumineuse (max 100 Mo)." }, { status: 400 })
    }

    const model = MODELS[modelKey] || MODELS[DEFAULT_MODEL]

    // fal auto-uploade les binaires vers son propre stockage -> pas besoin de Supabase.
    const imageUrl = await fal.storage.upload(image)
    const videoUrl = await fal.storage.upload(video)

    const input: Record<string, unknown> = {
      image_url: imageUrl,
      video_url: videoUrl,
      character_orientation: orientation,
      keep_original_sound: keepSound,
    }
    if (prompt) input.prompt = prompt

    const { request_id } = await fal.queue.submit(model, { input })

    return NextResponse.json({
      success: true,
      request_id,
      model: modelKey,
      status: "queued",
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erreur serveur"
    console.error("[MotionControl Error]", msg)
    // fal renvoie souvent les erreurs de credits/validation dans le message
    const lower = msg.toLowerCase()
    const noCredits = lower.includes("balance") || lower.includes("credit") || lower.includes("exhausted")
    return NextResponse.json(
      {
        error: noCredits
          ? "Le compte fal n'a plus de credits. Contactez l'administrateur."
          : "Echec du lancement de la generation.",
        code: noCredits ? "no_credit" : "failed",
        detail: msg.slice(0, 200),
      },
      { status: noCredits ? 402 : 502 },
    )
  }
}
