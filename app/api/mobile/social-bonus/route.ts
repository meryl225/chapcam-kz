import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  createPendingClaim,
  ensureProofBucket,
  getSocialBonusState,
  MAX_PROOF_BYTES,
  MAX_PROOFS,
  PROOF_TYPES,
  SOCIAL_PROOF_BUCKET,
} from '@/lib/social-claims'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'private, no-store' }

async function authenticate(request: NextRequest) {
  const header = request.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) return null
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: { user } } = await supabase.auth.getUser(token)
  return user ?? null
}

export async function GET(request: NextRequest) {
  const user = await authenticate(request)
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401, headers: NO_STORE })
  try {
    return NextResponse.json({ status: await getSocialBonusState(user.id) }, { headers: NO_STORE })
  } catch (error) {
    console.error('[mobile/social-bonus] Statut indisponible:', error)
    return NextResponse.json({ error: 'Statut indisponible pour le moment.' }, { status: 500, headers: NO_STORE })
  }
}

/** Stores the proof screenshots and opens a pending claim. Jetons are only credited after admin approval. */
export async function POST(request: NextRequest) {
  const user = await authenticate(request)
  if (!user) return NextResponse.json({ error: 'Non autorisé', stage: 'auth' }, { status: 401, headers: NO_STORE })

  const form = await request.formData().catch(() => null)
  const files = (form?.getAll('proofs') ?? []).filter((item): item is File => item instanceof File && item.size > 0)
  if (files.length === 0) {
    return NextResponse.json({ error: 'Ajoute au moins une capture d’écran.' }, { status: 400, headers: NO_STORE })
  }
  if (files.length > MAX_PROOFS) {
    return NextResponse.json({ error: `${MAX_PROOFS} captures maximum.` }, { status: 400, headers: NO_STORE })
  }
  for (const file of files) {
    if (!PROOF_TYPES[file.type]) {
      return NextResponse.json({ error: 'Format non pris en charge. Utilise des images JPG, PNG ou HEIC.' }, { status: 400, headers: NO_STORE })
    }
    if (file.size > MAX_PROOF_BYTES) {
      return NextResponse.json({ error: 'Chaque capture doit faire moins de 8 Mo.' }, { status: 400, headers: NO_STORE })
    }
  }

  let stage: 'database' | 'upload' = 'database'
  try {
    const state = await getSocialBonusState(user.id)
    if (state === 'approved') {
      return NextResponse.json({ error: 'Ce bonus a déjà été obtenu.', status: state }, { status: 409, headers: NO_STORE })
    }
    if (state === 'pending') {
      return NextResponse.json({ error: 'Ta preuve est déjà en cours de vérification.', status: state }, { status: 409, headers: NO_STORE })
    }

    stage = 'upload'
    await ensureProofBucket()
    const storage = createAdminClient().storage.from(SOCIAL_PROOF_BUCKET)
    const batch = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
    const paths: string[] = []
    for (const [index, file] of files.entries()) {
      const path = `${user.id}/${batch}/${index + 1}.${PROOF_TYPES[file.type]}`
      const { error } = await storage.upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false })
      if (error) throw error
      paths.push(path)
    }

    stage = 'database'
    const claimId = await createPendingClaim(user.id, paths)
    if (!claimId) {
      await storage.remove(paths)
      return NextResponse.json({ error: 'Ta preuve est déjà en cours de vérification.', status: 'pending' }, { status: 409, headers: NO_STORE })
    }
    return NextResponse.json({ status: 'pending', claim_id: claimId }, { headers: NO_STORE })
  } catch (error) {
    console.error(`[mobile/social-bonus] Erreur (${stage}):`, error)
    return NextResponse.json({ error: 'Envoi impossible pour le moment.', stage }, { status: 500, headers: NO_STORE })
  }
}
