import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { motionBucket, motionClientReference, motionObjectPath } from "@/lib/motion-storage"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Connexion requise." }, { status: 401 })

  const body = await request.json().catch(() => null)
  const contentType = typeof body?.contentType === "string" ? body.contentType : ""
  const extension = contentType === "video/webm" ? "webm" : contentType === "video/quicktime" ? "mov" : contentType === "video/mp4" ? "mp4" : ""
  if (!extension) return NextResponse.json({ error: "Format vidéo invalide (MP4, WebM ou MOV)." }, { status: 400 })

  const path = motionObjectPath(user.id, `${Date.now()}-${crypto.randomUUID()}.${extension}`)
  const admin = createAdminClient()
  const { data, error } = await admin.storage.from(motionBucket()).createSignedUploadUrl(path)
  if (error || !data) return NextResponse.json({ error: "Impossible de préparer l’upload vidéo." }, { status: 502 })

  // "publicUrl" est conserve pour compatibilite avec l'app iOS deja publiee.
  return NextResponse.json({ path, token: data.token, signedUrl: data.signedUrl, publicUrl: motionClientReference(admin, path) })
}
