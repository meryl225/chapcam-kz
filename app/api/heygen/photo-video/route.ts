import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { photoVideoQuotaForPlan } from "@/lib/plans"
import { getPhotoVideoBalance, addPhotoVideoCredits, deductPhotoVideoCredit } from "@/lib/photo-video-quota"
import { logToolUsage } from "@/lib/tool-usage"
import { saveVideoHistory, finalizeCompletedVideo } from "@/lib/video-history"

// Le clonage de voix HeyGen est ASYNCHRONE (~30-90s de traitement). On attend
// que le clone soit "complete" avant de creer la video, donc la requete peut
// durer plus d'une minute : on releve la limite de duree de la fonction.
export const maxDuration = 300

// --- Studio Photo en Video (HeyGen Avatar IV) ---
// La photo-video est DECOUPLEE des points/minutes du Live Swap : elle est
// incluse dans les forfaits sous forme de CREDITS (1 credit = 1 video de 30s).
// Les videos font 30 SECONDES : on borne la longueur du texte en consequence.
// La parole FR fait ~14 caracteres/seconde.
const CHARS_PER_SECOND = 14
// Duree fixe par video : 30 secondes.
const MAX_SECONDS = 30
const MAX_SCRIPT_CHARS = MAX_SECONDS * CHARS_PER_SECOND // ~420 caracteres

// Estime la duree (en secondes) d'un script (pour l'affichage/plafonnement).
function estimateSeconds(script: string): number {
  return Math.min(MAX_SECONDS, Math.max(2, Math.ceil(script.length / CHARS_PER_SECOND)))
}

// Seed unique : les abonnes existants (achat avant les credits) recoivent le
// quota de leur forfait actif la premiere fois qu'ils utilisent le Studio.
async function ensureCreditsForActiveSub(
  userId: string,
  planId: string,
): Promise<number> {
  const { balance, exists } = await getPhotoVideoBalance(userId)
  if (exists) return balance
  const quota = photoVideoQuotaForPlan(planId)
  if (quota <= 0) return 0
  return addPhotoVideoCredits(userId, quota)
}

const HEYGEN_API = "https://api.heygen.com"
const HEYGEN_UPLOAD = "https://upload.heygen.com/v1/asset"

function getApiKey(): string | null {
  return process.env.HEYGEN_API_KEY || null
}

// HeyGen renifle les octets du fichier audio et exige que le Content-Type
// declare corresponde EXACTEMENT au format detecte, avec des noms MIME precis
// (notamment "audio/x-wav" pour le WAV, et non "audio/wav"). On lit donc la
// signature binaire pour renvoyer le bon type. Le client convertit deja tout
// echantillon en WAV, mais on gere aussi MP3/M4A par securite.
function detectAudioContentType(buf: Buffer): string {
  // WAV : "RIFF" .... "WAVE"
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WAVE") {
    return "audio/x-wav"
  }
  // MP3 : tag "ID3" ou frame sync 0xFF 0xEx/0xFx
  if (buf.length >= 3 && (buf.toString("ascii", 0, 3) === "ID3" || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0))) {
    return "audio/mpeg"
  }
  // M4A / MP4 audio : boite "ftyp" a l'offset 4
  if (buf.length >= 12 && buf.toString("ascii", 4, 8) === "ftyp") {
    return "audio/mp4"
  }
  // OGG
  if (buf.length >= 4 && buf.toString("ascii", 0, 4) === "OggS") {
    return "audio/ogg"
  }
  // WebM / Matroska (0x1A45DFA3)
  if (buf.length >= 4 && buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) {
    return "audio/webm"
  }
  // Defaut : le client normalise en WAV, on suppose donc du WAV.
  return "audio/x-wav"
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
    // Vitesse d'elocution (0.5-2.0). Un debit legerement plus lent (~0.95)
    // sonne souvent plus naturel/humain. Applique aussi a l'apercu vocal.
    const speedRaw = Number(form.get("speed"))
    const speed = Number.isFinite(speedRaw) ? Math.min(2, Math.max(0.5, speedRaw)) : 1.0
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
    if (useClone && voiceSample!.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: "Echantillon vocal trop volumineux (max 25 Mo)." }, { status: 400 })
    }

    const estimatedSeconds = estimateSeconds(script)

    // Verifier le SOLDE DE CREDITS photo-video AVANT tout appel HeyGen.
    // 1 credit = 1 video de 30s. Les credits sont attribues a l'achat d'un
    // forfait. On seed une seule fois les abonnes existants (achat anterieur).
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plan, end_date, expires_at, is_active")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle()

    // Certains abonnements portent end_date, d'autres expires_at : on tolere les deux.
    const subEnd = sub?.end_date ?? sub?.expires_at ?? null
    const subActive = !!sub && !!subEnd && new Date(subEnd).getTime() > Date.now()
    const balance = subActive
      ? await ensureCreditsForActiveSub(user.id, sub!.plan)
      : (await getPhotoVideoBalance(user.id)).balance

    if (balance <= 0) {
      return NextResponse.json(
        {
          error: subActive
            ? "Credits Studio Photo en Video epuises. Renouvelle ou passe a un forfait superieur."
            : "Aucun forfait actif. Achete un forfait pour recevoir tes videos Studio Photo en Video.",
          code: subActive ? "quota_exhausted" : "no_plan",
          balance: 0,
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
      // IMPORTANT : HeyGen RENIFLE les octets du fichier et REJETTE l'upload si
      // le Content-Type declare ne correspond pas exactement au format detecte
      // (ex: "audio/wav" != "audio/x-wav"). On deduit donc le type reel a partir
      // de la signature binaire plutot que de se fier au type du navigateur.
      const audioType = detectAudioContentType(audioBytes)
      const audioUpload = await fetch(HEYGEN_UPLOAD, {
        method: "POST",
        headers: { "X-Api-Key": apiKey, "Content-Type": audioType },
        body: audioBytes,
      })
      const audioJson = await audioUpload.json().catch(() => null)
      const audioAssetId = audioJson?.data?.id
      if (!audioUpload.ok || !audioAssetId) {
        console.error("[v0] Clone: echec upload audio", audioUpload.status, JSON.stringify(audioJson))
        return NextResponse.json(
          { error: "Echec de l'upload de l'echantillon vocal.", detail: audioJson?.message || audioJson?.msg || `HTTP ${audioUpload.status}` },
          { status: 502 },
        )
      }
      const cloneRes = await fetch(`${HEYGEN_API}/v3/voices/clone`, {
        method: "POST",
        headers: { "X-Api-Key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          audio: { type: "asset_id", asset_id: audioAssetId },
          voice_name: `chapcam_${user.id.slice(0, 8)}_${Date.now()}`,
          // Indice de langue : ameliore la fidelite du clone pour une voix FR.
          language: "fr",
          remove_background_noise: true,
        }),
      })
      const cloneJson = await cloneRes.json().catch(() => null)
      // Selon les versions, HeyGen renvoie l'id sous voice_clone_id, voice_id ou id.
      cloneVoiceId =
        cloneJson?.data?.voice_clone_id || cloneJson?.data?.voice_id || cloneJson?.data?.id || null
      if (!cloneRes.ok || !cloneVoiceId) {
        console.error("[v0] Clone: echec creation clone", cloneRes.status, JSON.stringify(cloneJson))
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

      // IMPORTANT : le clonage est ASYNCHRONE. Le voice_clone_id n'est PAS
      // utilisable tant que son statut n'est pas "complete" (sinon HeyGen
      // repond "Voice not found"). On poll le statut avant de creer la video.
      const CLONE_MAX_WAIT_MS = 120_000 // 2 min max
      const CLONE_POLL_MS = 3_000
      const startedAt = Date.now()
      let cloneReady = false
      // Etats "termine" tolerants (HeyGen a utilise "complete"/"completed"/"ready"
      // selon les versions). On considere l'echec seulement sur "failed"/"error".
      const DONE = ["complete", "completed", "ready", "success", "active"]
      const FAILED = ["failed", "error"]
      while (Date.now() - startedAt < CLONE_MAX_WAIT_MS) {
        const statusRes = await fetch(`${HEYGEN_API}/v3/voices/${cloneVoiceId}`, {
          headers: { "X-Api-Key": apiKey },
        })
        const statusJson = await statusRes.json().catch(() => null)
        const cloneStatus = String(statusJson?.data?.status || "").toLowerCase()
        // Si le statut expose un voice_id definitif, on l'adopte pour la video.
        const readyVoiceId = statusJson?.data?.voice_id || statusJson?.data?.voice_clone_id
        if (DONE.includes(cloneStatus)) {
          if (readyVoiceId) cloneVoiceId = readyVoiceId
          cloneReady = true
          break
        }
        if (FAILED.includes(cloneStatus)) {
          console.error("[v0] Clone: statut echoue", JSON.stringify(statusJson))
          break
        }
        await new Promise((r) => setTimeout(r, CLONE_POLL_MS))
      }

      if (!cloneReady) {
        // Nettoyer le clone jetable si possible (marche une fois "complete",
        // sinon HeyGen l'expirera de lui-meme) et informer l'utilisateur.
        await fetch(`${HEYGEN_API}/v3/voices/${cloneVoiceId}`, {
          method: "DELETE",
          headers: { "X-Api-Key": apiKey },
        }).catch(() => {})
        return NextResponse.json(
          {
            error:
              "Le clonage de ta voix a pris trop de temps. Reessaie avec un extrait clair de 10 a 30 secondes.",
            code: "clone_timeout",
          },
          { status: 504 },
        )
      }

      effectiveVoiceId = cloneVoiceId as string
    }

    // 2) Creation de la video (Avatar IV, type image = photo qui parle)
    // IMPORTANT (cadrage) : sans ces parametres, HeyGen recadre par defaut
    // (fit "cover") et zoome sur le visage -> tete/haut du corps COUPES.
    // - aspect_ratio "9:16" : format vertical TikTok annonce dans l'UI.
    // - fit "contain" : le sujet ENTIER tient dans le cadre (jamais coupe) ;
    //   d'eventuelles bandes de fond sont ajoutees plutot que de rogner.
    // - resolution "1080p" : rendu net et clair.
    const payload: Record<string, unknown> = {
      type: "image",
      script,
      voice_id: effectiveVoiceId,
      image: { type: "asset_id", asset_id: assetId },
      title: "ChapCam",
      aspect_ratio: "9:16",
      fit: "contain",
      resolution: "1080p",
    }
    // Gestes (motion_prompt) et expressivite : uniquement s'ils sont fournis.
    if (motionPrompt) payload.motion_prompt = motionPrompt
    if (expressiveness) payload.expressiveness = expressiveness
    // Vitesse d'elocution : dans voice_settings (structure validee cote HeyGen).
    // On ne l'ajoute que si differente du defaut, pour rester conservateur.
    if (speed !== 1.0) payload.voice_settings = { speed }

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

    // 3) Deduire 1 credit (1 video de 30s) seulement apres succes de la creation.
    const remaining = await deductPhotoVideoCredit(user.id)

    // 3bis) Enregistrer le job "processing" AVEC le user_id. Deux buts :
    //   - le WEBHOOK HeyGen (avatar_video.success) pourra retrouver le
    //     proprietaire via provider_ref=video_id (aucune session cote webhook) ;
    //   - la video apparait dans l'historique meme si l'utilisateur ferme
    //     l'onglet avant la fin (le webhook la completera cote serveur).
    // Idempotent : le poll GET fera un upsert -> "completed" ensuite.
    try {
      await saveVideoHistory({
        userId: user.id,
        tool: "photo_video",
        providerRef: videoId,
        blobPathname: null,
        title: "Studio Photo en Vidéo",
        status: "processing",
      })
    } catch (e) {
      console.error("[PhotoVideo] Enregistrement du job en cours impossible:", e)
    }

    // Journaliser la consommation par utilisateur (suivi admin + cout fournisseur estime).
    await logToolUsage({
      userId: user.id,
      tool: 'photo_video',
      credits: 1,
      durationSeconds: estimatedSeconds,
    })

    return NextResponse.json({
      success: true,
      video_id: videoId,
      // Le client renverra cet id a la route GET pour supprimer le clone une
      // fois la video terminee (le supprimer avant ferait echouer la video).
      clone_voice_id: cloneVoiceId,
      estimated_seconds: estimatedSeconds,
      remaining: Math.max(0, remaining),
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
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 })
    }

    const params = new URL(request.url).searchParams

    // Mode "quota" : renvoie le solde de credits Studio Photo en Video.
    // Independant de HeyGen : ne doit JAMAIS dependre de la cle API HeyGen.
    if (params.get("info") === "quota") {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("plan, end_date, expires_at, is_active")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle()

      const subEnd = sub?.end_date ?? sub?.expires_at ?? null
      const subActive = !!sub && !!subEnd && new Date(subEnd).getTime() > Date.now()
      const balance = subActive
        ? await ensureCreditsForActiveSub(user.id, sub!.plan)
        : (await getPhotoVideoBalance(user.id)).balance
      return NextResponse.json({
        success: true,
        plan: subActive ? sub!.plan : null,
        remaining: Math.max(0, balance),
      })
    }

    // Le statut video necessite HeyGen : on verifie la cle ici seulement.
    const apiKey = getApiKey()
    if (!apiKey) {
      return NextResponse.json({ error: "Cle API HeyGen manquante cote serveur." }, { status: 500 })
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

    // Historique PERMANENT : quand HeyGen a fini, on GARANTIT une copie Blob
    // privee avant de declarer la video "terminee" au client (les URLs HeyGen
    // expirent ~7j). Tant que la copie n'est pas prete, on renvoie "processing"
    // pour que le client continue a interroger -> plus jamais de "video expiree".
    let effectiveStatus = data.status || "unknown" // pending | processing | completed | failed
    let outUrl: string | null = data.video_url || null
    if (data.status === "completed" && data.video_url) {
      // IMPORTANT (anti spinner infini) : des que HeyGen a fini, la video DOIT
      // etre montree a l'utilisateur. On tente une copie Blob permanente, mais
      // on ne BLOQUE JAMAIS l'affichage dessus : si elle n'est pas encore prete
      // (ou si le re-hebergement echoue transitoirement), on sert l'URL
      // fournisseur (valide ~7j) et la generation est declaree "completed".
      // La copie permanente est garantie ensuite par l'auto-reparation de la
      // galerie « Mes videos » (qui rattrape les lignes processing/sans-blob).
      // Auparavant, on renvoyait "processing"/null tant que le Blob n'etait pas
      // pret -> spinner infini quand la copie tardait, sur desktop ET mobile.
      try {
        const fin = await finalizeCompletedVideo({
          userId: user.id,
          tool: "photo_video",
          providerRef: videoId,
          providerUrl: data.video_url,
          title: "Studio Photo en Vidéo",
          thumbnailUrl: data.thumbnail_url || null,
        })
        // Copie Blob prete -> URL permanente. Sinon (pending/fallback) -> URL
        // fournisseur temporaire pour un affichage immediat.
        outUrl = fin.state === "ready" || fin.state === "fallback" ? fin.url : data.video_url
      } catch (e) {
        console.error("[PhotoVideo] Finalisation historique (non bloquant):", e)
        outUrl = data.video_url
      }
      // Dans tous les cas, la video est prete a etre visionnee.
      effectiveStatus = "completed"
    }

    return NextResponse.json({
      success: true,
      status: effectiveStatus,
      video_url: outUrl,
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
