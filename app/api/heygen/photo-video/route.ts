import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { photoVideoQuotaForPlan } from "@/lib/plans"
import { countGenerationsSince, logGeneration } from "@/lib/photo-video-quota"

// --- Studio Photo en Video (HeyGen Avatar IV) ---
// La photo-video est DECOUPLEE des points/minutes du Live Swap : elle est
// incluse dans les forfaits sous forme de QUOTA (2 a 10 videos selon le forfait).
// La parole FR fait ~14 caracteres/seconde -> on borne la longueur du texte.
const CHARS_PER_SECOND = 14
// Duree maximale autorisee par video.
const MAX_SECONDS = 60
const MAX_SCRIPT_CHARS = MAX_SECONDS * CHARS_PER_SECOND // ~840 caracteres

// Estime la duree (en secondes) d'un script (pour l'affichage/plafonnement).
function estimateSeconds(script: string): number {
  return Math.min(MAX_SECONDS, Math.max(2, Math.ceil(script.length / CHARS_PER_SECOND)))
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
    // Gestes / mouvements de l'avatar (bisou, cheveux, clin d'oeil...) decrits
    // en anglais pour HeyGen, et niveau d'expressivite (low | medium | high).
    const motionPrompt = (form.get("motion_prompt") as string | null)?.trim() || ""
    const expressivenessRaw = (form.get("expressiveness") as string | null)?.trim() || ""
    const expressiveness = ["low", "medium", "high"].includes(expressivenessRaw) ? expressivenessRaw : ""
    // Echantillon vocal optionnel : si fourni, on clone la voix de l'utilisateur
    // le temps de la generation (clone jetable), puis on la supprime.
    const voiceSample = form.get("voice_sample") as File | null
    const useClone = !!voiceSample && voiceSample.size > 0

    if (!file) {
      return NextResponse.json({ error: "Photo manquante." }, { status: 400 })
    }
    if (!script) {
      return NextResponse.json({ error: "Le prompt (texte a dire) est requis." }, { status: 400 })
    }
    if (!voiceId && !useClone) {
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
    if (useClone && voiceSample!.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: "Echantillon vocal trop volumineux (max 15 Mo)." }, { status: 400 })
    }

    const estimatedSeconds = estimateSeconds(script)

    // Verifier le QUOTA photo-video AVANT tout appel HeyGen.
    // Quota = celui du forfait Live Swap actif ; usage = videos generees depuis
    // le debut du forfait (start_date, reinitialise a chaque achat).
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plan, start_date, end_date, is_active")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("end_date", { ascending: false })
      .limit(1)
      .maybeSingle()

    const nowMs = Date.now()
    const subActive = !!sub && !!sub.end_date && new Date(sub.end_date).getTime() > nowMs
    const quota = subActive ? photoVideoQuotaForPlan(sub!.plan) : 0
    if (!subActive || quota <= 0) {
      return NextResponse.json(
        { error: "Aucun forfait Live Swap actif. Achete un forfait pour utiliser le Studio Photo en Video.", code: "no_plan" },
        { status: 402 },
      )
    }
    const periodStart = sub!.start_date ? new Date(sub!.start_date) : new Date(0)
    const used = await countGenerationsSince(user.id, periodStart)
    if (used >= quota) {
      return NextResponse.json(
        {
          error: `Quota Studio Photo en Video epuise (${used}/${quota}). Renouvelle ou passe a un forfait superieur.`,
          code: "quota_exhausted",
          quota,
          used,
        },
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

    // 1bis) Clonage de voix jetable (si un echantillon vocal est fourni).
    let effectiveVoiceId = voiceId
    let cloneVoiceId: string | null = null
    if (useClone) {
      const audioBytes = Buffer.from(await voiceSample!.arrayBuffer())
      const audioType = voiceSample!.type || "audio/mpeg"
      const audioUpload = await fetch(HEYGEN_UPLOAD, {
        method: "POST",
        headers: { "X-Api-Key": apiKey, "Content-Type": audioType },
        body: audioBytes,
      })
      const audioJson = await audioUpload.json().catch(() => null)
      const audioAssetId = audioJson?.data?.id
      if (!audioUpload.ok || !audioAssetId) {
        return NextResponse.json(
          { error: "Echec de l'upload de l'echantillon vocal.", detail: audioJson?.message || "" },
          { status: 502 },
        )
      }
      const cloneRes = await fetch(`${HEYGEN_API}/v3/voices/clone`, {
        method: "POST",
        headers: { "X-Api-Key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          audio: { type: "asset_id", asset_id: audioAssetId },
          voice_name: `chapcam_${user.id.slice(0, 8)}_${Date.now()}`,
        }),
      })
      const cloneJson = await cloneRes.json().catch(() => null)
      cloneVoiceId = cloneJson?.data?.voice_clone_id || null
      if (!cloneRes.ok || !cloneVoiceId) {
        return NextResponse.json(
          {
            error:
              cloneJson?.error?.code === "voice_clone_limit_reached"
                ? "Limite de clonage atteinte cote serveur. Reessayez dans un instant."
                : "Echec du clonage de la voix. Verifiez que l'extrait est clair (10-30s).",
            detail: cloneJson?.error?.code || "",
          },
          { status: 502 },
        )
      }
      effectiveVoiceId = cloneVoiceId
    }

    // 2) Creation de la video (Avatar IV, type image = photo qui parle)
    const payload: Record<string, unknown> = {
      type: "image",
      script,
      voice_id: effectiveVoiceId,
      image: { type: "asset_id", asset_id: assetId },
      title: "ChapCam",
    }
    // Gestes (motion_prompt) et expressivite : uniquement s'ils sont fournis.
    if (motionPrompt) payload.motion_prompt = motionPrompt
    if (expressiveness) payload.expressiveness = expressiveness

    const createRes = await fetch(`${HEYGEN_API}/v3/videos`, {
      method: "POST",
      headers: { "X-Api-Key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const createJson = await createRes.json().catch(() => null)

    // En cas d'echec, supprimer le clone jetable pour ne pas saturer les 10 slots.
    const cleanupClone = async () => {
      if (cloneVoiceId) {
        await fetch(`${HEYGEN_API}/v3/voices/${cloneVoiceId}`, {
          method: "DELETE",
          headers: { "X-Api-Key": apiKey },
        }).catch(() => {})
      }
    }

    if (createRes.status === 402) {
      // Credits HeyGen epuises : NE PAS deduire les points de l'utilisateur.
      await cleanupClone()
      return NextResponse.json(
        { error: "Le service de generation HeyGen n'a plus de credits. Contactez l'administrateur.", code: "heygen_no_credit" },
        { status: 402 },
      )
    }
    const videoId = createJson?.data?.video_id || createJson?.video_id
    if (!createRes.ok || !videoId) {
      await cleanupClone()
      return NextResponse.json(
        { error: createJson?.error?.message || "Echec de la creation de la video.", detail: createJson?.error?.code || "" },
        { status: 502 },
      )
    }

    // 3) Consommer 1 unite de quota seulement apres succes de la creation.
    await logGeneration(user.id, String(videoId))

    return NextResponse.json({
      success: true,
      video_id: videoId,
      // Le client renverra cet id a la route GET pour supprimer le clone une
      // fois la video terminee (le supprimer avant ferait echouer la video).
      clone_voice_id: cloneVoiceId,
      estimated_seconds: estimatedSeconds,
      quota,
      used: used + 1,
      remaining: quota - (used + 1),
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

    const params = new URL(request.url).searchParams

    // Mode "quota" : renvoie le quota Studio Photo en Video de l'utilisateur.
    if (params.get("info") === "quota") {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("plan, start_date, end_date, is_active")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("end_date", { ascending: false })
        .limit(1)
        .maybeSingle()

      const subActive = !!sub && !!sub.end_date && new Date(sub.end_date).getTime() > Date.now()
      const quota = subActive ? photoVideoQuotaForPlan(sub!.plan) : 0
      let used = 0
      if (subActive && quota > 0) {
        const periodStart = sub!.start_date ? new Date(sub!.start_date) : new Date(0)
        used = await countGenerationsSince(user.id, periodStart)
      }
      return NextResponse.json({
        success: true,
        plan: subActive ? sub!.plan : null,
        quota,
        used,
        remaining: Math.max(0, quota - used),
      })
    }

    const videoId = params.get("video_id")
    const cloneVoiceId = params.get("clone_voice_id")
    if (!videoId) {
      return NextResponse.json({ error: "video_id requis" }, { status: 400 })
    }

    const res = await fetch(`${HEYGEN_API}/v1/video_status.get?video_id=${encodeURIComponent(videoId)}`, {
      headers: { "X-Api-Key": apiKey },
    })
    const json = await res.json().catch(() => null)
    const data = json?.data || {}

    // Video terminee (ou echouee) : supprimer le clone jetable pour liberer un
    // slot HeyGen (limite de 10 voix clonees par compte).
    if (cloneVoiceId && (data.status === "completed" || data.status === "failed")) {
      await fetch(`${HEYGEN_API}/v3/voices/${cloneVoiceId}`, {
        method: "DELETE",
        headers: { "X-Api-Key": apiKey },
      }).catch(() => {})
    }

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
