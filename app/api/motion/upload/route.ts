import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

const BUCKET = "avatars"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Connexion requise." }, { status: 401 })

  const body = await request.json().catch(() => null)
  const contentType = typeof body?.contentType === "string" ? body.contentType : ""
  const extension = contentType === "video/webm" ? "webm" : contentType === "video/quicktime" ? "mov" : contentType === "video/mp4" ? "mp4" : ""
  if (!extension) return NextResponse.json({ error: "Format vidéo invalide (MP4, WebM ou MOV)." }, { status: 400 })

  const path = `motion/${user.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`
  const admin = createAdminClient()
  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path)
  if (error || !data) return NextResponse.json({ error: "Impossible de préparer l’upload vidéo." }, { status: 502 })

  const { data: publicData } = admin.storage.from(BUCKET).getPublicUrl(path)
  return NextResponse.json({ path, token: data.token, signedUrl: data.signedUrl, publicUrl: publicData.publicUrl })
}
