import pg from "pg"

const { Client } = pg
const c = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})
await c.connect()

const rows = await c.query(`
  select id, provider, request_id, video_url,
         date_trunc('minute', now() - created_at)::text as age
  from motion_jobs
  where status = 'completed'
    and video_url is not null
    and video_url not like '/api/videos/file%'
  order by created_at desc
`)

for (const r of rows.rows) {
  let statusTxt = "?"
  try {
    const res = await fetch(r.video_url, { method: "HEAD" })
    statusTxt = `${res.status} ${res.headers.get("content-type") || ""} ${res.headers.get("content-length") || ""}`
  } catch (e) {
    statusTxt = "FETCH_ERR " + e.message
  }
  console.log(`[${r.provider}] age=${r.age} ref=${r.request_id}`)
  console.log(`   url=${r.video_url}`)
  console.log(`   HEAD -> ${statusTxt}`)
}

await c.end()
