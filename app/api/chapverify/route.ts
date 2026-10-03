import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { submitDetection, getDetection, mediaTypeFromMime, type ChapVerifyMedia } from '@/lib/resemble'
import { createJob, getJob, listJobs, markCompleted, markFailed } from '@/lib/chapverify-jobs'
import { logToolUsage } from '@/lib/tool-usage'
import { creditJetons, getJetonsBalance, reserveJetons } from '@/lib/jetons'
import { readMediaDurationSeconds } from '@/lib/media-duration'
import { estimateChapVerifyPriceUsd, PROVIDER_MARGIN_MULTIPLIER } from '@/lib/tool-costs'

// ChapVerify — detection de deepfake (image / audio / video) via Resemble.
// Facturation en Jetons : tarif Resemble Flex x 2,5 (image a l'unite, audio et
// video a la seconde analysee, 8 s max). Debit avant la soumission, rendu UNE
// SEULE fois si la soumission ou la detection echoue.
export const runtime = 'nodejs'
export const maxDuration = 120

// Tailles max par media (le fichier transite par notre serveur vers Resemble).
const MAX_BY_MEDIA: Record<ChapVerifyMedia, number> = {
  image: 12 * 1024 * 1024, // 12 Mo
  audio: 25 * 1024 * 1024, // 25 Mo
  video: 60 * 1024 * 1024, // 60 Mo
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
    const { balance } = await getJetonsBalance(user.id)
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
        remaining = (await creditJetons(user.id, job.cost, { reason: 'chapverify_failed_refund', uuid })).balance
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

  // Duree lue dans le fichier (MP4/MOV/M4A) ; sinon facture au plafond analyse (8 s).
  const parsedSeconds = media === 'image' ? null : readMediaDurationSeconds(new Uint8Array(await file.arrayBuffer()))
  const pricing = estimateChapVerifyPriceUsd(media, parsedSeconds ?? undefined)

  const wallet = await reserveJetons(user.id, pricing.customerPriceUsd, 'chapverify', {
    provider: 'resemble',
    media,
    durationSeconds: pricing.durationSeconds,
    providerCostUsd: pricing.providerCostUsd,
    marginMultiplier: PROVIDER_MARGIN_MULTIPLIER,
  })
  if (!wallet.ok) {
    return NextResponse.json(
      {
        error: `Cette vérification coûte ${wallet.required} Jetons et il t'en reste ${wallet.balance}. Recharge tes Jetons.`,
        code: 'quota_exhausted',
        remaining: Math.max(0, wallet.balance),
        required: wallet.required,
      },
      { status: 402 },
    )
  }
  const cost = wallet.charged

  let uuid: string
  try {
    uuid = await submitDetection(file, media)
  } catch (e) {
    await creditJetons(user.id, cost, { reason: 'chapverify_submit_failed' }).catch(() => {})
    const msg = e instanceof Error ? e.message : 'Soumission a Resemble echouee.'
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  const remaining = wallet.balance
  await createJob(user.id, uuid, media, cost, file.name || `upload-${media}`)
  await logToolUsage({
    userId: user.id,
    tool: 'chapverify',
    credits: cost,
    durationSeconds: pricing.durationSeconds || undefined,
    meta: { media, provider: 'resemble', walletAlreadyCharged: true },
  }).catch(() => {})

  return NextResponse.json({
    success: true,
    uuid,
    media,
    cost,
    remaining: remaining < 0 ? 0 : remaining,
  })
}
