import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveUserIdByEmail } from '@/lib/fulfillment'
import { addPhotoVideoCredits, getPhotoVideoBalance } from '@/lib/photo-video-quota'
import { addMotionCredits, getMotionBalance } from '@/lib/motion-quota'
import { addTranslationCredits, getTranslationBalance } from '@/lib/translation-quota'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ============================================================
// Credit MANUEL de credits d'outil (admin) pour les 3 soldes Neon separes :
//   - photo-video  (Studio Photo en Video)  -> photo_video_credits
//   - motion       (Motion Control)          -> motion_credits
//   - translation  (Traduction Video)        -> translation_credits
// Chaque credit = 1 generation. Les credits s'ACCUMULENT (comme a l'achat).
// Entree : { email, tool, amount }. Resolution email -> user_id via Supabase.
// ============================================================

type Tool = 'photo-video' | 'motion' | 'translation'

const TOOL_LABELS: Record<Tool, string> = {
  'photo-video': 'Studio Photo en Video',
  motion: 'Motion Control',
  translation: 'Traduction Video',
}

function isValidTool(v: unknown): v is Tool {
  return v === 'photo-video' || v === 'motion' || v === 'translation'
}

export async function POST(request: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Acces refuse.' }, { status: 403 })
  }

  // 1) Lecture + validation du corps
  let email = ''
  let tool: unknown = null
  let amount = 0
  try {
    const body = await request.json()
    email = String(body?.email || '').trim().toLowerCase()
    tool = body?.tool
    amount = Math.floor(Number(body?.amount))
  } catch {
    return NextResponse.json({ error: 'Corps de requete invalide.' }, { status: 400 })
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Email invalide.' }, { status: 400 })
  }
  if (!isValidTool(tool)) {
    return NextResponse.json({ error: 'Outil invalide.' }, { status: 400 })
  }
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10000) {
    return NextResponse.json({ error: 'Nombre de credits invalide (1 a 10000).' }, { status: 400 })
  }

  // 2) Resolution email -> user_id (le compte doit exister)
  const admin = createAdminClient()
  const userId = await resolveUserIdByEmail(admin, email)
  if (!userId) {
    return NextResponse.json(
      { error: `Aucun compte trouve pour ${email}.` },
      { status: 404 },
    )
  }

  // 3) Credit sur le bon solde (accumulation) + solde precedent pour le message
  try {
    let previous = 0
    let balance = 0
    if (tool === 'photo-video') {
      previous = (await getPhotoVideoBalance(userId)).balance
      balance = await addPhotoVideoCredits(userId, amount)
    } else if (tool === 'motion') {
      previous = (await getMotionBalance(userId)).balance
      balance = await addMotionCredits(userId, amount)
    } else {
      previous = (await getTranslationBalance(userId)).balance
      balance = await addTranslationCredits(userId, amount)
    }

    return NextResponse.json({
      ok: true,
      tool,
      label: TOOL_LABELS[tool],
      email,
      added: amount,
      previousBalance: previous,
      balance,
      message: `+${amount} credit(s) ${TOOL_LABELS[tool]} pour ${email}. Nouveau solde : ${balance}.`,
    })
  } catch (e: any) {
    console.error('[tool-credits] Erreur de credit:', e)
    return NextResponse.json({ error: e?.message || 'Erreur lors du credit.' }, { status: 500 })
  }
}
