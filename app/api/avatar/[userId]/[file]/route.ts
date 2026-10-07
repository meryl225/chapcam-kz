import { type NextRequest, NextResponse } from 'next/server'
import { get } from '@vercel/blob'

export const dynamic = 'force-dynamic'

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const USER_ID = new RegExp(`^${UUID}$`, 'i')
const FILE_NAME = new RegExp(`^${UUID}\\.(jpg|png|webp|heic|heif)$`, 'i')

// Profile photos live in the private Blob store; this route serves them by their
// unguessable, immutable path so <Image> can load them without credentials.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ userId: string; file: string }> }) {
  const { userId, file } = await params
  if (!USER_ID.test(userId) || !FILE_NAME.test(file)) {
    return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  }

  const result = await get(`avatars/${userId}/${file}`, { access: 'private' }).catch(() => null)
  if (!result || result.statusCode !== 200) {
    return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  }

  return new NextResponse(result.stream, {
    headers: {
      'Content-Type': result.blob.contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
