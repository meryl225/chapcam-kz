import { NextRequest, NextResponse } from "next/server"
import {
  finalizeCompletedVideo,
  findUserByProviderRef,
  failGenerationAndGetRefund,
} from "@/lib/video-history"
import { markMotionJobCompleted, markMotionJobFailed } from "@/lib/motion-jobs"
import { creditJetons } from "@/lib/jetons"

// ============================================================
// Webhook Higgsfield (Genjutsu / DoP) : notification serveur-a-serveur quand une
// generation atteint un etat terminal (completed / failed / nsfw).
//
// POURQUOI : jusqu'ici le resultat n'etait recupere QUE par polling client et
// reconciliation a l'ouverture de la page. Si l'utilisateur ferme l'onglet
// pendant le rendu (plusieurs minutes pour une video), rien ne finalisait la
// video -> elle restait bloquee sur "Generation..." alors qu'elle etait prete
// (et facturee). Le webhook fait le travail cote SERVEUR, independamment du
// client :
//   - re-heberge la video terminee dans le store permanent + historique
//     "completed" (idempotent) ;
//   - en cas d'echec, rembourse EXACTEMENT le cout, une seule fois.
//
// SECURITE : Higgsfield n'envoie PAS de signature (cf. doc "Webhooks"). Le corps
// n'est donc pas fiable a lui seul. On se protege ainsi :
//   - on ne traite que des request_id DEJA connus (une ligne "processing" existe,
//     avec le user_id) : un request_id inconnu est acquitte puis ignore ;
//   - avant tout REMBOURSEMENT, on RE-VERIFIE l'echec aupres de l'endpoint de
//     statut AUTHENTIFIE (empeche un remboursement provoque par un faux "failed").
// Le middleware exempte deja tout chemin "/webhook" de l'anti-scraping.
// ============================================================

export const runtime = "nodejs"
// Le re-hebergement telecharge la video puis l'uploade : marge de temps pour ne
// pas etre coupe par le timeout serverless.
export const maxDuration = 120

const HIGGSFIELD_API = "https://api.higgsfield.ai"

// Auth Higgsfield : l'endpoint de statut exige Authorization: "Key {id}:{secret}".
// On envoie aussi hf-api-key/hf-secret pour compatibilite avec la surface legacy.
function higgsfieldAuthHeaders(): Record<string, string> | null {
  const key = process.env.HIGGSFIELD_API_KEY
  if (!key) return null
  const idx = key.indexOf(":")
  if (idx === -1) return { "hf-api-key": key, Authorization: `Key ${key}` }
  const id = key.slice(0, idx)
  const secret = key.slice(idx + 1)
  return { "hf-api-key": id, "hf-secret": secret, Authorization: `Key ${id}:${secret}` }
}

// Extrait l'URL de la video finale, quelle que soit la forme du payload/statut.
function extractVideoUrl(obj: Record<string, any> | null | undefined): string | null {
  if (!obj) return null
  return (
    obj.video?.url ||
    obj.video_url ||
    (Array.isArray(obj.videos) ? obj.videos[0]?.url : null) ||
    obj.result?.url ||
    obj.result?.video?.url ||
    (Array.isArray(obj.results) ? obj.results[0]?.url || obj.results[0]?.video?.url : null) ||
    obj.output?.url ||
    obj.output?.video?.url ||
    null
  )
}

// Interroge l'endpoint AUTHENTIFIE pour connaitre l'etat terminal reel d'une
// generation. Sert (1) a recuperer l'URL faisant autorite si le payload webhook
// ne la contient pas, (2) a confirmer un echec avant remboursement.
async function fetchAuthoritativeStatus(
  requestId: string,
): Promise<{ status: string; videoUrl: string | null } | null> {
  const auth = higgsfieldAuthHeaders()
  if (!auth) return null
  try {
    const res = await fetch(
      `${HIGGSFIELD_API}/requests/${encodeURIComponent(requestId)}/status`,
      { headers: auth },
    )
    if (!res.ok) return null
    const json = (await res.json().catch(() => null)) as Record<string, any> | null
    if (!json) return null
    return { status: String(json.status || "unknown"), videoUrl: extractVideoUrl(json) }
  } catch {
    return null
  }
}

// Sonde de sante : verifie d'un coup d'oeil que la route est deployee.
export async function GET() {
  return NextResponse.json({ ok: true, service: "higgsfield-webhook" })
}

export async function POST(request: NextRequest) {
  let event: {
    request_id?: string
    status?: string
    error?: string | null
    payload?: Record<string, any> | null
  }
  try {
    event = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }

  const requestId = String(event?.request_id || "")
  const status = String(event?.status || "")
  // Corps ne respectant pas l'enveloppe documentee -> refuser (cf. doc).
  if (!requestId || !status) {
    return NextResponse.json({ error: "invalid envelope" }, { status: 400 })
  }

  // Retrouver le proprietaire par request_id (aucune session dans un webhook).
  // On tente l'outil genjutsu puis motion (DoP) : le meme endpoint sert les deux.
  let tool: "genjutsu" | "motion" = "genjutsu"
  let userId = await findUserByProviderRef("genjutsu", requestId).catch(() => null)
  if (!userId) {
    const motionUser = await findUserByProviderRef("motion", requestId).catch(() => null)
    if (motionUser) {
      userId = motionUser
      tool = "motion"
    }
  }
  // request_id inconnu (livraison non sollicitee / test) : acquitter sans agir.
  if (!userId) {
    return NextResponse.json({ ok: true, ignored: "unknown request" })
  }

  try {
    // ===== Succes =====
    if (status === "completed") {
      // URL depuis le payload du webhook, sinon depuis l'endpoint authentifie.
      let videoUrl = extractVideoUrl(event.payload)
      if (!videoUrl) {
        const authoritative = await fetchAuthoritativeStatus(requestId)
        videoUrl = authoritative?.videoUrl || null
      }
      if (!videoUrl) {
        // Pas d'URL exploitable : on acquitte (la reconciliation reessaiera) sans
        // marquer completed, pour ne pas figer une entree sans video.
        return NextResponse.json({ ok: true, ignored: "no video url" })
      }
      await markMotionJobCompleted(userId, requestId, videoUrl).catch(() => {})
      // GARANTIT une copie permanente (idempotent + verrou anti-concurrence si le
      // poll client tourne en parallele).
      const fin = await finalizeCompletedVideo({
        userId,
        tool,
        providerRef: requestId,
        providerUrl: videoUrl,
        title: tool === "genjutsu" ? "Genjutsu" : "Motion",
      }).catch(() => null)
      return NextResponse.json({ ok: true, stored: fin?.state ?? "pending" })
    }

    // ===== Echec / NSFW =====
    if (status === "failed" || status === "nsfw" || status === "canceled") {
      // RE-VERIFICATION AUTHENTIFIEE avant remboursement : le webhook n'etant pas
      // signe, on ne rembourse que si l'API confirme l'etat non-completed. Si elle
      // rapporte au contraire "completed", on finalise la video au lieu de rembourser.
      const authoritative = await fetchAuthoritativeStatus(requestId)
      if (authoritative?.status === "completed" && authoritative.videoUrl) {
        await markMotionJobCompleted(userId, requestId, authoritative.videoUrl).catch(() => {})
        const fin = await finalizeCompletedVideo({
          userId,
          tool,
          providerRef: requestId,
          providerUrl: authoritative.videoUrl,
          title: tool === "genjutsu" ? "Genjutsu" : "Motion",
        }).catch(() => null)
        return NextResponse.json({ ok: true, stored: fin?.state ?? "pending" })
      }
      // Si l'API est joignable et confirme un etat NON terminal (queued/in_progress),
      // on n'agit pas encore : un futur webhook / la reconciliation trancheront.
      if (
        authoritative &&
        authoritative.status !== "failed" &&
        authoritative.status !== "nsfw" &&
        authoritative.status !== "canceled" &&
        authoritative.status !== "unknown"
      ) {
        return NextResponse.json({ ok: true, ignored: "not terminal yet" })
      }
      // Echec confirme (ou API injoignable mais webhook rapportant l'echec) :
      // transition atomique processing->failed + remboursement EXACT, une fois.
      await markMotionJobFailed(userId, requestId).catch(() => {})
      const refund = await failGenerationAndGetRefund(userId, tool, requestId).catch(() => 0)
      if (refund > 0) {
        await creditJetons(userId, refund, {
          reason: "higgsfield_generation_failed_refund",
          request_id: requestId,
          tool,
        }).catch(() => {})
        console.log(`[Higgsfield Webhook] ${tool} echoue -> ${refund} jeton(s) rembourse(s) a ${userId}`)
      }
      return NextResponse.json({ ok: true, status })
    }

    // queued / in_progress / autre : rien de terminal, on acquitte.
    return NextResponse.json({ ok: true, ignored: status })
  } catch (error) {
    console.error("[Higgsfield Webhook] Erreur de traitement:", error)
    // 200 pour eviter des reessais en boucle sur une erreur non recuperable ;
    // le polling / la reconciliation de secours pourront encore finaliser.
    return NextResponse.json({ ok: false, error: "processing error" })
  }
}
