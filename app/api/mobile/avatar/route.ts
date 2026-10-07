import { type NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { createClient, type User } from '@supabase/supabase-js'
import { del } from '@vercel/blob'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'private, no-store' }
const BUCKET = 'avatars'
const MAX_BYTES = 8 * 1024 * 1024
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
}
const EXTENSION_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
}

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

// iOS sometimes sends an empty or generic MIME type; fall back to the file extension.
function resolveContentType(file: File): string | null {
  const declared = (file.type || '').toLowerCase()
  if (ALLOWED_TYPES[declared]) return declared === 'image/jpg' ? 'image/jpeg' : declared
  const extension = (file.name || '').split('.').pop()?.toLowerCase() || ''
  return EXTENSION_TYPES[extension] ?? (declared === '' || declared === 'application/octet-stream' ? 'image/jpeg' : null)
}

async function removePreviousAvatar(user: User, keepPath?: string) {
  const path = user.user_metadata?.avatar_path
  if (typeof path !== 'string' || path === keepPath) return
  if (path.startsWith(`${user.id}/`)) {
    await createAdminClient().storage.from(BUCKET).remove([path]).catch(() => {})
  } else if (path.startsWith(`avatars/${user.id}/`)) {
    await del(path).catch(() => {})
  }
}

async function saveAvatarMetadata(user: User, avatarUrl: string | null, avatarPath: string | null) {
  const { error } = await createAdminClient().auth.admin.updateUserById(user.id, {
    user_metadata: { ...user.user_metadata, avatar_url: avatarUrl, avatar_path: avatarPath },
  })
  if (error) throw error
}

export async function POST(request: NextRequest) {
  const user = await authenticate(request)
  if (!user) return NextResponse.json({ error: 'Session expirée. Reconnecte-toi.' }, { status: 401, headers: NO_STORE })

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Aucune photo reçue.' }, { status: 400, headers: NO_STORE })
  }
  const contentType = resolveContentType(file)
  if (!contentType) {
    return NextResponse.json({ error: 'Format non pris en charge. Choisis une photo JPG, PNG ou HEIC.' }, { status: 415, headers: NO_STORE })
  }
  if (file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'La photo doit faire moins de 8 Mo.' }, { status: 413, headers: NO_STORE })
  }

  // The path is derived from the authenticated user id only, so a user can never write another account's avatar.
  const path = `${user.id}/${randomUUID()}.${ALLOWED_TYPES[contentType]}`
  const storage = createAdminClient().storage.from(BUCKET)

  const { error: uploadError } = await storage.upload(path, Buffer.from(await file.arrayBuffer()), {
    contentType,
    cacheControl: '31536000',
    upsert: false,
  })
  if (uploadError) {
    console.error('[avatar] storage upload failed', uploadError)
    return NextResponse.json({ error: 'Impossible d’envoyer la photo pour le moment.' }, { status: 502, headers: NO_STORE })
  }

  const avatarUrl = storage.getPublicUrl(path).data.publicUrl
  try {
    await saveAvatarMetadata(user, avatarUrl, path)
  } catch (error) {
    console.error('[avatar] metadata update failed', error)
    await storage.remove([path]).catch(() => {})
    return NextResponse.json({ error: 'Impossible d’enregistrer la photo pour le moment.' }, { status: 500, headers: NO_STORE })
  }

  await removePreviousAvatar(user, path)
  return NextResponse.json({ avatar_url: avatarUrl }, { headers: NO_STORE })
}

export async function DELETE(request: NextRequest) {
  const user = await authenticate(request)
  if (!user) return NextResponse.json({ error: 'Session expirée. Reconnecte-toi.' }, { status: 401, headers: NO_STORE })

  try {
    await saveAvatarMetadata(user, null, null)
    await removePreviousAvatar(user)
    return NextResponse.json({ avatar_url: null }, { headers: NO_STORE })
  } catch (error) {
    console.error('[avatar] delete failed', error)
    return NextResponse.json({ error: 'Impossible de retirer la photo pour le moment.' }, { status: 500, headers: NO_STORE })
  }
}
