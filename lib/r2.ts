import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// ============================================================
// Cloudflare R2 : stockage PERMANENT des videos generees.
//
// En base on ne stocke QUE la cle R2 permanente (ex :
// `videos/{userId}/{videoId}.mp4`), jamais une URL signee. Les URLs signees
// sont generees a la demande, au moment du clic, avec une courte duree de vie.
// ============================================================

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID?.trim()
// `.trim()` : la valeur saisie peut contenir un espace parasite.
const BUCKET = process.env.R2_BUCKET_NAME?.trim() ?? ''

let client: S3Client | null = null

function getClient(): S3Client {
  if (client) return client
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim()
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim()
  if (!ACCOUNT_ID || !BUCKET || !accessKeyId || !secretAccessKey) {
    throw new Error('R2 non configure : CLOUDFLARE_ACCOUNT_ID, R2_BUCKET_NAME, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY requis.')
  }
  client = new S3Client({
    region: 'auto',
    endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  })
  return client
}

export function isR2Configured(): boolean {
  return Boolean(ACCOUNT_ID && BUCKET && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY)
}

/** Cle R2 permanente et previsible d'une video : videos/{userId}/{videoId}.mp4 */
export function buildVideoKey(userId: string, videoId: string, ext: 'mp4' | 'webm' = 'mp4'): string {
  return `videos/${userId}/${videoId}.${ext}`
}

/** Une cle est-elle une cle R2 video valide (et pas une URL) ? */
export function isVideoKey(key: string | null | undefined): key is string {
  return typeof key === 'string' && /^videos\/[^/]+\/.+\.(mp4|webm)$/i.test(key) && !/^https?:\/\//i.test(key)
}

/** Copie une video (depuis son URL source, ex : HeyGen/Kling) dans R2. */
export async function uploadVideoFromUrl(key: string, sourceUrl: string): Promise<{ size: number; contentType: string }> {
  const res = await fetch(sourceUrl, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Source video HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length < 1024) throw new Error(`Source video trop petite (${buf.length} octets)`)
  const contentType = /\.webm$/i.test(key) ? 'video/webm' : 'video/mp4'
  await getClient().send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buf, ContentType: contentType }))
  return { size: buf.length, contentType }
}

/** Envoie des octets deja en memoire dans R2. */
export async function uploadVideoBuffer(key: string, buf: Buffer, contentType = 'video/mp4'): Promise<void> {
  await getClient().send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buf, ContentType: contentType }))
}

/** L'objet existe-t-il REELLEMENT dans le bucket ? (null = absent) */
export async function headVideo(key: string): Promise<{ size: number; contentType: string | null } | null> {
  try {
    const r = await getClient().send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }))
    return { size: Number(r.ContentLength ?? 0), contentType: r.ContentType ?? null }
  } catch (e) {
    const err = e as { name?: string; $metadata?: { httpStatusCode?: number } }
    if (err?.name === 'NotFound' || err?.name === 'NoSuchKey' || err?.$metadata?.httpStatusCode === 404) return null
    throw e
  }
}

/**
 * URL signee de TELECHARGEMENT, generee a l'instant (defaut 10 min).
 * R2 renvoie lui-meme `Content-Type: video/mp4` et
 * `Content-Disposition: attachment; filename="....mp4"` -> le navigateur
 * enregistre le fichier directement (iPhone, Android, ordinateur).
 */
export async function signedDownloadUrl(key: string, filename: string, expiresInSeconds = 600): Promise<string> {
  const safe = filename.replace(/[^\w.-]/g, '_')
  return getSignedUrl(
    getClient(),
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ResponseContentType: /\.webm$/i.test(key) ? 'video/webm' : 'video/mp4',
      ResponseContentDisposition: `attachment; filename="${safe}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    }),
    { expiresIn: expiresInSeconds },
  )
}

/** URL signee de LECTURE (balise <video>), generee a l'instant. */
export async function signedPlaybackUrl(key: string, expiresInSeconds = 3600): Promise<string> {
  return getSignedUrl(
    getClient(),
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ResponseContentType: /\.webm$/i.test(key) ? 'video/webm' : 'video/mp4',
      ResponseContentDisposition: 'inline',
    }),
    { expiresIn: expiresInSeconds },
  )
}

export async function deleteVideo(key: string): Promise<void> {
  await getClient().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}
