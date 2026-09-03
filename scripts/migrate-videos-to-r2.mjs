// Migration des anciennes videos : Vercel Blob -> Cloudflare R2.
//
// Pour chaque video "completed" sans r2_key :
//   1) lit son chemin permanent Blob en base ;
//   2) verifie que le fichier existe VRAIMENT dans Blob (sinon on le note,
//      on ne declare rien "supprime" sans preuve) ;
//   3) le copie dans R2 sous la cle videos/{userId}/{videoId}.mp4 ;
//   4) verifie l'objet R2 (HeadObject, taille identique) ;
//   5) SEULEMENT alors ecrit r2_key en base.
//
// Idempotent : relancable, ne retraite pas ce qui a deja une r2_key.
// Usage : node --env-file-if-exists=/vercel/share/.env.project scripts/migrate-videos-to-r2.mjs [--dry]

import { neon } from '@neondatabase/serverless'
import { head as blobHead, issueSignedToken, presignUrl } from '@vercel/blob'
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'

const DRY = process.argv.includes('--dry')
const sql = neon(process.env.DATABASE_URL)
const BUCKET = process.env.R2_BUCKET_NAME.trim()
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID.trim()}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID.trim(), secretAccessKey: process.env.R2_SECRET_ACCESS_KEY.trim() },
})

async function r2Head(key) {
  try {
    const r = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }))
    return Number(r.ContentLength ?? 0)
  } catch (e) {
    if (e?.name === 'NotFound' || e?.$metadata?.httpStatusCode === 404) return null
    throw e
  }
}

async function blobBytes(pathname) {
  const validUntil = Date.now() + 10 * 60 * 1000
  const t = await issueSignedToken({ pathname, operations: ['get'], validUntil })
  const { presignedUrl } = await presignUrl(t, { operation: 'get', pathname, access: 'private', validUntil, useCache: false })
  const r = await fetch(presignedUrl)
  if (!r.ok) throw new Error(`Blob HTTP ${r.status}`)
  return Buffer.from(await r.arrayBuffer())
}

const rows = await sql`
  SELECT id, user_id, tool, blob_pathname
  FROM video_history
  WHERE status = 'completed' AND r2_key IS NULL AND blob_pathname IS NOT NULL
  ORDER BY created_at DESC
`
console.log(`${rows.length} video(s) a migrer${DRY ? ' (DRY RUN)' : ''}`)

let ok = 0, alreadyInR2 = 0, missingInBlob = 0, failed = 0
const missing = []

for (const r of rows) {
  const ext = /\.webm$/i.test(r.blob_pathname) ? 'webm' : 'mp4'
  const key = `videos/${r.user_id}/${r.id}.${ext}`
  try {
    // Deja dans R2 (relance) ? -> juste ecrire la cle.
    const existing = await r2Head(key)
    if (existing && existing > 1024) {
      if (!DRY) await sql`UPDATE video_history SET r2_key = ${key} WHERE id = ${r.id}`
      alreadyInR2++
      continue
    }

    // Existe-t-il vraiment dans Blob ?
    const meta = await blobHead(r.blob_pathname).catch(() => null)
    if (!meta) {
      missingInBlob++
      missing.push({ id: r.id, tool: r.tool, path: r.blob_pathname })
      continue
    }

    if (DRY) { ok++; continue }

    const buf = await blobBytes(r.blob_pathname)
    if (buf.length < 1024) throw new Error(`fichier trop petit (${buf.length} o)`)
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET, Key: key, Body: buf, ContentType: ext === 'webm' ? 'video/webm' : 'video/mp4',
    }))
    const size = await r2Head(key)
    if (size !== buf.length) throw new Error(`verification R2 echouee (${size} vs ${buf.length})`)

    await sql`UPDATE video_history SET r2_key = ${key} WHERE id = ${r.id}`
    ok++
    if (ok % 10 === 0) console.log(`  ... ${ok} copiees`)
  } catch (e) {
    failed++
    console.error(`  ECHEC ${r.id} (${r.tool}) :`, e?.message)
  }
}

console.log(`\nResultat : copiees=${ok} | deja dans R2=${alreadyInR2} | absentes de Blob=${missingInBlob} | echecs=${failed}`)
if (missing.length) {
  console.log('\nVideos dont le fichier N\'EXISTE PAS dans Blob (non migrees, non modifiees) :')
  for (const m of missing) console.log(`  ${m.id} | ${m.tool} | ${m.path}`)
}
