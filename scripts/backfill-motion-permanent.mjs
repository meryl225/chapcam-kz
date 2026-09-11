// Backfill : re-heberge de facon PERMANENTE les clips Motion "completed" dont
// l'URL fournisseur (fal.media / klingai) est encore vivante mais qui n'ont pas
// de copie durable, puis enregistre la ligne video_history correspondante.
// Une fois fait, la prod (qui lit video_history via getBlobPathnamesByRef)
// affiche ces clips en durable — plus de "Video expiree".
//
// Reproduit fidelement lib/video-history.ts (rehostToBlob + saveVideoHistory) :
//   - Blob prive, content-type video/* force
//   - copie R2 (meme cle que le pathname Blob) + verification HEAD
//   - upsert video_history (user_id, tool='motion', provider_ref=request_id)
//
// Idempotent : saute les refs qui ont deja un blob_pathname en video_history.
import pg from "pg"
import { put } from "@vercel/blob"
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3"

const { Client } = pg
const DRY_RUN = process.argv.includes("--dry-run")

// --- R2 ---
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID?.trim()
const BUCKET = process.env.R2_BUCKET_NAME?.trim() ?? ""
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID?.trim() ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY?.trim() ?? "",
  },
})

async function rehost(remoteUrl, userId, ref) {
  const res = await fetch(remoteUrl)
  if (!res.ok) {
    console.log(`   source HTTP ${res.status} -> saut`)
    return null
  }
  const rawType = res.headers.get("content-type") || ""
  const isWebm = rawType.includes("webm") || /\.webm(\?|$)/i.test(remoteUrl)
  const contentType = isWebm ? "video/webm" : "video/mp4"
  const ext = isWebm ? "webm" : "mp4"
  const buffer = Buffer.from(await res.arrayBuffer())
  if (buffer.byteLength === 0) {
    console.log("   corps vide -> saut")
    return null
  }
  const safeRef = ref.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) || "video"
  const pathname = `videos/${userId}/motion/${safeRef}-${Date.now()}.${ext}`

  if (DRY_RUN) {
    console.log(`   [dry-run] re-hebergerait ${buffer.byteLength} octets -> ${pathname}`)
    return pathname
  }

  await put(pathname, buffer, { access: "private", contentType })

  // Copie R2 + verification HEAD.
  await r2.send(
    new PutObjectCommand({ Bucket: BUCKET, Key: pathname, Body: buffer, ContentType: contentType }),
  )
  const head = await r2.send(new HeadObjectCommand({ Bucket: BUCKET, Key: pathname })).catch(() => null)
  const r2Ok = head && Number(head.ContentLength) === buffer.byteLength
  console.log(`   Blob OK (${buffer.byteLength} o), R2 ${r2Ok ? "verifie" : "NON verifie"} -> ${pathname}`)
  return { pathname, r2Ok }
}

const c = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})
await c.connect()

// S'assurer que video_history existe (memes colonnes que lib/video-history.ts).
await c.query(`
  CREATE TABLE IF NOT EXISTS video_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    tool TEXT NOT NULL,
    provider_ref TEXT,
    blob_pathname TEXT,
    thumbnail_url TEXT,
    title TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'completed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`)
await c.query(`ALTER TABLE video_history ADD COLUMN IF NOT EXISTS r2_key TEXT`)
await c.query(
  `CREATE UNIQUE INDEX IF NOT EXISTS video_history_ref_idx ON video_history (user_id, tool, provider_ref)`,
)

// Clips a reparer : completed, URL fournisseur encore stockee, PAS deja durable.
const { rows } = await c.query(`
  SELECT m.id, m.user_id, m.request_id, m.provider, m.video_url
  FROM motion_jobs m
  LEFT JOIN video_history vh
    ON vh.user_id = m.user_id AND vh.tool = 'motion'
   AND vh.provider_ref = m.request_id AND vh.blob_pathname IS NOT NULL
  WHERE m.status = 'completed'
    AND m.video_url IS NOT NULL
    AND m.video_url NOT LIKE '/api/videos/file%'
    AND vh.id IS NULL
  ORDER BY m.created_at DESC
`)

console.log(`${rows.length} clip(s) a re-heberger${DRY_RUN ? " (DRY RUN)" : ""}\n`)

let ok = 0
for (const r of rows) {
  console.log(`[${r.provider}] ref=${r.request_id}`)
  try {
    const result = await rehost(r.video_url, r.user_id, r.request_id)
    if (!result) continue
    const pathname = typeof result === "string" ? result : result.pathname
    const r2Ok = typeof result === "string" ? false : result.r2Ok

    if (!DRY_RUN) {
      await c.query(
        `INSERT INTO video_history (user_id, tool, provider_ref, blob_pathname, r2_key, title, status)
         VALUES ($1, 'motion', $2, $3, $4, 'Motion Control', 'completed')
         ON CONFLICT (user_id, tool, provider_ref)
         DO UPDATE SET blob_pathname = EXCLUDED.blob_pathname,
                       r2_key = COALESCE(EXCLUDED.r2_key, video_history.r2_key),
                       status = 'completed'`,
        [r.user_id, r.request_id, pathname, r2Ok ? pathname : null],
      )
      // Mettre aussi a jour motion_jobs.video_url vers la route durable, pour que
      // meme sans la couche video_history l'historique pointe au bon endroit.
      await c.query(
        `UPDATE motion_jobs SET video_url = $1 WHERE id = $2`,
        [`/api/videos/file?pathname=${encodeURIComponent(pathname)}`, r.id],
      )
    }
    ok++
  } catch (e) {
    console.log(`   ERREUR: ${e.message}`)
  }
}

console.log(`\nTermine : ${ok}/${rows.length} re-heberge(s).`)
await c.end()
