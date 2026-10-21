import { type NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { createClient, type User } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'private, no-store' }
// Private bucket: imported faces are biometric-like personal data, only ever served through short-lived signed URLs.
const BUCKET = 'live-faces'
const MAX_BYTES = 3 * 1024 * 1024
const MAX_FACES = 50
const SIGNED_URL_SECONDS = 60 * 60
const FAVORITES_KEY = 'liveswap_favorites'
const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

async function authenticate(request: NextRequest): Promise<User | null> {
  const header = request.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) return null
  const anon = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await anon.auth.getUser(token)
  return error ? null : data.user
}

let bucketReady: Promise<void> | null = null
function ensureBucket() {
  bucketReady ??= (async () => {
    const storage = createAdminClient().storage
    const { data } = await storage.getBucket(BUCKET)
    if (data) return
    const { error } = await storage.createBucket(BUCKET, { public: false, fileSizeLimit: MAX_BYTES, allowedMimeTypes: ['image/jpeg', 'image/png'] })
    if (error && !/already exists/i.test(error.message)) throw error
  })().catch((error) => {
    bucketReady = null
    throw error
  })
  return bucketReady
}

function detectImageType(bytes: Buffer): 'image/jpeg' | 'image/png' | null {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png'
  return null
}

async function listFaces(user: User) {
  const storage = createAdminClient().storage.from(BUCKET)
  // The folder is derived from the authenticated user id only: a user can never list another account's faces.
  const { data, error } = await storage.list(user.id, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } })
  if (error) throw error
  const files = (data ?? []).filter((f) => f.id && ID_PATTERN.test(f.name.split('.')[0]))
  if (!files.length) return []
  const paths = files.map((f) => `${user.id}/${f.name}`)
  const { data: signed, error: signError } = await storage.createSignedUrls(paths, SIGNED_URL_SECONDS)
  if (signError) throw signError
  return files
    .map((f, i) => ({ id: f.name.split('.')[0], url: signed?.[i]?.signedUrl ?? null, createdAt: f.created_at }))
    .filter((f) => f.url)
}

export async function GET(request: NextRequest) {
  const user = await authenticate(request)
  if (!user) return NextResponse.json({ error: 'Session expirée. Reconnecte-toi.' }, { status: 401, headers: NO_STORE })
  try {
    await ensureBucket()
    return NextResponse.json({ faces: await listFaces(user) }, { headers: NO_STORE })
  } catch (error) {
    console.error('[live-faces] list failed', error)
    return NextResponse.json({ error: 'Impossible de charger tes visages.' }, { status: 502, headers: NO_STORE })
  }
}

export async function POST(request: NextRequest) {
  const user = await authenticate(request)
  if (!user) return NextResponse.json({ error: 'Session expirée. Reconnecte-toi.' }, { status: 401, headers: NO_STORE })

  const body = await request.json().catch(() => null)
  const base64 = typeof body?.base64 === 'string' ? body.base64 : ''
  const bytes = Buffer.from(base64, 'base64')
  const contentType = detectImageType(bytes)
  if (!contentType) return NextResponse.json({ error: 'Format non pris en charge. Choisis une photo JPG ou PNG.' }, { status: 415, headers: NO_STORE })
  if (bytes.length > MAX_BYTES) return NextResponse.json({ error: 'La photo doit faire moins de 3 Mo.' }, { status: 413, headers: NO_STORE })

  try {
    await ensureBucket()
    const storage = createAdminClient().storage.from(BUCKET)
    const { data: existing } = await storage.list(user.id, { limit: MAX_FACES + 1 })
    if ((existing?.length ?? 0) >= MAX_FACES) {
      return NextResponse.json({ error: `Tu as atteint la limite de ${MAX_FACES} visages. Supprimes-en avant d’en ajouter.` }, { status: 409, headers: NO_STORE })
    }
    const id = randomUUID()
    const path = `${user.id}/${id}.${contentType === 'image/png' ? 'png' : 'jpg'}`
    const { error } = await storage.upload(path, bytes, { contentType, upsert: false, cacheControl: '3600' })
    if (error) throw error
    const { data: signed } = await storage.createSignedUrl(path, SIGNED_URL_SECONDS)
    return NextResponse.json({ face: { id, url: signed?.signedUrl ?? null, createdAt: new Date().toISOString() } }, { status: 201, headers: NO_STORE })
  } catch (error) {
    console.error('[live-faces] upload failed', error)
    return NextResponse.json({ error: 'Impossible d’enregistrer ce visage pour le moment.' }, { status: 502, headers: NO_STORE })
  }
}

// Removes only the user's own imported faces (never ChapCam presets, never generated creations).
export async function DELETE(request: NextRequest) {
  const user = await authenticate(request)
  if (!user) return NextResponse.json({ error: 'Session expirée. Reconnecte-toi.' }, { status: 401, headers: NO_STORE })

  const body = await request.json().catch(() => null)
  const ids: string[] = Array.isArray(body?.ids) ? body.ids.filter((id: unknown) => typeof id === 'string' && ID_PATTERN.test(id)) : []
  if (!ids.length || ids.length > MAX_FACES) return NextResponse.json({ error: 'Aucun visage valide à supprimer.' }, { status: 400, headers: NO_STORE })

  try {
    await ensureBucket()
    const storage = createAdminClient().storage.from(BUCKET)
    const { data: files } = await storage.list(user.id, { limit: 100 })
    const paths = (files ?? []).filter((f) => ids.includes(f.name.split('.')[0])).map((f) => `${user.id}/${f.name}`)
    if (paths.length) {
      const { error } = await storage.remove(paths)
      if (error) throw error
    }

    const favorites = user.user_metadata?.[FAVORITES_KEY]
    if (Array.isArray(favorites)) {
      const removed = new Set(ids.map((id) => `u:${id}`))
      const next = favorites.filter((f) => !removed.has(f))
      if (next.length !== favorites.length) {
        await createAdminClient().auth.admin.updateUserById(user.id, { user_metadata: { ...user.user_metadata, [FAVORITES_KEY]: next } })
      }
    }
    return NextResponse.json({ deleted: ids }, { headers: NO_STORE })
  } catch (error) {
    console.error('[live-faces] delete failed', error)
    return NextResponse.json({ error: 'Impossible de supprimer ce visage pour le moment.' }, { status: 502, headers: NO_STORE })
  }
}
