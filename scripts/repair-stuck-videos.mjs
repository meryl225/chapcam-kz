// ============================================================
// Repare en masse les videos bloquees en "processing" alors que le
// fournisseur (HeyGen) les a TERMINEES : telecharge la source, la copie dans
// Vercel Blob + Cloudflare R2 (verifie par HEAD), et passe la ligne en
// "completed". Idempotent : une ligne deja reparee est ignoree.
//
// Usage :
//   node --env-file-if-exists=/vercel/share/.env.project scripts/repair-stuck-videos.mjs [--dry]
// ============================================================
import { neon } from '@neondatabase/serverless'
import { put } from '@vercel/blob'
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'

const DRY = process.argv.includes('--dry')
const sql = neon(process.env.DATABASE_URL)
const HEYGEN = process.env.HEYGEN_API_KEY
const BUCKET = (process.env.R2_BUCKET_NAME || '').trim()
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
})

async function providerStatus(tool, ref) {
  if (tool === 'photo_video') {
    const j = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${encodeURIComponent(ref)}`, { headers: { 'X-Api-Key': HEYGEN } }).then((r) => r.json()).catch(() => null)
    const d = j?.data || {}
    return { status: d.status, url: d.video_url || null, thumb: d.thumbnail_url || null, error: d.error || null }
  }
  if (tool === 'translation') {
    const j = await fetch(`https://api.heygen.com/v3/video-translations/${encodeURIComponent(ref)}`, { headers: { 'X-Api-Key': HEYGEN } }).then((r) => r.json()).catch(() => null)
    const d = j?.data || {}
    const raw = String(d.status || '').toLowerCase()
    return { status: raw === 'success' ? 'completed' : raw, url: d.url || d.video_url || null, thumb: null, error: d.message || null }
  }
  return { status: 'unknown', url: null }
}

const rows = await sql`
  SELECT id, user_id, tool, provider_ref, created_at, rehost_attempts
  FROM video_history
  WHERE status = 'processing' AND created_at < now() - interval '20 minutes' AND provider_ref IS NOT NULL
  ORDER BY created_at DESC
`
console.log(`Videos bloquees en processing : ${rows.length}${DRY ? ' (DRY RUN)' : ''}`)

let repaired = 0, failed = 0, stillRunning = 0, sourceGone = 0, errors = 0
for (const r of rows) {
  const tag = `${String(r.created_at).slice(0, 16)} ${r.tool} ${String(r.provider_ref).slice(0, 10)}`
  try {
    const st = await providerStatus(r.tool, r.provider_ref)
    if (st.status === 'failed' || st.status === 'error') {
      failed++
      console.log(`  ECHEC FOURNISSEUR -> failed : ${tag}`)
      if (!DRY) await sql`UPDATE video_history SET status = 'failed' WHERE id = ${r.id} AND status = 'processing'`
      continue
    }
    if (st.status !== 'completed' || !st.url) {
      stillRunning++
      console.log(`  toujours en cours chez le fournisseur (${st.status}) : ${tag}`)
      continue
    }
    const res = await fetch(st.url)
    if (res.status === 404 || res.status === 410) {
      sourceGone++
      console.log(`  SOURCE DISPARUE -> failed : ${tag}`)
      if (!DRY) await sql`UPDATE video_history SET status = 'failed' WHERE id = ${r.id} AND status = 'processing'`
      continue
    }
    if (!res.ok) throw new Error(`source HTTP ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.byteLength === 0) throw new Error('corps vide')
    const key = `videos/${r.user_id}/${r.tool}/${String(r.provider_ref).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40)}-${Date.now()}.mp4`
    if (DRY) { repaired++; console.log(`  reparable (${(buf.byteLength / 1e6).toFixed(1)} Mo) : ${tag}`); continue }

    await put(key, buf, { access: 'private', contentType: 'video/mp4' })
    let r2Key = null
    if (BUCKET) {
      await r2.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buf, ContentType: 'video/mp4' }))
      const h = await r2.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key })).catch(() => null)
      if (h && Number(h.ContentLength) === buf.byteLength) r2Key = key
    }
    await sql`
      UPDATE video_history
      SET blob_pathname = ${key}, r2_key = ${r2Key}, thumbnail_url = COALESCE(thumbnail_url, ${st.thumb}),
          status = 'completed', rehost_claimed_at = NULL
      WHERE id = ${r.id}
    `
    repaired++
    console.log(`  REPAREE (${(buf.byteLength / 1e6).toFixed(1)} Mo, R2=${r2Key ? 'oui' : 'non'}) : ${tag}`)
  } catch (e) {
    errors++
    console.log(`  ERREUR : ${tag} -> ${e?.message || e}`)
  }
}
console.log(`\nResume : reparees=${repaired} | echec fournisseur=${failed} | source disparue=${sourceGone} | encore en cours=${stillRunning} | erreurs=${errors}`)
