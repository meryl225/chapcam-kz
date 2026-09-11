import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createMotionJob, markMotionJobCompleted, markMotionJobFailed } from "@/lib/motion-jobs"

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

export const maxDuration = 60

const HIGGSFIELD_API = "https://platform.higgsfield.ai"
const STORAGE_BUCKET = "avatars"

// Higgsfield connait des ralentissements transitoires : sans borne, un appel qui
// pend consomme toute la duree de la fonction et retombe en 5xx. On abandonne
// proprement au bout d'un delai et on reessaie UNE fois les erreurs transitoires
// (timeout / 5xx upstream). Cela evite les pics de 5xx quand l'upstream tangue.
const REQUEST_TIMEOUT_MS = 20_000

async function higgsfieldFetch(
  url: string,
  init: RequestInit,
  { timeoutMs = REQUEST_TIMEOUT_MS, retries = 1 } = {},
): Promise<Response> {
  let lastErr: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(url, { ...init, signal: controller.signal })
      clearTimeout(timer)
      // 502/503/504 = upstream instable -> on retente une fois avant d'abandonner.
      if ((res.status === 502 || res.status === 503 || res.status === 504) && attempt < retries) {
        await new Promise((r) => setTimeout(r, 400))
        continue
      }
      return res
    } catch (err) {
      clearTimeout(timer)
      lastErr = err
      // Timeout / erreur reseau : on retente une fois, sinon on propage.
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 400))
        continue
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Higgsfield injoignable")
}

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
      const res = await higgsfieldFetch(`${HIGGSFIELD_API}/v1/motions`, { headers: { Authorization: auth } })
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
    const res = await higgsfieldFetch(`${HIGGSFIELD_API}/requests/${encodeURIComponent(requestId)}/status`, {
      headers: { Authorization: auth },
    })
    // Un statut illisible (upstream qui tangue) ne doit PAS casser le polling du
    // client : on renvoie "in_progress" pour qu'il reessaie au prochain tick.
    if (!res.ok) {
      return NextResponse.json({ success: true, status: "in_progress", video_url: null, error: null })
    }
    const json = await res.json().catch(() => ({}))
    const statusStr = json.status || "unknown" // queued | in_progress | completed | failed | nsfw
    const videoUrl = json.video?.url || null
    // Persister le resultat pour que la video reste retrouvable dans l'historique
    // meme si l'utilisateur avait quitte la page pendant le rendu.
    if (statusStr === "completed" && videoUrl) {
      await markMotionJobCompleted(user.id, requestId, videoUrl).catch(() => {})
    } else if (statusStr === "failed" || statusStr === "nsfw") {
      await markMotionJobFailed(user.id, requestId).catch(() => {})
    }
    return NextResponse.json({
      success: true,
      status: statusStr,
      video_url: videoUrl,
      error: statusStr === "nsfw" ? "Contenu refuse par la moderation." : json.error || null,
    })
  } catch {
    // Timeout / reseau pendant le polling : ne pas remonter un 5xx (ce n'est pas
    // un echec de generation). Le client retentera au prochain tick.
    return NextResponse.json({ success: true, status: "in_progress", video_url: null, error: null })
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

    const res = await higgsfieldFetch(`${HIGGSFIELD_API}/${model}`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    })
    const json = await res.json().catch(() => null)

    if (!res.ok || !json?.request_id) {
      // Nettoyer l'image hebergee si la generation n'a pas demarre.
      await admin.storage.from(STORAGE_BUCKET).remove([path]).catch(() => {})
      const detail = String(json?.detail || json?.message || json?.error || "").toLowerCase()
      // Classification large des erreurs de facturation : credit / balance / quota
      // / insufficient / payment -> 402 (probleme cote compte, PAS un bug serveur,
      // donc ne doit pas polluer les alertes 5xx).
      const isBilling =
        res.status === 402 ||
        /credit|balance|quota|insufficient|payment|billing/.test(detail)
      return NextResponse.json(
        {
          error: isBilling
            ? "Le service de generation video n'a plus de credits. Contactez l'administrateur."
            : "Echec du lancement de la generation. Reessayez dans un instant.",
          code: isBilling ? "no_credit" : "failed",
          detail,
        },
        { status: isBilling ? 402 : 502 },
      )
    }

    // Persister le job : l'historique et la reprise du polling au retour sur la
    // page en dependent.
    await createMotionJob({
      userId: user.id,
      requestId: json.request_id,
      provider: "higgsfield",
      model: modelKey,
      prompt,
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      request_id: json.request_id,
      status: json.status || "queued",
      // On renvoie le chemin pour un nettoyage differe eventuel cote client.
      image_path: path,
    })
  } catch (error) {
    console.error("[Motion Error]", error)
    // Un abandon (timeout) ou une erreur reseau vers Higgsfield est un probleme
    // UPSTREAM (502), pas un bug serveur (500) : on ne pollue pas les alertes 5xx
    // internes et on invite l'utilisateur a reessayer.
    const isUpstream =
      error instanceof Error &&
      (error.name === "AbortError" || /injoignable|fetch failed|network|timeout/i.test(error.message))
    return NextResponse.json(
      {
        error: isUpstream
          ? "Le service de generation video est momentanement indisponible. Reessayez dans un instant."
          : error instanceof Error ? error.message : "Erreur serveur",
        code: isUpstream ? "upstream_unavailable" : "server_error",
      },
      { status: isUpstream ? 502 : 500 },
    )
  }
}
