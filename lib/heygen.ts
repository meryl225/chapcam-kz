// HeyGen API v3 helpers. v1/v2 endpoints are retired on 2026-10-31.
export const HEYGEN_API = "https://api.heygen.com"

const SINGLE_UPLOAD_MAX_BYTES = 32 * 1024 * 1024

export type HeygenVideoStatus = "pending" | "processing" | "completed" | "failed" | "unknown"

export type HeygenVideo = {
  status: HeygenVideoStatus
  video_url: string | null
  thumbnail_url: string | null
  failure_message: string | null
  duration: number | null
}

const KNOWN_STATUSES = new Set(["pending", "processing", "completed", "failed"])

export async function getHeygenVideo(apiKey: string, videoId: string): Promise<HeygenVideo> {
  const res = await fetch(`${HEYGEN_API}/v3/videos/${encodeURIComponent(videoId)}`, {
    headers: { "X-Api-Key": apiKey },
    cache: "no-store",
  })
  const json = await res.json().catch(() => null)
  const d = json?.data || {}
  const raw = String(d.status || "").toLowerCase()
  return {
    status: (KNOWN_STATUSES.has(raw) ? raw : "unknown") as HeygenVideoStatus,
    video_url: d.video_url || null,
    thumbnail_url: d.thumbnail_url || null,
    failure_message: d.failure_message || json?.error?.message || null,
    duration: typeof d.duration === "number" ? d.duration : null,
  }
}

export type HeygenUploadResult = { ok: true; assetId: string } | { ok: false; status: number; message: string }

function errorMessage(json: unknown, status: number): string {
  const j = json as { error?: { message?: string }; message?: string } | null
  return j?.error?.message || j?.message || `HTTP ${status}`
}

// Uploads bytes as a HeyGen asset: multipart for files up to 32 MB, presigned direct upload above.
export async function uploadHeygenAsset(
  apiKey: string,
  bytes: Buffer,
  contentType: string,
  filename: string,
): Promise<HeygenUploadResult> {
  if (bytes.byteLength <= SINGLE_UPLOAD_MAX_BYTES) {
    const form = new FormData()
    form.append("file", new Blob([new Uint8Array(bytes)], { type: contentType }), filename)
    const res = await fetch(`${HEYGEN_API}/v3/assets`, {
      method: "POST",
      headers: { "X-Api-Key": apiKey },
      body: form,
    })
    const json = await res.json().catch(() => null)
    const assetId = json?.data?.asset_id
    if (!res.ok || !assetId) return { ok: false, status: res.status, message: errorMessage(json, res.status) }
    return { ok: true, assetId }
  }

  const initRes = await fetch(`${HEYGEN_API}/v3/assets/direct-uploads`, {
    method: "POST",
    headers: { "X-Api-Key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ filename, content_type: contentType, size_bytes: bytes.byteLength }),
  })
  const initJson = await initRes.json().catch(() => null)
  const init = initJson?.data
  if (!initRes.ok || !init?.asset_id || !init?.upload_url) {
    return { ok: false, status: initRes.status, message: errorMessage(initJson, initRes.status) }
  }

  const putRes = await fetch(init.upload_url, {
    method: "PUT",
    headers: init.upload_headers || {},
    body: new Uint8Array(bytes),
  })
  if (!putRes.ok) return { ok: false, status: putRes.status, message: `Upload PUT HTTP ${putRes.status}` }

  const doneRes = await fetch(`${HEYGEN_API}/v3/assets/${encodeURIComponent(init.asset_id)}/complete`, {
    method: "POST",
    headers: { "X-Api-Key": apiKey, "Content-Type": "application/json" },
    body: "{}",
  })
  const doneJson = await doneRes.json().catch(() => null)
  if (!doneRes.ok) return { ok: false, status: doneRes.status, message: errorMessage(doneJson, doneRes.status) }
  return { ok: true, assetId: doneJson?.data?.asset_id || init.asset_id }
}

export function extensionForContentType(contentType: string): string {
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/webm": "webm",
    "audio/x-wav": "wav",
    "audio/wav": "wav",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "audio/webm": "webm",
    "audio/ogg": "ogg",
  }
  return map[contentType] || "bin"
}
