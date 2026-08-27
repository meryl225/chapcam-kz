// ============================================================
// Backfill one-shot : repare les videos "completed" SANS copie Blob permanente.
//
// Pour chaque ligne (photo_video / translation / motion) :
//   1) redemande une URL de telechargement FRAICHE au fournisseur
//      (HeyGen pour photo_video/translation, Kling pour motion) ;
//   2) telecharge la video et la re-heberge dans le Blob PRIVE, avec exactement
//      les memes conventions de chemin que lib/video-history.ts ;
//   3) met a jour blob_pathname sur la ligne existante.
//
// Idempotent : ignore les lignes ayant deja un blob. Ne facture rien.
// Lancement :
//   node --env-file-if-exists=/vercel/share/.env.project scripts/backfill-video-history.mjs
// ============================================================

import { neon } from '@neondatabase/serverless'
import { put } from '@vercel/blob'

const sql = neon(process.env.DATABASE_URL)
const HEYGEN_API = 'https://api.heygen.com'
const KLING_BASE = 'https://api-singapore.klingai.com'
const HEYGEN_KEY = process.env.HEYGEN_API_KEY
const KLING_KEY = process.env.KLING_SECRET_KEY || process.env.KLING_API_KEY

// ---- URL fraiche cote fournisseur -----------------------------------------
async function freshUrl(tool, ref) {
  try {
    if (tool === 'photo_video') {
      const r = await fetch(`${HEYGEN_API}/v1/video_status.get?video_id=${encodeURIComponent(ref)}`, {
        headers: { 'X-Api-Key': HEYGEN_KEY },
      })
      if (!r.ok) return null
      const d = (await r.json())?.data || {}
      return d.status === 'completed' ? d.video_url || null : null
    }
    if (tool === 'translation') {
      const r = await fetch(`${HEYGEN_API}/v3/video-translations/${encodeURIComponent(ref)}`, {
        headers: { 'X-Api-Key': HEYGEN_KEY },
      })
      if (!r.ok) return null
      const d = (await r.json())?.data || {}
      const s = String(d.status || '').toLowerCase()
      return s === 'success' || s === 'completed' ? d.url || d.video_url || null : null
    }
    if (tool === 'motion') {
      const r = await fetch(`${KLING_BASE}/tasks?task_ids=${encodeURIComponent(ref)}`, {
        headers: { Authorization: `Bearer ${KLING_KEY}`, 'Content-Type': 'application/json' },
      })
      if (!r.ok) return null
      const j = await r.json()
      const t = Array.isArray(j?.data) ? j.data[0] : null
      if (!t || t.status !== 'succeeded') return null
      const v = (t.outputs || []).find((o) => o.type === 'video' && o.url)
      return v?.url || null
    }
  } catch {
    return null
  }
  return null
}

// ---- Re-hebergement Blob prive (memes conventions que rehostToBlob) --------
async function rehost(url, userId, tool, ref) {
  const res = await fetch(url)
  if (!res.ok) return null
  const contentType = res.headers.get('content-type') || 'video/mp4'
  const ext = contentType.includes('webm') ? 'webm' : 'mp4'
  const buffer = Buffer.from(await res.arrayBuffer())
  if (buffer.byteLength === 0) return null
  const safeRef = String(ref).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'video'
  const pathname = `videos/${userId}/${tool}/${safeRef}-${Date.now()}.${ext}`
  const blob = await put(pathname, buffer, { access: 'private', contentType })
  return blob.pathname
}

async function main() {
  const rows = await sql`
    SELECT id, user_id, tool, provider_ref
    FROM video_history
    WHERE status='completed' AND blob_pathname IS NULL AND provider_ref IS NOT NULL
    ORDER BY created_at DESC`
  console.log(`A traiter : ${rows.length} ligne(s)`)

  let ok = 0, gone = 0, err = 0
  const BATCH = 4
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    await Promise.all(
      batch.map(async (row) => {
        try {
          const url = await freshUrl(row.tool, row.provider_ref)
          if (!url) {
            gone++
            console.log(`  [source perdue] ${row.tool} ${row.provider_ref}`)
            return
          }
          const pathname = await rehost(url, row.user_id, row.tool, row.provider_ref)
          if (!pathname) {
            err++
            console.log(`  [rehost echoue] ${row.tool} ${row.provider_ref}`)
            return
          }
          await sql`UPDATE video_history SET blob_pathname=${pathname} WHERE id=${row.id} AND blob_pathname IS NULL`
          ok++
          console.log(`  [OK] ${row.tool} ${row.provider_ref} -> ${pathname}`)
        } catch (e) {
          err++
          console.log(`  [erreur] ${row.tool} ${row.provider_ref}: ${e?.message}`)
        }
      }),
    )
  }
  console.log(`\nTermine. Repares=${ok} | Sources perdues=${gone} | Erreurs=${err}`)
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
