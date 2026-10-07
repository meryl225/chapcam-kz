import { type NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { createClient, type User } from '@supabase/supabase-js'
import { del, put } from '@vercel/blob'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'private, no-store' }
const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
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

function ownedAvatarPath(user: User): string | null {
  const path = user.user_metadata?.avatar_path
  return typeof path === 'string' && path.startsWith(`avatars/${user.id}/`) ? path : null
}

async function saveAvatarMetadata(user: User, avatarUrl: string | null, avatarPath: string | null) {
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    user_metadata: { ...user.user_metadata, avatar_url: avatarUrl, avatar_path: avatarPath },
  })
  if (error) throw error
}

export async function POST(request: NextRequest) {
  const user = await authenticate(request)
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401, headers: NO_STORE })

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Aucune photo reçue.' }, { status: 400, headers: NO_STORE })
  }
  const extension = ALLOWED_TYPES[file.type.toLowerCase()]
  if (!extension) {
    return NextResponse.json({ error: 'Format non pris en charge. Choisis une photo JPG, PNG ou HEIC.' }, { status: 415, headers: NO_STORE })
  }
  if (file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'La photo doit faire moins de 5 Mo.' }, { status: 413, headers: NO_STORE })
  }

  const fileId = randomUUID()
  const pathname = `avatars/${user.id}/${fileId}.${extension}`
  const previousPath = ownedAvatarPath(user)

  try {
    await put(pathname, file, { access: 'private', contentType: file.type, addRandomSuffix: false })
    const avatarUrl = `${request.nextUrl.origin}/api/avatar/${user.id}/${fileId}.${extension}`
    await saveAvatarMetadata(user, avatarUrl, pathname)
    if (previousPath && previousPath !== pathname) await del(previousPath).catch(() => {})
    return NextResponse.json({ avatar_url: avatarUrl }, { headers: NO_STORE })
  } catch (error) {
    console.error('[avatar] upload failed', error)
    await del(pathname).catch(() => {})
    return NextResponse.json({ error: 'Impossible d’enregistrer la photo pour le moment.' }, { status: 500, headers: NO_STORE })
  }
}

export async function DELETE(request: NextRequest) {
  const user = await authenticate(request)
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401, headers: NO_STORE })

  try {
    const previousPath = ownedAvatarPath(user)
    await saveAvatarMetadata(user, null, null)
    if (previousPath) await del(previousPath).catch(() => {})
    return NextResponse.json({ avatar_url: null }, { headers: NO_STORE })
  } catch (error) {
    console.error('[avatar] delete failed', error)
    return NextResponse.json({ error: 'Impossible de retirer la photo pour le moment.' }, { status: 500, headers: NO_STORE })
  }
}
