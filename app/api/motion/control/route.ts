import { NextRequest, NextResponse } from "next/server"
import { put, del } from "@vercel/blob"
import { createClient } from "@/lib/supabase/server"
import { motionQuotaForPlan } from "@/lib/plans"
import { getMotionBalance, addMotionCredits, deductMotionCredit } from "@/lib/motion-quota"
import {
  createMotionJob,
  markMotionJobCompleted,
  markMotionJobFailed,
  listMotionJobs,
  getMotionJobInputPaths,
  clearMotionJobInputPaths,
} from "@/lib/motion-jobs"
import { logToolUsage } from "@/lib/tool-usage"
import { rehostToBlob, saveVideoHistory, isAlreadyRehosted, getBlobPathnamesByRef } from "@/lib/video-history"
import {
  submitMotionControl,
  getMotionTask,
  isModerationError,
  MODERATION_MESSAGE,
  getKlingApiKey,
} from "@/lib/kling"

// --- Motion Control REEL (Kling Motion Control 3.0, API NATIVE) ---
// On transfere le mouvement d'une VIDEO de reference sur une IMAGE de personnage,
// via l'endpoint officiel POST /motion-control/kling-3.0 de Kling AI.
//
// Flux : on uploade image + video dans le Blob PUBLIC temporaire (Kling exige
// des URLs telechargeables), on soumet la tache avec un callback_url, puis :
//   - le webhook /api/webhook/kling finalise cote SERVEUR (meme onglet ferme) ;
//   - en secours, le client poll GET ?request_id=... (id de tache Kling).
// Les fichiers d'entree temporaires sont supprimes en fin de tache.
//
// Facturation : INCHANGEE. 1 credit Motion par generation, deduit apres une
// soumission reussie, rembourse une seule fois si la generation echoue (dont
// refus de moderation).

// Runtime Node.js requis (Blob + Neon), et marge de temps pour l'upload des
// fichiers d'entree vers le Blob puis la soumission a Kling.
export const runtime = "nodejs"
export const maxDuration = 120

// Tiers UI (standard/pro) -> resolution Kling. On conserve la meme UI et la meme
// logique de credits ; seul le rendu de sortie change (720p vs 1080p).
const RESOLUTION_BY_TIER: Record<string, "720p" | "1080p"> = {
  standard: "720p",
  pro: "1080p",
}
const DEFAULT_TIER = "standard"

const MAX_IMAGE = 10 * 1024 * 1024 // 10 Mo
const MAX_VIDEO = 30 * 1024 * 1024 // 30 Mo (une video de reference <=10s est legere)

// Seed unique : un abonne actif recoit le quota Motion de son forfait la
// premiere fois qu'il utilise la fonctionnalite (comme la photo-video).
async function ensureCreditsForActiveSub(userId: string, planId: string): Promise<number> {
  const { balance, exists } = await getMotionBalance(userId)
  if (exists) return balance
  const quota = motionQuotaForPlan(planId)
  if (quota <= 0) return 0
  return addMotionCredits(userId, quota)
}

// Recupere l'abonnement actif + le solde Motion effectif (avec seed si besoin).
async function resolveBalance(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<{ balance: number; subActive: boolean; plan: string | null }> {
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan, end_date, expires_at, is_active")
    .eq("user_id", userId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle()
  const subEnd = sub?.end_date ?? sub?.expires_at ?? null
  const subActive = !!sub && !!subEnd && new Date(subEnd).getTime() > Date.now()
  const balance = subActive
    ? await ensureCreditsForActiveSub(userId, sub!.plan)
    : (await getMotionBalance(userId)).balance
  return { balance, subActive, plan: subActive ? sub!.plan : null }
}

// Supprime les fichiers Blob PUBLICS temporaires (image + video) d'un job, puis
// vide la colonne. Non bloquant : les erreurs sont seulement journalisees.
async function cleanupInputs(userId: string, requestId: string): Promise<void> {
  try {
    const paths = await getMotionJobInputPaths(userId, requestId)
    if (paths.length === 0) return
    await Promise.allSettled(paths.map((p) => del(p)))
    await clearMotionJobInputPaths(userId, requestId).catch(() => {})
  } catch (e) {
    console.error("[MotionControl] Nettoyage des fichiers temporaires echoue:", e)
  }
}

// Calcule l'URL absolue du webhook Kling a partir de la requete entrante
// (ou de NEXT_PUBLIC_SITE_URL si defini). Renvoie undefined si indeterminable :
// dans ce cas, seul le polling de secours finalise la tache.
function resolveCallbackUrl(request: NextRequest): string | undefined {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL
  if (explicit) return `${explicit.replace(/\/$/, "")}/api/webhook/kling`
  const proto = request.headers.get("x-forwarded-proto") || "https"
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host")
  return host ? `${proto}://${host}/api/webhook/kling` : undefined
}

// GET : statut d'une generation Kling (?request_id=...)
// ou solde de credits Motion (?info=quota) ou historique (?info=history).
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 })
  }

  const params = new URL(request.url).searchParams

  // Mode "quota" : solde de credits Motion.
  if (params.get("info") === "quota") {
    const { balance, plan } = await resolveBalance(supabase, user.id)
    return NextResponse.json({ success: true, plan, remaining: Math.max(0, balance) })
  }

  // Mode "history" : liste des generations Motion de l'utilisateur (persistees).
  if (params.get("info") === "history") {
    try {
      const jobs = await listMotionJobs(user.id, 30)
      // Preferer la copie Blob PERMANENTE quand elle existe : les URLs Kling
      // expirent (30 jours), donc on remplace video_url par la route Blob durable
      // pour les clips deja re-heberges. Les autres gardent leur URL fournisseur.
      const blobByRef: Record<string, string> = await getBlobPathnamesByRef(user.id, "motion").catch(() => ({}))
      const durableJobs = jobs.map((j) => {
        const pathname = blobByRef[j.request_id]
        return pathname
          ? { ...j, video_url: `/api/videos/file?pathname=${encodeURIComponent(pathname)}` }
          : j
      })
      return NextResponse.json({ success: true, jobs: durableJobs })
    } catch {
      return NextResponse.json({ success: true, jobs: [] })
    }
  }

  const requestId = params.get("request_id")
  if (!requestId) {
    return NextResponse.json({ error: "request_id requis" }, { status: 400 })
  }

  // Termine un job en echec : marque le job (idempotent) et REMBOURSE 1 credit
  // Motion la premiere fois seulement. Kling ne facture pas un rendu refuse par
  // la moderation, donc l'utilisateur ne doit pas perdre son credit.
  const finishAsFailed = async (rawMsg: string) => {
    const moderated = isModerationError(rawMsg)
    const justFailed = await markMotionJobFailed(user.id, requestId).catch(() => false)
    let remaining: number | undefined
    if (justFailed) {
      remaining = await addMotionCredits(user.id, 1).catch(() => undefined)
    }
    // Les fichiers d'entree ne servent plus : on les supprime.
    await cleanupInputs(user.id, requestId)
    return NextResponse.json({
      success: true,
      status: "failed",
      code: moderated ? "moderation" : "failed",
      error: moderated
        ? MODERATION_MESSAGE
        : "La generation a echoue. Reessaie ou change d'image/video.",
      refunded: justFailed,
      ...(typeof remaining === "number" ? { remaining: Math.max(0, remaining) } : {}),
    })
  }

  try {
    const task = await getMotionTask(requestId)

    if (task.status === "failed") {
      return finishAsFailed(task.message)
    }

    if (task.status === "succeeded") {
      const videoUrl = task.videoUrl
      let historyUrl: string | null = null
      if (videoUrl) {
        await markMotionJobCompleted(user.id, requestId, videoUrl).catch(() => {})
        // Historique PERMANENT : les URLs Kling expirent -> re-hebergement Blob
        // prive (idempotent via isAlreadyRehosted).
        try {
          const already = await isAlreadyRehosted(user.id, "motion", requestId)
          if (!already) {
            const pathname = await rehostToBlob(videoUrl, user.id, "motion", requestId)
            await saveVideoHistory({
              userId: user.id,
              tool: "motion",
              providerRef: requestId,
              blobPathname: pathname,
              title: "Motion Control",
              status: "completed",
            })
            if (pathname) historyUrl = `/api/videos/file?pathname=${encodeURIComponent(pathname)}`
          }
        } catch (e) {
          console.error("[MotionControl] Historique non enregistre:", e)
        }
        // Fichiers d'entree devenus inutiles.
        await cleanupInputs(user.id, requestId)
      }
      return NextResponse.json({ success: true, status: "completed", video_url: historyUrl || videoUrl })
    }

    // submitted | processing
    return NextResponse.json({
      success: true,
      status: task.status === "processing" ? "in_progress" : "queued",
      video_url: null,
    })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    console.error("[MotionControl] status error:", detail)
    // Une erreur transitoire de polling ne doit PAS marquer le job en echec
    // (le webhook peut encore finaliser). On renvoie un statut "en cours".
    return NextResponse.json({ success: true, status: "in_progress", video_url: null })
  }
}

// POST : lance un transfert de mouvement Kling. multipart/form-data :
// image (File requis), video (File requis), prompt (opt), model (standard|pro),
// orientation (video|image), keep_sound (bool)
export async function POST(request: NextRequest) {
  // Chemins Blob temporaires uploades : on les garde pour pouvoir nettoyer en
  // cas d'echec de soumission (sinon ils resteraient publics inutilement).
  const uploadedPaths: string[] = []
  try {
    if (!getKlingApiKey()) {
      return NextResponse.json(
        { error: "Cle API Kling manquante cote serveur. Ajoute KLING_API_KEY." },
        { status: 500 },
      )
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
    const tierKey = (form.get("model") as string | null)?.trim() === "pro" ? "pro" : "standard"
    // 'video' = suit le mouvement de la video (max 30s), 'image' = suit l'orientation
    // de l'image (max 10s). Par defaut on privilegie le mouvement.
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
      return NextResponse.json({ error: "Video de reference trop volumineuse (max 30 Mo / ~10s)." }, { status: 400 })
    }

    // Verifier le SOLDE de credits Motion AVANT tout upload/appel Kling.
    const { balance, subActive } = await resolveBalance(supabase, user.id)
    if (balance <= 0) {
      return NextResponse.json(
        {
          error: subActive
            ? "Credits Motion Control epuises. Passe a un forfait superieur pour en obtenir plus."
            : "Aucun forfait actif incluant le Motion Control. Choisis Premium, VIP PRO ou VIP DEBOUT.",
          code: subActive ? "quota_exhausted" : "no_plan",
          remaining: 0,
        },
        { status: 402 },
      )
    }

    // Kling exige des URLs PUBLIQUES telechargeables pour l'image et la video.
    // On les uploade dans le Blob public sous un prefixe temporaire ; ils seront
    // supprimes en fin de tache (succes/echec) via cleanupInputs.
    const stamp = Date.now()
    const imgExt = image.type === "image/png" ? "png" : image.type === "image/webp" ? "webp" : "jpg"
    const vidExt = video.type === "video/webm" ? "webm" : video.type === "video/quicktime" ? "mov" : "mp4"
    const imgBuf = Buffer.from(await image.arrayBuffer())
    const vidBuf = Buffer.from(await video.arrayBuffer())

    const imageBlob = await put(`motion-input/${user.id}/${stamp}-image.${imgExt}`, imgBuf, {
      access: "public",
      contentType: image.type,
    })
    uploadedPaths.push(imageBlob.pathname)
    const videoBlob = await put(`motion-input/${user.id}/${stamp}-video.${vidExt}`, vidBuf, {
      access: "public",
      contentType: video.type,
    })
    uploadedPaths.push(videoBlob.pathname)

    // Soumission a Kling Motion Control 3.0 avec callback pour la finalisation
    // serveur-a-serveur (le polling reste un secours cote client).
    const { taskId } = await submitMotionControl({
      imageUrl: imageBlob.url,
      videoUrl: videoBlob.url,
      prompt,
      orientation,
      resolution: RESOLUTION_BY_TIER[tierKey] || RESOLUTION_BY_TIER[DEFAULT_TIER],
      audio: keepSound ? "original" : "off",
      callbackUrl: resolveCallbackUrl(request),
      externalTaskId: `${user.id.slice(0, 8)}-${stamp}`,
    })

    // Persister le job AVANT de repondre : l'historique, la reprise du polling et
    // le webhook (qui retrouve le proprietaire par request_id) en dependent.
    await createMotionJob({
      userId: user.id,
      requestId: taskId,
      provider: "kling",
      model: tierKey,
      prompt,
      inputPaths: uploadedPaths,
    }).catch(() => {})

    // Deduire 1 credit UNIQUEMENT apres une soumission Kling reussie.
    const remaining = await deductMotionCredit(user.id)

    // Journaliser la consommation par utilisateur (suivi admin + cout estime).
    await logToolUsage({
      userId: user.id,
      tool: "motion",
      credits: 1,
      meta: { model: tierKey, provider: "kling" },
    })

    return NextResponse.json({
      success: true,
      request_id: taskId,
      model: tierKey,
      status: "queued",
      remaining: Math.max(0, remaining),
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erreur serveur"
    console.error("[MotionControl Error]", msg)
    // La soumission a echoue : supprimer les fichiers temporaires deja uploades.
    if (uploadedPaths.length) {
      await Promise.allSettled(uploadedPaths.map((p) => del(p))).catch(() => {})
    }
    const lower = msg.toLowerCase()
    // 1) Refus de moderation au lancement (image/video/prompt refuses). Aucun
    //    credit Motion deduit a ce stade.
    if (isModerationError(msg)) {
      return NextResponse.json(
        { error: MODERATION_MESSAGE, code: "moderation", detail: msg.slice(0, 200) },
        { status: 422 },
      )
    }
    // 2) Compte Kling a court de credits (cote plateforme, pas l'utilisateur).
    const noCredits =
      lower.includes("balance") ||
      lower.includes("insufficient") ||
      lower.includes("quota") ||
      lower.includes("resource pack") ||
      lower.includes("credit")
    return NextResponse.json(
      {
        error: noCredits
          ? "Le compte Kling n'a plus de credits. Contactez l'administrateur."
          : "Echec du lancement de la generation.",
        code: noCredits ? "no_credit" : "failed",
        detail: msg.slice(0, 200),
      },
      { status: noCredits ? 402 : 502 },
    )
  }
}
