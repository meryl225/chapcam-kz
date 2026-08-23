import { NextRequest, NextResponse } from "next/server"
import crypto from "node:crypto"
import {
  rehostToBlob,
  saveVideoHistory,
  isAlreadyRehosted,
  findUserByProviderRef,
  failGenerationAndGetRefund,
} from "@/lib/video-history"
import { refundTranslationCredits } from "@/lib/translation-quota"

// ============================================================
// Webhook HeyGen : notification serveur-a-serveur quand une generation se
// termine (video Avatar IV "Studio Photo en Video" ou Traduction Video).
//
// POURQUOI : jusqu'ici le statut etait suivi UNIQUEMENT par polling cote client.
// Si l'utilisateur ferme l'onglet avant la fin, le polling s'arrete et la video
// n'est jamais re-hebergee dans le Blob (les URLs HeyGen expirent ~7j) -> perdue.
// Le webhook fait le travail cote SERVEUR, independamment du client :
//   - re-heberge la video terminee dans le Blob prive + historique "completed" ;
//   - en cas d'echec de traduction, rembourse le credit (exactement une fois).
//
// SECURITE : HeyGen signe le CORPS BRUT en HMAC-SHA256 avec le secret de
// l'endpoint (en-tete "Heygen-Signature", hex). On verifie la signature ET
// l'anciennete du timestamp (anti-rejeu). Le middleware exempte deja tout
// chemin contenant "/webhook" de l'anti-scraping (le serveur HeyGen n'a pas
// d'User-Agent de navigateur).
// ============================================================

// Runtime Node.js : requis pour crypto, Neon et @vercel/blob.
export const runtime = "nodejs"
// Le re-hebergement telecharge la video HeyGen puis l'uploade dans le Blob :
// on laisse de la marge pour ne pas etre coupe par le timeout serverless.
export const maxDuration = 120

const HEYGEN_API = "https://api.heygen.com"
// Tolerance d'anciennete du timestamp (anti-rejeu) : 5 minutes.
const MAX_SKEW_SECONDS = 300

// Verifie la signature HMAC-SHA256 du corps brut, en temps constant.
function verifySignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex")
  let sigBuf: Buffer
  let expBuf: Buffer
  try {
    sigBuf = Buffer.from(signature, "hex")
    expBuf = Buffer.from(expected, "hex")
  } catch {
    return false
  }
  return sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)
}

export async function POST(request: NextRequest) {
  // 1) Lire le CORPS BRUT (indispensable : la signature porte sur ces octets
  //    exacts ; re-serialiser le JSON casserait le HMAC).
  const rawBody = await request.text()
  const signature = request.headers.get("heygen-signature") || ""
  const timestamp = request.headers.get("heygen-timestamp") || ""
  const secret = process.env.HEYGEN_WEBHOOK_SECRET || ""

  // 2) Verification de securite.
  if (secret) {
    // Anti-rejeu : rejeter les livraisons trop anciennes.
    const ts = Number(timestamp)
    if (!timestamp || !Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > MAX_SKEW_SECONDS) {
      return NextResponse.json({ error: "stale timestamp" }, { status: 400 })
    }
    if (!signature || !verifySignature(rawBody, signature, secret)) {
      return NextResponse.json({ error: "bad signature" }, { status: 401 })
    }
  } else {
    // Secret non encore configure : on accepte pour ne pas bloquer la mise en
    // place (bouton "Verify Webhook" de HeyGen), mais on l'indique clairement.
    // AJOUTER HEYGEN_WEBHOOK_SECRET pour activer la verification de signature.
    console.warn(
      "[HeyGen Webhook] HEYGEN_WEBHOOK_SECRET absent : signature NON verifiee. " +
        "Ajoute le secret de l'endpoint pour securiser ce webhook.",
    )
  }

  // 3) Parser l'evenement.
  let event: { event_type?: string; event_data?: Record<string, unknown> }
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }

  const eventType = String(event.event_type || "")
  const data = event.event_data || {}

  try {
    // ===== Studio Photo en Video (Avatar IV) =====
    if (eventType === "avatar_video.success") {
      const videoId = String(data.video_id || "")
      const url = String(data.url || "")
      if (!videoId || !url) return NextResponse.json({ ok: true, ignored: "missing fields" })

      const userId = await findUserByProviderRef("photo_video", videoId)
      // Utilisateur inconnu (job non enregistre) : on acquitte sans traiter.
      if (!userId) return NextResponse.json({ ok: true, ignored: "unknown video" })

      // Idempotence : deja re-heberge (ex: le poll client a devance le webhook).
      if (await isAlreadyRehosted(userId, "photo_video", videoId)) {
        return NextResponse.json({ ok: true, already: true })
      }

      const pathname = await rehostToBlob(url, userId, "photo_video", videoId)
      await saveVideoHistory({
        userId,
        tool: "photo_video",
        providerRef: videoId,
        blobPathname: pathname,
        thumbnailUrl: (data.thumbnail_url as string) || null,
        title: "Studio Photo en Vidéo",
        status: "completed",
      })
      return NextResponse.json({ ok: true, rehosted: !!pathname })
    }

    if (eventType === "avatar_video.fail") {
      const videoId = String(data.video_id || "")
      if (videoId) {
        const userId = await findUserByProviderRef("photo_video", videoId)
        if (userId) {
          // On marque l'echec (parite avec le polling : pas de remboursement
          // automatique des credits photo-video).
          await saveVideoHistory({
            userId,
            tool: "photo_video",
            providerRef: videoId,
            blobPathname: null,
            title: "Studio Photo en Vidéo",
            status: "failed",
          })
        }
      }
      return NextResponse.json({ ok: true })
    }

    // ===== Traduction Video =====
    if (eventType === "video_translate.success") {
      // L'id de traduction peut arriver sous plusieurs cles selon les versions.
      const translateId = String(
        data.video_translation_id || data.video_translate_id || data.id || "",
      )
      if (!translateId) return NextResponse.json({ ok: true, ignored: "missing id" })

      const userId = await findUserByProviderRef("translation", translateId)
      if (!userId) return NextResponse.json({ ok: true, ignored: "unknown translation" })
      if (await isAlreadyRehosted(userId, "translation", translateId)) {
        return NextResponse.json({ ok: true, already: true })
      }

      // Le payload de traduction ne contient pas toujours l'URL finale : on
      // interroge l'API pour recuperer l'URL faisant autorite.
      let providerUrl = String(data.url || data.video_url || "")
      let outputLanguage = (data.output_language as string) || null
      const apiKey = process.env.HEYGEN_API_KEY
      if ((!providerUrl || !outputLanguage) && apiKey) {
        const res = await fetch(
          `${HEYGEN_API}/v3/video-translations/${encodeURIComponent(translateId)}`,
          { headers: { "X-Api-Key": apiKey } },
        )
        const json = await res.json().catch(() => null)
        const d = json?.data || {}
        providerUrl = providerUrl || d.url || d.video_url || ""
        outputLanguage = outputLanguage || d.output_language || null
      }
      if (!providerUrl) return NextResponse.json({ ok: true, ignored: "no url" })

      const pathname = await rehostToBlob(providerUrl, userId, "translation", translateId)
      await saveVideoHistory({
        userId,
        tool: "translation",
        providerRef: translateId,
        blobPathname: pathname,
        title: outputLanguage ? `Traduction · ${outputLanguage}` : "Traduction Vidéo",
        status: "completed",
      })
      return NextResponse.json({ ok: true, rehosted: !!pathname })
    }

    if (eventType === "video_translate.fail") {
      const translateId = String(
        data.video_translation_id || data.video_translate_id || data.id || "",
      )
      if (translateId) {
        const userId = await findUserByProviderRef("translation", translateId)
        if (userId) {
          // Rembourse EXACTEMENT le cout deduit, une seule fois (transition
          // atomique processing->failed cote lib).
          const refund = await failGenerationAndGetRefund(userId, "translation", translateId)
          if (refund > 0) {
            await refundTranslationCredits(userId, refund)
            console.log(`[HeyGen Webhook] Traduction echouee -> ${refund} credit(s) rembourse(s) a ${userId}`)
          }
        }
      }
      return NextResponse.json({ ok: true })
    }

    // Tout autre evenement : acquitter sans traiter.
    return NextResponse.json({ ok: true, ignored: eventType })
  } catch (error) {
    console.error("[HeyGen Webhook] Erreur de traitement:", error)
    // On renvoie 200 pour eviter des reessais en boucle sur une erreur non
    // recuperable ; les erreurs sont journalisees pour diagnostic.
    return NextResponse.json({ ok: false, error: "processing error" })
  }
}
