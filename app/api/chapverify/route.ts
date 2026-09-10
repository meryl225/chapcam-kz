import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { motionQuotaForPlan } from '@/lib/plans'
import { getMotionBalance, addMotionCredits, deductMotionCredit } from '@/lib/motion-quota'
import {
  submitDetection,
  getDetection,
  mediaTypeFromMime,
  chapVerifyCost,
  type ChapVerifyMedia,
} from '@/lib/resemble'
import { createJob, getJob, listJobs, markCompleted, markFailed } from '@/lib/chapverify-jobs'
import { logToolUsage } from '@/lib/tool-usage'

// ChapVerify — detection de deepfake (image / audio / video) via Resemble.
// Facturation : reutilise le solde de credits Motion. Image 1, Audio 1, Video 2.
// Le credit est deduit apres une soumission reussie, et rembourse UNE SEULE
// fois si la detection echoue.
export const runtime = 'nodejs'
export const maxDuration = 120

// Tailles max par media (le fichier transite par notre serveur vers Resemble).
const MAX_BY_MEDIA: Record<ChapVerifyMedia, number> = {
  image: 12 * 1024 * 1024, // 12 Mo
  audio: 25 * 1024 * 1024, // 25 Mo
  video: 60 * 1024 * 1024, // 60 Mo
}

// Attribue le quota Motion du forfait a la premiere utilisation d'un abonne actif.
async function ensureCreditsForActiveSub(userId: string, planId: string): Promise<number> {
  const { balance, exists } = await getMotionBalance(userId)
  if (exists) return balance
  const quota = motionQuotaForPlan(planId)
  if (quota <= 0) return 0
  return addMotionCredits(userId, quota)
}

async function resolveBalance(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<{ balance: number; subActive: boolean }> {
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan, end_date, expires_at, is_active')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()
  const subEnd = sub?.end_date ?? sub?.expires_at ?? null
  const subActive = !!sub && !!subEnd && new Date(subEnd).getTime() > Date.now()
  const balance = subActive
    ? await ensureCreditsForActiveSub(userId, sub!.plan)
    : (await getMotionBalance(userId)).balance
  return { balance, subActive }
}

// GET : ?info=quota (solde) | ?info=history (historique) | ?uuid=... (statut)
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
  }

  const params = new URL(request.url).searchParams
  const info = params.get('info')

  if (info === 'quota') {
    const { balance } = await resolveBalance(supabase, user.id)
    return NextResponse.json({ success: true, credits: balance })
  }

  if (info === 'history') {
    const jobs = await listJobs(user.id).catch(() => [])
    return NextResponse.json({ success: true, jobs })
  }

  const uuid = params.get('uuid')
  if (!uuid) {
    return NextResponse.json({ error: 'Parametre uuid manquant' }, { status: 400 })
  }

  const job = await getJob(user.id, uuid)
  if (!job) {
    return NextResponse.json({ error: 'Verification introuvable' }, { status: 404 })
  }

  // Deja finalisee : renvoyer le resultat stocke sans re-interroger Resemble.
  if (job.status !== 'processing') {
    return NextResponse.json({
      success: true,
      status: job.status,
      verdict: job.verdict,
      confidence: job.confidence,
      media: job.media,
    })
  }

  try {
    const result = await getDetection(uuid)
    if (result.status === 'completed') {
      await markCompleted(user.id, uuid, result.verdict, result.confidence)
      return NextResponse.json({
        success: true,
        status: 'completed',
        verdict: result.verdict,
        confidence: result.confidence,
        media: job.media,
      })
    }
    if (result.status === 'failed') {
      // Rembourse le credit UNE SEULE fois (transition atomique).
      const transitioned = await markFailed(user.id, uuid)
      let remaining: number | undefined
      if (transitioned) {
        remaining = await addMotionCredits(user.id, job.cost)
      }
      return NextResponse.json({
        success: true,
        status: 'failed',
        error: result.error || "L'analyse a echoue.",
        refunded: transitioned,
        remaining,
      })
    }
    return NextResponse.json({ success: true, status: 'processing' })
  } catch (e) {
    // Erreur transitoire cote Resemble : on laisse le client re-essayer au tick suivant.
    return NextResponse.json({ success: true, status: 'processing' })
  }
}

// POST : upload d'un fichier -> soumission Resemble -> deduction du credit.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Requete invalide' }, { status: 400 })
  }

  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
  }

  const media = mediaTypeFromMime(file.type)
  if (!media) {
    return NextResponse.json(
      { error: 'Format non supporte. Envoie une image, un audio ou une video.' },
      { status: 400 },
    )
  }

  if (file.size > MAX_BY_MEDIA[media]) {
    const mb = Math.round(MAX_BY_MEDIA[media] / (1024 * 1024))
    return NextResponse.json({ error: `Fichier trop volumineux (max ${mb} Mo).` }, { status: 400 })
  }

  const cost = chapVerifyCost(media)

  // Verifie le solde AVANT de soumettre a Resemble.
  const { balance, subActive } = await resolveBalance(supabase, user.id)
  if (balance < cost) {
    return NextResponse.json(
      {
        error: !subActive
          ? 'Aucun forfait actif. Choisis un forfait pour obtenir des credits ChapVerify.'
          : balance > 0
            ? `Cette verification coute ${cost} credits et il t'en reste ${balance}. Recharge tes credits.`
            : 'Credits epuises. Recharge pour continuer a verifier.',
        code: !subActive ? 'no_plan' : 'quota_exhausted',
        remaining: Math.max(0, balance),
        required: cost,
      },
      { status: 402 },
    )
  }

  // Soumission a Resemble.
  let uuid: string
  try {
    uuid = await submitDetection(file, media)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Soumission a Resemble echouee.'
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  // Deduction du credit UNIQUEMENT apres une soumission reussie.
  const remaining = await deductMotionCredit(user.id, cost)
  await createJob(user.id, uuid, media, cost, file.name || `upload-${media}`)
  await logToolUsage({
    userId: user.id,
    tool: 'chapverify',
    credits: cost,
    meta: { media, provider: 'resemble' },
  }).catch(() => {})

  return NextResponse.json({
    success: true,
    uuid,
    media,
    cost,
    remaining: remaining < 0 ? 0 : remaining,
  })
}
