import 'server-only'

// ============================================================
// ChapVerify — detection de deepfake via l'API Resemble Detect.
// POST https://app.resemble.ai/api/v2/detect (multipart, champ `file`)
//   -> { success, item: { uuid, status } }
// GET  https://app.resemble.ai/api/v2/detect/{uuid}
//   -> { success, item: { status, media_type, image_metrics|metrics|video_metrics, ... } }
//
// Le fichier est streame DIRECTEMENT depuis notre serveur vers Resemble : pas
// de stockage intermediaire. On borne la duree analysee (audio/video) pour
// plafonner le cout fournisseur et proteger la marge.
// ============================================================

const BASE = 'https://app.resemble.ai/api/v2/detect'

export type ChapVerifyMedia = 'image' | 'audio' | 'video'

// Cout en credits Motion par type de media. Source de verite PARTAGEE entre la
// route (debit) et l'UI (affichage). La video coute 2 car son cout fournisseur
// (facture a la seconde) est bien plus eleve qu'une image.
export const CHAPVERIFY_COST: Record<ChapVerifyMedia, number> = {
  image: 1,
  audio: 1,
  video: 2,
}
export function chapVerifyCost(media: ChapVerifyMedia): number {
  return CHAPVERIFY_COST[media] ?? 1
}

// Duree maximale analysee (secondes). Au-dela, Resemble n'analyse pas -> cout
// fournisseur plafonne, donc marge garantie quelle que soit la duree du fichier.
export const CHAPVERIFY_MAX_SECS = 30

function apiKey(): string {
  const k = (process.env.RESEMBLE_API_KEY || '').trim()
  if (!k) throw new Error('RESEMBLE_API_KEY manquante')
  return k
}

export function mediaTypeFromMime(mime: string): ChapVerifyMedia | null {
  if (!mime) return null
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('audio/')) return 'audio'
  if (mime.startsWith('video/')) return 'video'
  return null
}

// Soumet un fichier a l'analyse. Retourne l'uuid de la tache Resemble.
export async function submitDetection(file: File, media: ChapVerifyMedia): Promise<string> {
  const form = new FormData()
  form.append('file', file, file.name || `upload-${media}`)
  // Borne la duree analysee (protege la marge).
  if (media === 'video') {
    form.append('max_video_secs', String(CHAPVERIFY_MAX_SECS))
    form.append('face_only', 'true') // concentre la detection visuelle sur les visages
  } else if (media === 'audio') {
    form.append('end_region', String(CHAPVERIFY_MAX_SECS))
  }

  const res = await fetch(BASE, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey()}` },
    body: form,
  })
  const json = (await res.json().catch(() => null)) as
    | { item?: { uuid?: string }; error?: string; message?: string }
    | null
  const uuid = json?.item?.uuid
  if (!res.ok || !uuid) {
    throw new Error(json?.error || json?.message || `Resemble a refuse le fichier (HTTP ${res.status})`)
  }
  return uuid
}

export interface DetectionResult {
  status: 'processing' | 'completed' | 'failed'
  verdict: 'fake' | 'real' | 'unknown'
  confidence: number // 0..100 : confiance du modele DANS le verdict rendu
  mediaType: ChapVerifyMedia | null
  error?: string | null
}

function toNum(v: unknown): number {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN
  return Number.isFinite(n) ? n : NaN
}

// Interroge le resultat d'une tache et le normalise en verdict + confiance.
export async function getDetection(uuid: string): Promise<DetectionResult> {
  const res = await fetch(`${BASE}/${encodeURIComponent(uuid)}`, {
    headers: { Authorization: `Bearer ${apiKey()}` },
  })
  const json = (await res.json().catch(() => null)) as { item?: Record<string, unknown> } | null
  const item = json?.item
  if (!res.ok || !item) {
    throw new Error(`Resemble HTTP ${res.status}`)
  }

  const status = ((item.status as string) || 'processing') as DetectionResult['status']
  const mediaType = ((item.media_type as ChapVerifyMedia) || null) as ChapVerifyMedia | null

  if (status !== 'completed') {
    return {
      status,
      verdict: 'unknown',
      confidence: 0,
      mediaType,
      error: (item.error_message as string) ?? null,
    }
  }

  // Extrait label + score defensivement (la structure varie selon le media).
  let rawLabel = ''
  let fakeProb = NaN // probabilite que le contenu soit FAUX (0..1)
  let directConf = NaN // confiance directe du label (image)

  const image = item.image_metrics as Record<string, unknown> | undefined
  const video = item.video_metrics as Record<string, unknown> | undefined
  const audio = item.metrics as Record<string, unknown> | undefined

  if (image) {
    rawLabel = String(image.label ?? '')
    // En pratique, image_metrics.score est la PROBABILITE de faux (ex. 0.168 pour
    // un verdict "Real"), pas la confiance du label -> on le traite comme fakeProb.
    fakeProb = toNum(image.score)
  } else if (video) {
    rawLabel = String(video.label ?? '')
    fakeProb = toNum(video.score)
    const certainty = toNum(video.certainty)
    if (Number.isFinite(certainty)) directConf = certainty
  } else if (audio) {
    rawLabel = String(audio.label ?? '')
    fakeProb = toNum(audio.aggregated_score)
  }

  const label = rawLabel.toLowerCase()
  const verdict: DetectionResult['verdict'] = label.includes('fake')
    ? 'fake'
    : label.includes('real')
      ? 'real'
      : 'unknown'

  // Confiance DANS le verdict : si une confiance directe existe (image score,
  // video certainty) on l'utilise ; sinon on derive de la probabilite de faux.
  let conf = directConf
  if (!Number.isFinite(conf)) {
    conf = verdict === 'fake' ? fakeProb : 1 - fakeProb
  }
  if (!Number.isFinite(conf)) conf = 0
  if (conf <= 1) conf = conf * 100
  conf = Math.max(0, Math.min(100, Math.round(conf)))

  return { status: 'completed', verdict, confidence: conf, mediaType, error: null }
}
