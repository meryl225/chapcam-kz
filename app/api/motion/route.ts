import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

// --- Motion Control (Higgsfield image -> video) ---
// L'API Higgsfield ne fait PAS de video-a-video. Elle anime une IMAGE fixe en
// clip video via des modeles "image-to-video" (DoP) + des presets de mouvement
// de camera. Le flux est asynchrone : POST -> request_id -> polling du statut.
//
// Higgsfield exige une image_url PUBLIQUE (data URI refuse). On heberge donc
// l'image importee dans le bucket Supabase public "avatars" (prefixe motion/),
// puis on transmet son URL publique a Higgsfield.
//
// Facturation : volontairement AUCUNE deduction pour l'instant (a brancher plus
// tard). L'acces est simplement reserve aux utilisateurs connectes.

const HIGGSFIELD_API = "https://platform.higgsfield.ai"
const STORAGE_BUCKET = "avatars"

// Modeles image->video autorises (allowlist stricte cote serveur : le client
// ne peut pas injecter un slug arbitraire). Cles = valeurs acceptees de l'UI.
const MODELS: Record<string, string> = {
  turbo: "higgsfield-ai/dop/turbo",
  standard: "higgsfield-ai/dop/standard",
  lite: "higgsfield-ai/dop/lite",
}
const DEFAULT_MODEL = "turbo"

function authHeader(): string | null {
  const key = process.env.HIGGSFIELD_API_KEY
  const secret = process.env.HIGGSFIELD_API_SECRET
  if (!key || !secret) return null
  return `Key ${key}:${secret}`
}

// GET : soit la liste des presets de mouvement (?info=motions),
// soit le statut d'une generation (?request_id=...).
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 })
  }

  const auth = authHeader()
  if (!auth) {
    return NextResponse.json({ error: "Cle API Higgsfield manquante cote serveur." }, { status: 500 })
  }

  const params = new URL(request.url).searchParams

  // Liste des presets de mouvement de camera (id + nom + apercu).
  if (params.get("info") === "motions") {
    try {
      const res = await fetch(`${HIGGSFIELD_API}/v1/motions`, { headers: { Authorization: auth } })
      const json = await res.json().catch(() => [])
      const motions = Array.isArray(json)
        ? json.map((m) => ({
            id: m.id,
            name: m.name,
            description: m.description,
            preview_url: m.preview_url,
          }))
        : []
      return NextResponse.json({ success: true, motions })
    } catch {
      return NextResponse.json({ success: true, motions: [] })
    }
  }

  // Statut d'une generation.
  const requestId = params.get("request_id")
  if (!requestId) {
    return NextResponse.json({ error: "request_id requis" }, { status: 400 })
  }

  try {
    const res = await fetch(`${HIGGSFIELD_API}/requests/${encodeURIComponent(requestId)}/status`, {
      headers: { Authorization: auth },
    })
    const json = await res.json().catch(() => ({}))
    return NextResponse.json({
      success: true,
      status: json.status || "unknown", // queued | in_progress | completed | failed | nsfw
      video_url: json.video?.url || null,
      error: json.status === "nsfw" ? "Contenu refuse par la moderation." : json.error || null,
    })
  } catch {
    return NextResponse.json({ error: "Impossible de recuperer le statut." }, { status: 502 })
  }
}

// POST : lance une generation. multipart/form-data attendu :
// file (image), prompt (texte), model (turbo|standard|lite), motions (JSON ids),
// enhance (bool).
export async function POST(request: NextRequest) {
  try {
    const auth = authHeader()
    if (!auth) {
      return NextResponse.json({ error: "Cle API Higgsfield manquante cote serveur." }, { status: 500 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 })
    }

    const form = await request.formData()
    const file = form.get("file") as File | null
    const prompt = (form.get("prompt") as string | null)?.trim() || ""
    const modelKey = (form.get("model") as string | null)?.trim() || DEFAULT_MODEL
    const quality = (form.get("quality") as string | null)?.trim() === "1080p" ? "1080p" : "720p"
    const enhance = (form.get("enhance") as string | null) === "true"
    let motionIds: string[] = []
    try {
      const raw = form.get("motions") as string | null
      if (raw) motionIds = (JSON.parse(raw) as string[]).filter((s) => typeof s === "string").slice(0, 3)
    } catch {
      motionIds = []
    }

    if (!file) {
      return NextResponse.json({ error: "Photo manquante." }, { status: 400 })
    }
    if (!prompt) {
      return NextResponse.json({ error: "Le prompt (mouvement souhaite) est requis." }, { status: 400 })
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return NextResponse.json({ error: "Format invalide (JPG, PNG ou WebP)." }, { status: 400 })
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Photo trop volumineuse (max 10 Mo)." }, { status: 400 })
    }
    const model = MODELS[modelKey] || MODELS[DEFAULT_MODEL]

    // 1) Heberger l'image dans le bucket public Supabase -> URL publique HTTPS.
    const admin = createAdminClient()
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg"
    const path = `motion/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const bytes = Buffer.from(await file.arrayBuffer())
    const { error: upErr } = await admin.storage.from(STORAGE_BUCKET).upload(path, bytes, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    })
    if (upErr) {
      console.error("[Motion] Upload Supabase echoue:", upErr.message)
      return NextResponse.json({ error: "Echec de l'upload de la photo." }, { status: 502 })
    }
    const { data: pub } = admin.storage.from(STORAGE_BUCKET).getPublicUrl(path)
    const imageUrl = pub.publicUrl

    // 2) Lancer la generation image -> video chez Higgsfield.
    const payload: Record<string, unknown> = {
      image_url: imageUrl,
      prompt,
      enhance_prompt: enhance,
      resolution: quality,
    }
    if (motionIds.length > 0) payload.motions = motionIds.map((id) => ({ id }))

    const res = await fetch(`${HIGGSFIELD_API}/${model}`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    })
    const json = await res.json().catch(() => null)

    if (!res.ok || !json?.request_id) {
      // Nettoyer l'image hebergee si la generation n'a pas demarre.
      await admin.storage.from(STORAGE_BUCKET).remove([path]).catch(() => {})
      const detail = json?.detail || json?.message || json?.error || ""
      const noCredits = typeof detail === "string" && detail.includes("credit")
      return NextResponse.json(
        {
          error: noCredits
            ? "Le service de generation video n'a plus de credits. Contactez l'administrateur."
            : "Echec du lancement de la generation.",
          code: noCredits ? "no_credit" : "failed",
          detail: typeof detail === "string" ? detail : "",
        },
        { status: res.status === 402 || noCredits ? 402 : 502 },
      )
    }

    return NextResponse.json({
      success: true,
      request_id: json.request_id,
      status: json.status || "queued",
      // On renvoie le chemin pour un nettoyage differe eventuel cote client.
      image_path: path,
    })
  } catch (error) {
    console.error("[Motion Error]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 },
    )
  }
}
