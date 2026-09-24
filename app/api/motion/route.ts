import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createMotionJob, markMotionJobCompleted, markMotionJobFailed, getMotionJobModel, listMotionJobs } from "@/lib/motion-jobs"
import { saveVideoHistory, finalizeCompletedVideo, failGenerationAndGetRefund, listProcessingGenerations } from "@/lib/video-history"
import { creditJetons, reserveJetons } from "@/lib/jetons"
import { estimateGenjutsuPriceUsd, GENJUTSU_MAX_DURATION_SECONDS } from "@/lib/tool-costs"

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

const HIGGSFIELD_API = "https://api.higgsfield.ai"
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
  // Genjutsu motion transfer. NB: le namespace officiel s'ecrit bien "higgsfiled"
  // (avec le "d") — c'est le chemin exact attendu par l'API, pas une faute.
  genjutsu: "higgsfiled/genjutsu/motion-transfer/v1.0",
  kling3: "kling-video/v3.0",
}
const DEFAULT_MODEL = "turbo"

// Authentification Higgsfield. IMPORTANT : deux surfaces d'API coexistent et
// n'attendent PAS le meme schema :
//   - l'endpoint de generation legacy ("higgsfiled/genjutsu/...") accepte les
//     en-tetes hf-api-key / hf-secret,
//   - l'endpoint UNIFIE de statut ("/requests/{id}/status") exige, lui,
//     l'en-tete Authorization: "Key {id}:{secret}" (schema officiel OpenAPI).
// Envoyer les DEUX schemas a la fois garantit que chaque endpoint trouve celui
// qu'il attend (les en-tetes en trop sont ignores). C'est le correctif du
// "video generee mais bloquee en Generation..." : sans Authorization, le statut
// renvoyait 401, donc l'app ne detectait jamais la fin de la generation.
// La variable HIGGSFIELD_API_KEY stocke la cle au format "uuid:secret".
function higgsfieldAuthHeaders(): Record<string, string> | null {
  const key = process.env.HIGGSFIELD_API_KEY
  if (!key) return null
  const idx = key.indexOf(":")
  if (idx === -1) return { "hf-api-key": key, Authorization: `Key ${key}` }
  const id = key.slice(0, idx)
  const secret = key.slice(idx + 1)
  return { "hf-api-key": id, "hf-secret": secret, Authorization: `Key ${id}:${secret}` }
  }

// URL absolue du webhook Higgsfield a partir de la requete entrante (ou d'une
// variable d'environnement si definie). Higgsfield POSTera le resultat terminal
// ici -> finalisation cote SERVEUR meme si l'onglet est ferme. Renvoie undefined
// si indeterminable (on retombe alors sur le polling / la reconciliation).
function resolveHiggsfieldWebhookUrl(request: NextRequest): string | undefined {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL
  if (explicit) return `${explicit.replace(/\/$/, "")}/api/webhook/higgsfield`
  const proto = request.headers.get("x-forwarded-proto") || "https"
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host")
  return host ? `${proto}://${host}/api/webhook/higgsfield` : undefined
}

// La video finale peut arriver sous plusieurs formes selon le modele Higgsfield.
function extractVideoUrl(json: Record<string, any> | null): string | null {
  if (!json) return null
  return (
    json.video?.url ||
    json.video_url ||
    json.result?.url ||
    json.result?.video?.url ||
    (Array.isArray(json.results) ? json.results[0]?.url || json.results[0]?.video?.url : null) ||
    json.output?.url ||
    json.output?.video?.url ||
    null
  )
}

// Remboursement EXACT et IDEMPOTENT d'une generation Genjutsu echouee.
// failGenerationAndGetRefund fait basculer 'processing' -> 'failed' de facon
// atomique et renvoie le cout a rembourser (0 si deja traite) ; on RECREDITE
// alors reellement les jetons. C'est le correctif du "debit sans resultat" :
// avant, le montant etait calcule mais jamais rendu au portefeuille.
async function refundGenjutsuFailure(userId: string, requestId: string): Promise<number> {
  const amount = await failGenerationAndGetRefund(userId, "genjutsu", requestId).catch(() => 0)
  if (amount > 0) {
    await creditJetons(userId, amount, {
      reason: "genjutsu_generation_failed_refund",
      request_id: requestId,
    }).catch(() => {})
  }
  return amount
}

// GET : soit la liste des presets de mouvement (?info=motions),
// soit le statut d'une generation (?request_id=...).
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 })
  }

  const auth = higgsfieldAuthHeaders()
  if (!auth) {
    return NextResponse.json({ error: "Clé API Higgsfield manquante côté serveur." }, { status: 500 })
  }

  const params = new URL(request.url).searchParams

  // Liste des presets de mouvement de camera (id + nom + apercu).
  if (params.get("info") === "motions") {
    try {
      const res = await higgsfieldFetch(`${HIGGSFIELD_API}/v1/motions`, { headers: auth })
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

  // RECONCILIATION Genjutsu : rattrape les generations dont le statut final a ete
  // manque parce que la page etait fermee pendant le rendu. Pour chaque job encore
  // "processing", on interroge Higgsfield :
  //   - completed -> on recupere la video dans l'historique permanent,
  //   - failed / nsfw -> on rembourse (exact, idempotent),
  //   - bloque depuis > 30 min sans etat terminal -> on considere l'echec et on
  //     rembourse (les jobs Higgsfield n'excedent jamais cette duree).
  // C'est ce qui garantit qu'un debit sans resultat finit TOUJOURS rembourse.
  if (params.get("reconcile") === "genjutsu") {
    // On ne rembourse un job "coince" en file d'attente que s'il l'est depuis tres
    // longtemps ET que Higgsfield a repondu (statut non terminal). Un simple echec
    // d'appel de statut ne doit JAMAIS declencher un remboursement : la video peut
    // etre terminee cote provider (retention 7 jours), on la recuperera plus tard.
    const STUCK_MS = 6 * 60 * 60 * 1000 // 6 h
    const pending = await listProcessingGenerations(user.id, "genjutsu").catch(() => [])
    let refunded = 0
    let recovered = 0
    for (const { providerRef, createdAt } of pending) {
      let statusStr = "unknown"
      let responded = false
      let json: Record<string, any> | null = null
      try {
        const res = await higgsfieldFetch(`${HIGGSFIELD_API}/requests/${encodeURIComponent(providerRef)}/status`, {
          headers: auth,
        })
        if (res.ok) {
          responded = true
          json = await res.json().catch(() => null)
          statusStr = (json?.status as string) || "unknown"
        }
      } catch {
        // Injoignable : on ne fait rien pour ce job, un prochain passage reessaiera.
      }
      const videoUrl = extractVideoUrl(json)
      const ageMs = Date.now() - new Date(createdAt).getTime()
      const isStuck = responded && Number.isFinite(ageMs) && ageMs > STUCK_MS
      if (statusStr === "completed" && videoUrl) {
        await markMotionJobCompleted(user.id, providerRef, videoUrl).catch(() => {})
        const result = await finalizeCompletedVideo({
          userId: user.id,
          tool: "genjutsu",
          providerRef,
          providerUrl: videoUrl,
          title: "Genjutsu",
        }).catch(() => null)
        if (result && result.state !== "pending") recovered += 1
      } else if (statusStr === "failed" || statusStr === "nsfw" || statusStr === "canceled" || isStuck) {
        await markMotionJobFailed(user.id, providerRef).catch(() => {})
        refunded += await refundGenjutsuFailure(user.id, providerRef)
      }
    }

    // FILET DE SECURITE : certaines generations ont bien un request_id enregistre
    // dans motion_jobs mais AUCUNE ligne d'historique (l'ecriture d'historique a
    // echoue silencieusement au moment de la soumission). Elles seraient alors
    // invisibles pour toujours. On rattrape ces cas en scannant motion_jobs :
    // pour chaque job Genjutsu, si Higgsfield dit "completed", on cree/complete
    // la ligne d'historique (finalizeCompletedVideo est idempotent).
    const jobs = await listMotionJobs(user.id, 50).catch(() => [])
    const seen = new Set(pending.map((p) => p.providerRef))
    for (const job of jobs) {
      if (job.model !== "genjutsu" || job.provider !== "higgsfield") continue
      if (job.status === "failed") continue
      if (seen.has(job.request_id)) continue // deja traite via l'historique
      seen.add(job.request_id)
      let json: Record<string, any> | null = null
      try {
        const res = await higgsfieldFetch(
          `${HIGGSFIELD_API}/requests/${encodeURIComponent(job.request_id)}/status`,
          { headers: auth },
        )
        if (res.ok) json = await res.json().catch(() => null)
      } catch {
        continue
      }
      const videoUrl = extractVideoUrl(json)
      if ((json?.status as string) === "completed" && videoUrl) {
        await markMotionJobCompleted(user.id, job.request_id, videoUrl).catch(() => {})
        const result = await finalizeCompletedVideo({
          userId: user.id,
          tool: "genjutsu",
          providerRef: job.request_id,
          providerUrl: videoUrl,
          title: job.prompt?.slice(0, 80) || "Genjutsu",
        }).catch(() => null)
        if (result && result.state !== "pending") recovered += 1
      }
    }

    return NextResponse.json({ success: true, refunded, recovered })
  }

  // Statut d'une generation.
  const requestId = params.get("request_id")
  if (!requestId) {
    return NextResponse.json({ error: "request_id requis" }, { status: 400 })
  }

  try {
    const res = await higgsfieldFetch(`${HIGGSFIELD_API}/requests/${encodeURIComponent(requestId)}/status`, {
      headers: auth,
    })
    // Un statut illisible (upstream qui tangue) ne doit PAS casser le polling du
    // client : on renvoie "in_progress" pour qu'il reessaie au prochain tick.
    if (!res.ok) {
      return NextResponse.json({ success: true, status: "in_progress", video_url: null, error: null })
    }
    const json = await res.json().catch(() => ({}))
    const statusStr = json.status || "unknown" // queued | in_progress | completed | failed | nsfw
    const videoUrl = extractVideoUrl(json)
    // Persister le resultat pour que la video reste retrouvable dans l'historique
    // meme si l'utilisateur avait quitte la page pendant le rendu.
    if (statusStr === "completed" && videoUrl) {
      await markMotionJobCompleted(user.id, requestId, videoUrl).catch(() => {})
      // Historique DEDIE Genjutsu : on re-heberge la video dans le stockage
      // permanent (Blob + R2) sous l'outil "genjutsu" pour qu'elle reste
      // retrouvable indefiniment dans l'historique de la page Genjutsu, et pas
      // seulement dans l'historique Motion.
      const jobModel = await getMotionJobModel(user.id, requestId).catch(() => null)
      if (jobModel === "genjutsu") {
        await finalizeCompletedVideo({
          userId: user.id,
          tool: "genjutsu",
          providerRef: requestId,
          providerUrl: videoUrl,
          title: "Genjutsu",
        }).catch(() => {})
      }
    } else if (statusStr === "failed" || statusStr === "nsfw" || statusStr === "canceled") {
      // Journaliser la charge utile complete du statut : c'est la SEULE source qui
      // explique pourquoi une generation acceptee echoue ensuite cote Higgsfield
      // (media inaccessible, duree video hors 4-30s, moderation, etc.).
      console.error("[Genjutsu] Génération échouée (statut terminal)", {
        request_id: requestId,
        status: statusStr,
        response: json,
      })
      await markMotionJobFailed(user.id, requestId).catch(() => {})
      const jobModel = await getMotionJobModel(user.id, requestId).catch(() => null)
      if (jobModel === "genjutsu") {
        await refundGenjutsuFailure(user.id, requestId)
      }
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
    const auth = higgsfieldAuthHeaders()
    if (!auth) {
      return NextResponse.json({ error: "Clé API Higgsfield manquante côté serveur." }, { status: 500 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 })
    }

    const form = await request.formData()
    const fileValue = form.get("file")
  const referenceValue = form.get("referenceVideo")
  const referenceVideoUrlValue = form.get("referenceVideoUrl")
  const referenceVideoUrlInput = typeof referenceVideoUrlValue === "string" ? referenceVideoUrlValue.trim() : ""
  const file = fileValue instanceof File && fileValue.size > 0 ? fileValue : null
  const referenceVideo = referenceValue instanceof File && referenceValue.size > 0 ? referenceValue : null
    const promptValue = form.get("prompt")
    const modelValue = form.get("model")
    const qualityFormValue = form.get("quality")
    const prompt = typeof promptValue === "string" ? promptValue.trim() : ""
    const modelKey = typeof modelValue === "string" ? modelValue.trim() : DEFAULT_MODEL
    const qualityValue = typeof qualityFormValue === "string" ? qualityFormValue.trim() : ""
    const quality = qualityValue === "1080p" ? "1080p" : qualityValue === "720p" ? "720p" : ""
    const durationValue = form.get("durationSeconds")
    const parsedDuration = typeof durationValue === "string" && durationValue.trim() ? Number(durationValue) : GENJUTSU_MAX_DURATION_SECONDS
    const durationSeconds = Number.isFinite(parsedDuration) ? Math.floor(parsedDuration) : 0
    const enhance = form.get("enhance") === "true"
    let motionIds: string[] = []
    try {
      const raw = form.get("motions") as string | null
      if (raw) motionIds = (JSON.parse(raw) as string[]).filter((s) => typeof s === "string").slice(0, 3)
    } catch {
      motionIds = []
    }

    if (!file) {
      return NextResponse.json({ error: "Image source manquante ou fichier vide." }, { status: 400 })
    }
    if (!prompt) {
      return NextResponse.json({ error: "Le prompt (mouvement souhaite) est requis." }, { status: 400 })
    }
    if (!quality) {
      return NextResponse.json({ error: "Résolution invalide. Choisissez 720p ou 1080p." }, { status: 400 })
    }
    if (durationSeconds < 1 || durationSeconds > GENJUTSU_MAX_DURATION_SECONDS) {
      return NextResponse.json({ error: `La durée doit être comprise entre 1 et ${GENJUTSU_MAX_DURATION_SECONDS} secondes.` }, { status: 400 })
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return NextResponse.json({ error: "Format invalide (JPG, PNG ou WebP)." }, { status: 400 })
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Photo trop volumineuse (max 10 Mo)." }, { status: 400 })
    }
    const model = MODELS[modelKey] || MODELS[DEFAULT_MODEL]
    const pricing = estimateGenjutsuPriceUsd(modelKey, quality, durationSeconds)

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
    const isHttpsUrl = (value: string): boolean => {
      if (!value || value.startsWith("blob:") || value.startsWith("data:") || value.startsWith("/")) return false
      try {
        return new URL(value).protocol === "https:"
      } catch {
        return false
      }
    }
    if (!isHttpsUrl(imageUrl)) {
      console.error("[Genjutsu] image_url invalide après upload", { image_url: imageUrl })
      return NextResponse.json({ error: "Le stockage n'a pas fourni une URL HTTPS valide pour l'image." }, { status: 502 })
    }

  let videoUrl: string | undefined
  let referencePath: string | undefined
  if (referenceVideoUrlInput) {
    if (!isHttpsUrl(referenceVideoUrlInput)) return NextResponse.json({ error: "URL de vidéo de référence invalide." }, { status: 400 })
    videoUrl = referenceVideoUrlInput
  } else if (referenceVideo) {
      if (!["video/mp4", "video/webm", "video/quicktime"].includes(referenceVideo.type)) {
        return NextResponse.json({ error: "Format vidéo invalide (MP4, WebM ou MOV)." }, { status: 400 })
      }
      if (referenceVideo.size > 50 * 1024 * 1024) {
        return NextResponse.json({ error: "Vidéo de référence trop volumineuse (max 50 Mo)." }, { status: 400 })
      }
      const videoExt = referenceVideo.type === "video/webm" ? "webm" : referenceVideo.type === "video/quicktime" ? "mov" : "mp4"
      referencePath = `motion/${user.id}/${Date.now()}-reference.${videoExt}`
      const { error: videoUploadError } = await admin.storage.from(STORAGE_BUCKET).upload(referencePath, Buffer.from(await referenceVideo.arrayBuffer()), {
        contentType: referenceVideo.type,
        cacheControl: "3600",
        upsert: false,
      })
      if (videoUploadError) {
        console.error("[Genjutsu] Upload vidéo de référence échoué", { error: videoUploadError.message })
        return NextResponse.json({ error: "Échec de l'upload de la vidéo de référence.", detail: videoUploadError.message }, { status: 502 })
      }
      const { data: videoPublic } = admin.storage.from(STORAGE_BUCKET).getPublicUrl(referencePath)
      videoUrl = videoPublic.publicUrl
      if (!isHttpsUrl(videoUrl)) {
        console.error("[Genjutsu] video_url invalide après upload", { video_url: videoUrl })
        return NextResponse.json({ error: "Le stockage n'a pas fourni une URL HTTPS valide pour la vidéo." }, { status: 502 })
      }
    }

    // Genjutsu = motion transfer : la video source (mouvement a transferer) est
    // obligatoire cote API. On le verifie avant d'appeler Higgsfield.
    if (modelKey === "genjutsu" && !videoUrl) {
      await admin.storage.from(STORAGE_BUCKET).remove([path, ...(referencePath ? [referencePath] : [])]).catch(() => {})
      return NextResponse.json({ error: "Une vidéo de référence est requise pour le transfert de mouvement Genjutsu." }, { status: 400 })
    }

    // 2) Lancer la génération.
    // Genjutsu = motion transfer : le modele n'accepte QUE {prompt, video_url,
    // image_urls, resolution}. On n'envoie ni enhance_prompt ni motions (presets
    // de camera propres au modele DoP) : des champs inconnus peuvent faire echouer
    // la generation cote provider apres acceptation. La resolution du modele est
    // 720p (seule valeur supportee par Genjutsu v1.0), on la force.
    const payload: Record<string, unknown> = modelKey === "genjutsu"
      ? {
          image_urls: [imageUrl],
          video_url: videoUrl,
          prompt,
          resolution: "720p",
        }
      : {
          image_url: imageUrl,
          ...(videoUrl ? { video_url: videoUrl } : {}),
          prompt,
          enhance_prompt: enhance,
          resolution: quality,
          duration: durationSeconds,
        }
    if (modelKey !== "genjutsu" && motionIds.length > 0) payload.motions = motionIds.map((id) => ({ id }))
    const wallet = await reserveJetons(user.id, pricing.customerPriceUsd, "motion", { model: modelKey, quality, providerCostUsd: pricing.providerCostUsd, marginMultiplier: 2 })
    if (!wallet.ok) {
      await admin.storage.from(STORAGE_BUCKET).remove([path, ...(referencePath ? [referencePath] : [])]).catch(() => {})
      return NextResponse.json({ error: `Solde insuffisant. Cette génération coûte ${wallet.required} Jetons.`, required: wallet.required, balance: wallet.balance }, { status: 402 })
    }
    // Webhook : Higgsfield POSTera le resultat terminal (completed/failed/nsfw)
    // sur notre endpoint, ce qui finalise la video cote SERVEUR meme si l'onglet
    // est ferme. C'est le mecanisme fiable de recuperation (le polling n'est plus
    // qu'un secours). L'URL passe en query param hf_webhook (encodee).
    const webhookUrl = resolveHiggsfieldWebhookUrl(request)
    const generationUrl = webhookUrl
      ? `${HIGGSFIELD_API}/${model}?hf_webhook=${encodeURIComponent(webhookUrl)}`
      : `${HIGGSFIELD_API}/${model}`
    console.log("[Genjutsu] Requête API", { image_url: imageUrl, video_url: videoUrl ?? null, prompt, resolution: quality, providerCostUsd: pricing.providerCostUsd, customerPriceUsd: pricing.customerPriceUsd, chargedJetons: wallet.charged, webhook: webhookUrl ?? null, payload })

    // IMPORTANT : ce POST LANCE une generation FACTUREE par Higgsfield. Il n'est
    // donc PAS idempotent et ne doit JAMAIS etre reessaye : un retry (timeout ou
    // 5xx transitoire) creerait une 2e generation payante alors que la 1ere a deja
    // demarre cote provider -> double debit Higgsfield pour une seule video (bug du
    // "4 requetes / 2 videos"). On force retries: 0 et un timeout plus large (le
    // lancement peut depasser 20 s, Higgsfield telechargeant image + video source)
    // pour eviter l'abandon premature qui declenchait justement la re-soumission.
    const res = await higgsfieldFetch(
      generationUrl,
      {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      },
      { timeoutMs: 45_000, retries: 0 },
    )
    const rawResponse = await res.text()
    let json: Record<string, unknown> | null = null
    try {
      json = rawResponse ? JSON.parse(rawResponse) : null
    } catch {
      json = null
    }
    console.log("[Genjutsu] Réponse brute API", { status: res.status, response: rawResponse })

    const requestId = typeof json?.request_id === "string" ? json.request_id : ""
    if (!res.ok || !requestId) {
      await creditJetons(user.id, wallet.charged, { reason: "genjutsu_generation_failed", model: modelKey, quality })
      // Nettoyer l'image hebergee si la generation n'a pas demarre.
      await admin.storage.from(STORAGE_BUCKET).remove([path]).catch(() => {})
      const rawDetail = String(json?.detail ?? json?.message ?? json?.error ?? rawResponse ?? "")
      const detail = rawDetail.toLowerCase()
      // 413 est généralement renvoyé quand le média d’entrée est trop volumineux
      // ou quand le payload ne respecte pas le schéma du modèle.
      const errorMessage = res.status === 413
        ? "La vidéo de référence est refusée par Higgsfield : réduis sa taille ou sa durée (maximum 30 secondes), puis réessaie."
        : rawDetail || "Echec du lancement de la generation. Reessayez dans un instant."
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
            : errorMessage,
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
      requestId,
      provider: "higgsfield",
      model: modelKey,
      prompt,
    }).catch(() => {})

    // Historique DEDIE Genjutsu : on cree tout de suite une entree "processing"
    // dans le stockage permanent sous l'outil "genjutsu". La video apparait alors
    // immediatement dans l'historique de la page Genjutsu (etat "Generation..."),
    // et l'auto-reparation pourra la finaliser meme si le client quitte la page.
    if (modelKey === "genjutsu") {
      await saveVideoHistory({
        userId: user.id,
        tool: "genjutsu",
        providerRef: requestId,
        blobPathname: null,
        title: prompt.slice(0, 80) || "Genjutsu",
        status: "processing",
        creditsCost: wallet.charged,
      }).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      request_id: requestId,
      status: typeof json?.status === "string" ? json.status : "queued",
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
