import { createDecartClient } from '@decartai/sdk'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveWatermarkForUser, pickDecartApiKey } from '@/lib/watermark'
import { checkLiveAccess } from '@/lib/live-guard'
import { trackGPUUsage } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  // 1. Verifier que l'utilisateur est authentifie
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.id) {
    return NextResponse.json(
      { error: 'Non authentifie. Connecte-toi pour utiliser le swap.' },
      { status: 401 }
    )
  }

  // 2. VERROU CRITIQUE : verifier COTE SERVEUR que l'utilisateur a un abonnement
  //    actif et assez de points AVANT d'emettre un token. Sans ce controle, un
  //    compte a 0 point ou expire pouvait obtenir un token et bruler du GPU
  //    Decart sans jamais etre facture (la facturation etant pilotee client).
  const access = await checkLiveAccess(user.id)
  if (!access.allowed) {
    const msg =
      access.reason === 'insufficient_points'
        ? 'Points insuffisants. Recharge ton compte pour utiliser le swap.'
        : access.reason === 'expired'
          ? 'Ton abonnement a expire et le delai pour utiliser tes points restants est depasse. Renouvelle pour continuer.'
          : "Aucun abonnement actif. Souscris ou recharge pour utiliser le swap."
    console.warn(
      `[Decart Token] REFUS user=${user.id} reason=${access.reason} ` +
      `points=${access.points} plan=${access.plan}`
    )
    return NextResponse.json({ error: msg, code: access.reason }, { status: 402 })
  }

  // 3. Garde-fou anti-abus : plafond quotidien de GPU par compte (2h/jour).
  //    Lecture seule (0s) pour bloquer un compte deja au plafond.
  const gpu = trackGPUUsage(user.id, 0)
  if (!gpu.allowed) {
    console.warn(`[Decart Token] CAP quotidien atteint user=${user.id} used=${gpu.totalUsed}s`)
    return NextResponse.json(
      { error: 'Limite quotidienne de swap atteinte (2h). Reessaie demain.', code: 'daily_cap' },
      { status: 429 }
    )
  }

  // 4. Choisir la cle Decart selon le forfait (avec/sans watermark).
  //    Toute la decision est cote serveur : le client ne choisit jamais sa cle.
  const decision = await resolveWatermarkForUser(user.id)
  const { apiKey, usedNoWatermark } = pickDecartApiKey(decision.noWatermark)

  if (!apiKey) {
    console.error('[Decart Token] DECART_API_KEY not configured')
    return NextResponse.json(
      { error: 'Service temporairement indisponible' },
      { status: 500 }
    )
  }

  try {
    const client = createDecartClient({ apiKey })

    // 5. Creer un token ephemere avec restrictions
    const token = await client.tokens.create({
      expiresIn: 300, // 5 min : reduit de moitie l'exposition GPU si le client cesse de
                      // synchroniser, sans casser les usages tardifs (upload avatar,
                      // changement de scene) qui reutilisent ce token pendant la session.
      allowedModels: ['lucy-2.5', 'lucy-2.1'],
      allowedOrigins: [
        'https://chapcam.com',
        'https://www.chapcam.com',
        'http://localhost:3000' // Dev only
      ],
      metadata: {
        userId: user.id,
        userEmail: user.email,
        noWatermark: usedNoWatermark,
        createdAt: new Date().toISOString()
      }
    })

    console.log(
      `[Decart Token] Token cree pour user ${user.id} | plan=${decision.plan || 'none'} | ` +
      `points=${access.points} | noWatermark=${usedNoWatermark} (${decision.reason})`
    )

    // 6. Journaliser l'emission pour la reconciliation avec Decart (best-effort :
    //    ne bloque jamais le swap si la table n'existe pas encore). Voir
    //    scripts/decart-token-logs.sql pour creer la table cote Supabase.
    try {
      const admin = createAdminClient()
      await admin.from('decart_token_logs').insert({
        user_id: user.id,
        email: user.email,
        plan: decision.plan || null,
        no_watermark: usedNoWatermark,
        points_at_issue: access.points,
        expires_at: token.expiresAt,
        created_at: new Date().toISOString(),
      })
    } catch (logErr: any) {
      console.warn('[Decart Token] Log non enregistre:', logErr?.message)
    }

    return NextResponse.json({
      success: true,
      token: token.apiKey,
      expiresAt: token.expiresAt,
      userId: user.id,
      noWatermark: usedNoWatermark
    })
  } catch (error: any) {
    console.error('[Decart Token] Error:', error.message)
    return NextResponse.json(
      { error: 'Impossible de demarrer le swap. Reessaie.', details: error.message },
      { status: 500 }
    )
  }
}
