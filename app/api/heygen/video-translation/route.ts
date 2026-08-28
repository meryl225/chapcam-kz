import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { translationQuotaForPlan, TRANSLATION_MAX_SECONDS } from "@/lib/plans"
import {
  getTranslationBalance,
  addTranslationCredits,
  deductTranslationCredits,
  refundTranslationCredits,
} from "@/lib/translation-quota"
import { logToolUsage } from "@/lib/tool-usage"
import {
  saveVideoHistory,
  finalizeCompletedVideo,
  failGenerationAndGetRefund,
} from "@/lib/video-history"

// === Traduction Video (HeyGen video-translation v3) ===
// Flux : upload video -> asset_id, puis POST /v3/video-translations (1 langue),
// puis polling GET /v3/video-translations/{id}. Facturation en credits :
// mode Rapide = 1 credit, mode Precision = 2 credits. La video source est
// plafonnee a 60s cote client pour borner le cout HeyGen.

// Le re-hebergement Blob (telechargement de la video finale + upload) peut etre
// long : on laisse une large marge pour ne pas couper la finalisation.
export const maxDuration = 300

const HEYGEN_API = "https://api.heygen.com"
const HEYGEN_UPLOAD = "https://upload.heygen.com/v1/asset"
const MAX_VIDEO = 60 * 1024 * 1024 // 60 Mo (une video <=60s en 720p reste legere)

function getApiKey(): string | null {
  return process.env.HEYGEN_API_KEY || null
}

// Cout en credits selon le mode de traduction.
function creditCost(mode: string): number {
  return mode === "precision" ? 2 : 1
}

// Seed unique : un abonne actif recoit le quota Traduction de son forfait la
// premiere fois qu'il utilise la fonctionnalite (comme Motion / photo-video).
async function ensureCreditsForActiveSub(userId: string, planId: string): Promise<number> {
  const { balance, exists } = await getTranslationBalance(userId)
  if (exists) return balance
  const quota = translationQuotaForPlan(planId)
  if (quota <= 0) return 0
  return addTranslationCredits(userId, quota)
}

// Recupere l'abonnement actif + le solde effectif (avec seed si besoin).
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
    : (await getTranslationBalance(userId)).balance
  return { balance, subActive, plan: subActive ? sub!.plan : null }
}

// GET : langues (?info=languages), solde (?info=quota) ou statut (?id=...).
export async function GET(request: NextRequest) {
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

  // Liste des langues cibles disponibles.
  if (params.get("info") === "languages") {
    try {
      const res = await fetch(`${HEYGEN_API}/v3/video-translations/languages`, {
        headers: { "X-Api-Key": apiKey },
      })
      const json = await res.json()
      const languages: string[] = json?.data?.languages ?? []
      return NextResponse.json({ success: true, languages })
    } catch {
      return NextResponse.json({ success: false, languages: [] })
    }
  }

  // Solde de credits Traduction.
  if (params.get("info") === "quota") {
    const { balance, plan } = await resolveBalance(supabase, user.id)
    return NextResponse.json({ success: true, plan, remaining: Math.max(0, balance) })
  }

  // Statut d'une traduction.
  const id = params.get("id")
  if (!id) {
    return NextResponse.json({ error: "Parametre id manquant." }, { status: 400 })
  }
  try {
    const res = await fetch(`${HEYGEN_API}/v3/video-translations/${encodeURIComponent(id)}`, {
      headers: { "X-Api-Key": apiKey },
    })
    const json = await res.json()
    const data = json?.data
    if (!res.ok || !data) {
      return NextResponse.json({ status: "failed", error: json?.error?.message || "Statut indisponible." })
    }
    // Normalisation des statuts HeyGen -> etats simples pour le client.
    const raw = String(data.status || "").toLowerCase()
    let status: "pending" | "processing" | "completed" | "failed" = "processing"
    if (raw === "success" || raw === "completed") status = "completed"
    else if (raw === "failed" || raw === "error") status = "failed"
    else if (raw === "pending") status = "pending"

    const providerUrl = data.url || data.video_url || null

    // Vrai motif d'echec renvoye par HeyGen (ex: "No speaker is detected...",
    // langue d'entree incorrecte). HeyGen le place dans `failure_message`.
    const failureReason: string | null =
      data.failure_message || data.message || data.error || null

    // ECHEC : rembourser le credit deduit au lancement, EXACTEMENT UNE FOIS.
    // La transition atomique processing->failed garantit l'idempotence meme si
    // le client interroge le statut en boucle.
    if (status === "failed") {
      try {
        const refund = await failGenerationAndGetRefund(user.id, "translation", id)
        if (refund > 0) {
          await refundTranslationCredits(user.id, refund)
          console.log(`[Translation] Echec HeyGen -> ${refund} credit(s) rembourse(s) a ${user.id}`)
        }
      } catch (e) {
        console.error("[Translation] Remboursement sur echec impossible:", e)
      }
    }

    // IMPORTANT (anti spinner infini) : des que HeyGen a fini, la traduction
    // DOIT etre montree a l'utilisateur. On tente une copie Blob permanente
    // (les URLs HeyGen expirent), mais on ne BLOQUE JAMAIS l'affichage dessus :
    // si elle n'est pas encore prete, on sert l'URL fournisseur (valide ~7j) et
    // on declare "completed". La copie permanente est ensuite garantie par
    // l'auto-reparation de la galerie « Mes videos ».
    let effectiveStatus = status
    let outUrl: string | null = providerUrl
    if (status === "completed" && providerUrl) {
      try {
        const fin = await finalizeCompletedVideo({
          userId: user.id,
          tool: "translation",
          providerRef: id,
          providerUrl,
          title: data.output_language ? `Traduction · ${data.output_language}` : "Traduction Vidéo",
        })
        outUrl = fin.state === "ready" || fin.state === "fallback" ? fin.url : providerUrl
      } catch (e) {
        console.error("[Translation] Finalisation historique (non bloquant):", e)
        outUrl = providerUrl
      }
      effectiveStatus = "completed"
    }

    return NextResponse.json({
      status: effectiveStatus,
      video_url: outUrl,
      output_language: data.output_language || null,
      error: status === "failed" ? (failureReason || "Traduction échouée.") : null,
      // Indique au client que le credit a ete rendu (aucune facturation sur echec).
      refunded: status === "failed",
    })
  } catch {
    return NextResponse.json({ status: "processing" })
  }
}

// POST : upload la video source + lance la traduction dans 1 langue.
// multipart/form-data : file (video), language (nom exact), mode (speed|precision),
// caption ("true"|"false").
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
    const language = (form.get("language") as string | null)?.trim() || ""
    const modeRaw = (form.get("mode") as string | null)?.trim() || "speed"
    const mode = modeRaw === "precision" ? "precision" : "speed"
    const caption = (form.get("caption") as string | null) === "true"

    if (!file) {
      return NextResponse.json({ error: "Video source manquante." }, { status: 400 })
    }
    if (!file.type.startsWith("video/")) {
      return NextResponse.json({ error: "Le fichier doit etre une video." }, { status: 400 })
    }
    if (file.size > MAX_VIDEO) {
      return NextResponse.json({ error: `Video trop volumineuse (max 60 Mo / ~${TRANSLATION_MAX_SECONDS}s).` }, { status: 400 })
    }
    if (!language) {
      return NextResponse.json({ error: "Choisis une langue cible." }, { status: 400 })
    }

    const cost = creditCost(mode)

    // Verifier le SOLDE avant tout appel HeyGen (protege la marge).
    const { balance, subActive } = await resolveBalance(supabase, user.id)
    if (balance < cost) {
      return NextResponse.json(
        {
          error: subActive
            ? `Crédits Traduction insuffisants (il en faut ${cost}). Achète un pack ou passe à un forfait supérieur.`
            : "Aucun crédit Traduction. Choisis un forfait Premium/VIP ou achète un pack.",
          code: subActive ? "quota_exhausted" : "no_plan",
          remaining: Math.max(0, balance),
          needed: cost,
        },
        { status: 402 },
      )
    }

    // 1) Upload de la video vers HeyGen -> asset_id.
    const bytes = Buffer.from(await file.arrayBuffer())
    const contentType = file.type || "video/mp4"
    const uploadRes = await fetch(HEYGEN_UPLOAD, {
      method: "POST",
      headers: { "X-Api-Key": apiKey, "Content-Type": contentType },
      body: bytes,
    })
    const uploadJson = await uploadRes.json().catch(() => null)
    const assetId = uploadJson?.data?.id
    if (!uploadRes.ok || !assetId) {
      return NextResponse.json(
        { error: "Echec de l'upload de la video vers HeyGen.", detail: uploadJson?.error?.message || "" },
        { status: 502 },
      )
    }

    // 2) Lancer la traduction (1 langue).
    const payload: Record<string, unknown> = {
      video: { type: "asset_id", asset_id: assetId },
      output_languages: [language],
      title: `ChapCam-${user.id.slice(0, 8)}`,
      mode,
      enable_caption: caption,
      enable_speech_enhancement: true,
    }
    const subRes = await fetch(`${HEYGEN_API}/v3/video-translations`, {
      method: "POST",
      headers: { "X-Api-Key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const subJson = await subRes.json().catch(() => null)
    const translateId = subJson?.data?.video_translation_ids?.[0]
    if (!subRes.ok || !translateId) {
      return NextResponse.json(
        { error: subJson?.error?.message || "Echec du lancement de la traduction." },
        { status: 502 },
      )
    }

    // 3) Deduire les credits UNIQUEMENT apres soumission reussie.
    const remaining = await deductTranslationCredits(user.id, cost)

    // 3b) Enregistrer le job en cours AVEC son cout : si HeyGen echoue plus tard
    //     (ex: aucune voix detectee, mauvaise langue), le handler de statut
    //     remboursera EXACTEMENT ce montant, une seule fois.
    try {
      await saveVideoHistory({
        userId: user.id,
        tool: "translation",
        providerRef: translateId,
        blobPathname: null,
        title: `Traduction · ${language}`,
        status: "processing",
        creditsCost: cost,
      })
    } catch (e) {
      console.error("[Translation] Enregistrement du job en cours impossible:", e)
    }

    // Journaliser la consommation par utilisateur (suivi admin + cout fournisseur estime).
    await logToolUsage({
      userId: user.id,
      tool: 'translation',
      credits: cost,
      precision: mode === 'precision',
      meta: { language, mode },
    })

    return NextResponse.json({
      success: true,
      id: translateId,
      mode,
      status: "pending",
      cost,
      remaining: Math.max(0, remaining),
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message || "Erreur serveur." }, { status: 500 })
  }
}
