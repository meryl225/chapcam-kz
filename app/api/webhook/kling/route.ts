import { NextRequest, NextResponse } from "next/server"
import { del } from "@vercel/blob"
import { parseTaskData, verifyKlingWebhook } from "@/lib/kling"
import {
  findMotionJobOwner,
  markMotionJobCompleted,
  markMotionJobFailed,
  clearMotionJobInputPaths,
} from "@/lib/motion-jobs"
import { addMotionCredits } from "@/lib/motion-quota"
import { rehostToBlob, saveVideoHistory, isAlreadyRehosted } from "@/lib/video-history"

// ============================================================
// Webhook Kling : notification serveur-a-serveur quand une tache Motion Control
// change de statut (succeeded / failed).
//
// POURQUOI : le statut etait suivi UNIQUEMENT par polling cote client. Si
// l'utilisateur ferme l'onglet avant la fin (2 a 5 min), le polling s'arrete et
// la video terminee n'est jamais re-hebergee (les URLs Kling expirent ~30j) ->
// perdue. Le webhook fait le travail cote SERVEUR, independamment du client :
//   - re-heberge la video terminee dans le Blob prive + historique "completed" ;
//   - en cas d'echec, rembourse 1 credit Motion (exactement une fois) ;
//   - supprime les fichiers d'entree PUBLICS temporaires.
//
// SECURITE : Kling signe le CORPS BRUT selon le standard "svix" :
//   contenu signe = "{webhook-id}.{webhook-timestamp}.{rawBody}"
//   attendu       = Base64(HMAC-SHA256(Base64Decode(secret sans 'whsec_'), contenu))
// On verifie la signature (en-tetes webhook-id/timestamp/signature) ET
// l'anciennete du timestamp (anti-rejeu). Le middleware exempte deja tout chemin
// "/webhook" de l'anti-scraping (le serveur Kling n'a pas d'UA de navigateur).
// ============================================================

export const runtime = "nodejs"
// Le re-hebergement telecharge la video Kling puis l'uploade dans le Blob :
// marge de temps pour ne pas etre coupe par le timeout serverless.
export const maxDuration = 120

// Supprime les fichiers Blob PUBLICS temporaires (image + video) d'un job.
async function cleanupInputs(userId: string, requestId: string, paths: string[]): Promise<void> {
  if (paths.length === 0) return
  try {
    await Promise.allSettled(paths.map((p) => del(p)))
    await clearMotionJobInputPaths(userId, requestId).catch(() => {})
  } catch (e) {
    console.error("[Kling Webhook] Nettoyage des fichiers temporaires echoue:", e)
  }
}

// Simple sonde de sante : permet de verifier d'un coup d'oeil (navigateur/curl)
// que la route est bien deployee. Kling envoie ses callbacks en POST.
export async function GET() {
  return NextResponse.json({ ok: true, service: "kling-webhook" })
}

export async function POST(request: NextRequest) {
  // 1) CORPS BRUT indispensable : la signature porte sur ces octets exacts ;
  //    re-serialiser le JSON casserait le HMAC.
  const rawBody = await request.text()
  const secret = process.env.KLING_WEBHOOK_SECRET || ""

  // En-tetes de signature (insensibles a la casse). NextRequest les normalise.
  const webhookId = request.headers.get("webhook-id") || ""
  const webhookTimestamp = request.headers.get("webhook-timestamp") || ""
  const webhookSignature = request.headers.get("webhook-signature") || ""

  // 2) Verification de securite.
  if (secret) {
    const ok = verifyKlingWebhook({
      rawBody,
      webhookId,
      webhookTimestamp,
      webhookSignature,
      secret,
    })
    if (!ok) {
      return NextResponse.json({ error: "bad signature" }, { status: 401 })
    }
  } else {
    // Secret non configure : on accepte pour ne pas bloquer la mise en place
    // (bouton "Send Test Callback" de Kling), mais on l'indique clairement.
    // AJOUTER KLING_WEBHOOK_SECRET pour activer la verification de signature.
    console.warn(
      "[Kling Webhook] KLING_WEBHOOK_SECRET absent : signature NON verifiee. " +
        "Cree un Webhook Secret dans la console Kling pour securiser ce webhook.",
    )
  }

  // 3) Parser l'evenement. Le callback "New Callback Function" a la meme forme
  //    qu'un element de data[] renvoye par /tasks : { id, status, outputs, ... }.
  let payload: { id?: string; external_id?: string; status?: string; message?: string; outputs?: unknown[] }
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }

  const taskId = String(payload.id || "")
  if (!taskId) {
    // Test callback sans id : acquitter (200) pour valider l'endpoint cote Kling.
    return NextResponse.json({ ok: true, ignored: "no task id" })
  }

  // Retrouver le proprietaire par l'id de tache (aucune session dans un webhook).
  const owner = await findMotionJobOwner(taskId)
  if (!owner) {
    // Job inconnu (ex: test callback) : acquitter sans traiter.
    return NextResponse.json({ ok: true, ignored: "unknown task" })
  }
  const { userId, inputPaths } = owner

  try {
    const task = parseTaskData(payload as Parameters<typeof parseTaskData>[0])

    // ===== Succes =====
    if (task.status === "succeeded" && task.videoUrl) {
      await markMotionJobCompleted(userId, taskId, task.videoUrl).catch(() => {})

      // Idempotence : deja re-heberge (ex: le poll client a devance le webhook).
      if (!(await isAlreadyRehosted(userId, "motion", taskId))) {
        const pathname = await rehostToBlob(task.videoUrl, userId, "motion", taskId)
        await saveVideoHistory({
          userId,
          tool: "motion",
          providerRef: taskId,
          blobPathname: pathname,
          title: "Motion Control",
          status: "completed",
        })
      }
      await cleanupInputs(userId, taskId, inputPaths)
      return NextResponse.json({ ok: true, status: "succeeded" })
    }

    // ===== Echec =====
    if (task.status === "failed") {
      // Transition atomique processing->failed : rembourse 1 credit UNE seule fois.
      const justFailed = await markMotionJobFailed(userId, taskId).catch(() => false)
      if (justFailed) {
        await addMotionCredits(userId, 1).catch(() => {})
        console.log(`[Kling Webhook] Tache echouee -> 1 credit Motion rembourse a ${userId}`)
      }
      await cleanupInputs(userId, taskId, inputPaths)
      return NextResponse.json({ ok: true, status: "failed" })
    }

    // submitted / processing : rien a finaliser, on acquitte.
    return NextResponse.json({ ok: true, status: task.status })
  } catch (error) {
    console.error("[Kling Webhook] Erreur de traitement:", error)
    // 200 pour eviter des reessais en boucle sur une erreur non recuperable ;
    // le polling de secours pourra encore finaliser cote client.
    return NextResponse.json({ ok: false, error: "processing error" })
  }
}
