import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

// --- Studio Image Higgsfield (Soul) ---
// Deux modes exposes cote UI (onglets "Texte -> Image" et "Edition d'image") :
//   - "text" : generation pure a partir d'un prompt  -> higgsfield-ai/soul/standard
//   - "edit" : conditionnement sur une image source + prompt (variations /
//              changement de style) -> higgsfield-ai/soul/reference
//
// Le flux Higgsfield est asynchrone : POST -> request_id -> polling du statut.
// Un resultat termine renvoie { images: [{ url }] }.
//
// Comme pour le studio Motion, Higgsfield exige une image_url PUBLIQUE pour le
// mode edition : on heberge donc l'image importee dans le bucket public
// Supabase "avatars" (prefixe soul/), puis on transmet son URL publique.
//
// Facturation : pas de deduction de credits ChapCam pour l'instant, l'acces est
// simplement reserve aux utilisateurs connectes (coherent avec le studio Motion).

const HIGGSFIELD_API = "https://platform.higgsfield.ai"
const STORAGE_BUCKET = "avatars"

// Allowlist stricte cote serveur : le client ne choisit qu'un mode, pas un slug.
const MODELS = {
  text: "higgsfield-ai/soul/standard",
  edit: "higgsfield-ai/soul/reference",
} as const

const ASPECT_RATIOS = ["1:1", "16:9", "9:16", "3:4", "4:3"] as const

function authHeader(): string | null {
  const key = process.env.HIGGSFIELD_API_KEY
  const secret = process.env.HIGGSFIELD_API_SECRET
  if (!key || !secret) return null
  return `Key ${key}:${secret}`
}

// GET : statut d'une generation (?request_id=...). Renvoie l'URL de l'image
// une fois le rendu termine.
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

  const requestId = new URL(request.url).searchParams.get("request_id")
  if (!requestId) {
    return NextResponse.json({ error: "request_id requis" }, { status: 400 })
  }

  try {
    const res = await fetch(`${HIGGSFIELD_API}/requests/${encodeURIComponent(requestId)}/status`, {
      headers: { Authorization: auth },
    })
    const json = await res.json().catch(() => ({}))
    const statusStr = json.status || "unknown" // queued | in_progress | completed | failed | nsfw
    const imageUrl = json.images?.[0]?.url || null
    return NextResponse.json({
      success: true,
      status: statusStr,
      image_url: imageUrl,
      error: statusStr === "nsfw" ? "Contenu refuse par la moderation." : json.error || null,
    })
  } catch {
    return NextResponse.json({ error: "Impossible de recuperer le statut." }, { status: 502 })
  }
}

// POST : lance une generation image. multipart/form-data :
//   mode ("text" | "edit"), prompt (texte), aspect_ratio, file (image, mode edit).
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
    const mode = (form.get("mode") as string | null) === "edit" ? "edit" : "text"
    const prompt = (form.get("prompt") as string | null)?.trim() || ""
    const aspectRaw = (form.get("aspect_ratio") as string | null)?.trim() || "1:1"
    const aspectRatio = (ASPECT_RATIOS as readonly string[]).includes(aspectRaw) ? aspectRaw : "1:1"
    const file = form.get("file") as File | null

    if (!prompt) {
      return NextResponse.json({ error: "Le prompt est requis." }, { status: 400 })
    }
    if (prompt.length > 500) {
      return NextResponse.json({ error: "Prompt trop long (max 500 caracteres)." }, { status: 400 })
    }

    const payload: Record<string, unknown> = {
      prompt,
      aspect_ratio: aspectRatio,
    }
    let imagePath: string | null = null

    // Mode edition : hydrater l'image source dans le bucket public -> URL HTTPS.
    if (mode === "edit") {
      if (!file) {
        return NextResponse.json({ error: "Ajoute une image a editer." }, { status: 400 })
      }
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        return NextResponse.json({ error: "Format invalide (JPG, PNG ou WebP)." }, { status: 400 })
      }
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: "Image trop volumineuse (max 10 Mo)." }, { status: 400 })
      }
      const admin = createAdminClient()
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg"
      const path = `soul/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const bytes = Buffer.from(await file.arrayBuffer())
      const { error: upErr } = await admin.storage.from(STORAGE_BUCKET).upload(path, bytes, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      })
      if (upErr) {
        console.error("[SoulImage] Upload Supabase echoue:", upErr.message)
        return NextResponse.json({ error: "Echec de l'upload de l'image." }, { status: 502 })
      }
      const { data: pub } = admin.storage.from(STORAGE_BUCKET).getPublicUrl(path)
      imagePath = path
      // Soul reference accepte un tableau d'URLs d'images de reference.
      payload.input_images = [pub.publicUrl]
    }

    const model = MODELS[mode]
    const res = await fetch(`${HIGGSFIELD_API}/${model}`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    })
    const json = await res.json().catch(() => null)

    if (!res.ok || !json?.request_id) {
      // Nettoyer l'image hebergee si la generation n'a pas demarre.
      if (imagePath) {
        await createAdminClient().storage.from(STORAGE_BUCKET).remove([imagePath]).catch(() => {})
      }
      const detail = json?.detail || json?.message || json?.error || ""
      const noCredits = typeof detail === "string" && detail.includes("credit")
      console.error("[SoulImage] Echec lancement", res.status, JSON.stringify(json))
      return NextResponse.json(
        {
          error: noCredits
            ? "Le service de generation d'images n'a plus de credits. Contactez l'administrateur."
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
    })
  } catch (error) {
    console.error("[SoulImage Error]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 },
    )
  }
}
