import pg from "pg"

const { Client } = pg

const c = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

await c.connect()

const agg = await c.query(`
  select provider, status, count(*)::int as n,
         count(*) filter (where video_url is null)::int as null_url,
         count(*) filter (where video_url like '/api/videos/file%')::int as blob_url,
         count(*) filter (where video_url is not null and video_url not like '/api/videos/file%')::int as provider_url
  from motion_jobs
  group by provider, status
  order by provider, status
`)
console.log("=== motion_jobs par provider/status ===")
console.table(agg.rows)

const sample = await c.query(`
  select provider, status,
         left(coalesce(video_url, '(null)'), 45) as url_prefix,
         date_trunc('minute', now() - created_at)::text as age
  from motion_jobs
  where status = 'completed'
    and (video_url is null or video_url not like '/api/videos/file%')
  order by created_at desc
  limit 25
`)
console.log("=== completed SANS copie permanente (echantillon) ===")
console.table(sample.rows)

await c.end()
