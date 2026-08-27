// Migration ONE-SHOT : aspire chaque video existante (Blob prive) vers
// Cloudflare Stream et stocke stream_uid + stream_customer_code.
//
// Idempotent : ne retraite pas les lignes ayant deja un stream_uid, donc on
// peut relancer sans creer de doublons. Le master Blob est conserve (source de
// telechargement + filet de securite).
//
// Usage : node --env-file=... scripts/migrate-videos-to-stream.mjs
import { neon } from '@neondatabase/serverless'
import { issueSignedToken, presignUrl } from '@vercel/blob'

const ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID
const TOKEN = process.env.CLOUDFLARE_API_TOKEN
const API = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/stream`
const H = { Authorization: `Bearer ${TOKEN}` }
const sql = neon(process.env.DATABASE_URL)

async function presignBlob(pathname) {
  const validUntil = Date.now() + 3600_000
  const token = await issueSignedToken({ pathname, operations: ['get'], validUntil })
  const { presignedUrl } = await presignUrl(token, {
    operation: 'get',
    pathname,
    access: 'private',
    validUntil,
    useCache: false,
  })
  return presignedUrl
}

async function copyToStream(url, name) {
  const res = await fetch(`${API}/copy`, {
    method: 'POST',
    headers: { ...H, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, meta: { name: name.slice(0, 120) }, requireSignedURLs: true }),
  })
  const json = await res.json()
  if (!json.success) throw new Error(JSON.stringify(json.errors))
  const uid = json.result.uid
  const code = (json.result.playback?.hls?.match(/customer-([a-z0-9]+)\./) || [])[1] || null
  return { uid, code }
}

const rows = await sql`
  SELECT id, title, blob_pathname FROM video_history
  WHERE blob_pathname IS NOT NULL AND status = 'completed' AND stream_uid IS NULL
  ORDER BY created_at DESC
`
console.log(`A migrer : ${rows.length} videos`)

let ok = 0
let fail = 0
let savedCode = null
// Concurrence limitee pour ne pas saturer l'API (copy est asynchrone cote CF).
const CONCURRENCY = 4
for (let i = 0; i < rows.length; i += CONCURRENCY) {
  const batch = rows.slice(i, i + CONCURRENCY)
  await Promise.all(
    batch.map(async (row) => {
      try {
        const url = await presignBlob(row.blob_pathname)
        const { uid, code } = await copyToStream(url, row.title || 'video')
        if (code) savedCode = code
        await sql`
          UPDATE video_history
          SET stream_uid = ${uid}, stream_customer_code = ${code}
          WHERE id = ${row.id}
        `
        ok++
      } catch (e) {
        fail++
        console.error(`  ECHEC ${row.id}:`, e.message)
      }
    }),
  )
  console.log(`  ...${Math.min(i + CONCURRENCY, rows.length)}/${rows.length} (ok=${ok} fail=${fail})`)
}

// Persister le code client pour la lib (si pas deja fait).
if (savedCode) {
  await sql`
    INSERT INTO app_secrets (name, value) VALUES ('cf_stream_customer_code', ${savedCode})
    ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value
  `
}
console.log(`\nTermine : ok=${ok} fail=${fail} | customer_code=${savedCode}`)
