import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { pointsPerSecond } from '@/lib/swap-pricing'
import { trackGPUUsage } from '@/lib/rate-limit'
import { GRACE_DAYS } from '@/lib/live-guard'

export async function POST(request: NextRequest) {
  try {
    // On authentifie l'utilisateur avec SA session (pour obtenir son user_id)...
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Non authentifie' }, { status: 401 })
    }

    // sendBeacon envoie un Blob JSON : on parse defensivement.
    const body = await request.json().catch(() => ({}))
    const {
      pointsToDeduct,
      sessionDuration,
      // Resolution reelle du swap ('720p' | '1080p') : sert a facturer le HD
      // plus cher et a valider cote serveur le nombre de points demande.
      resolution,
      // Champs specifiques a l'enregistrement d'UNE session complete (a l'arret du swap).
      saveSession,
      avatarId,
      avatarName,
      framesProcessed,
      startedAt,
    } = body

    // Tarif points/seconde attendu pour cette resolution (2 en 720p, 4 en 1080p).
    const rate = pointsPerSecond(resolution)

    // === Enregistrement d'une session complete ===
    // Appele UNE SEULE FOIS a la fin d'un swap (pas a chaque synchronisation).
    // Ecrit une ligne swap_sessions avec avatar, duree totale, points consommes
    // et frames, pour que la page Statistiques soit claire et exacte.
    if (saveSession) {
      const duration = Math.max(0, Math.floor(sessionDuration || 0))
      // Rien a enregistrer pour une session vide (swap coupe instantanement).
      if (duration <= 0) {
        return NextResponse.json({ success: true, skipped: true })
      }
      const admin = createAdminClient()
      const endedAt = new Date()
      const startedAtDate = startedAt ? new Date(startedAt) : new Date(endedAt.getTime() - duration * 1000)
      const { error: sessionError } = await admin.from('swap_sessions').insert({
        user_id: user.id,
        avatar_id: avatarId ?? null,
        avatar_name: avatarName ?? null,
        duration_seconds: duration,
        // On borne les points enregistres au max theorique (duree x tarif) pour
        // qu'un client ne puisse pas gonfler l'historique. Le HD (1080p) est
        // facture au tarif plus eleve. Le ratio points_used/duration_seconds
        // permettra ensuite de distinguer une session HD (4 pts/s) d'une SD (2).
        points_used: Math.max(0, Math.min(
          Math.floor(pointsToDeduct || duration * rate),
          duration * rate,
        )),
        frames_processed: Math.max(0, Math.floor(framesProcessed || 0)),
        started_at: startedAtDate.toISOString(),
        ended_at: endedAt.toISOString(),
      })
      if (sessionError) {
        console.error('[Points] Save session error:', sessionError)
        return NextResponse.json({ success: false, error: 'Erreur enregistrement session' }, { status: 500 })
      }
      return NextResponse.json({ success: true })
    }

    // Calculer les points a deduire, en VALIDANT cote serveur : on ne debite
    // jamais plus que le max theorique (duree x tarif de la resolution). Ainsi
    // un client ne peut pas forger un pointsToDeduct arbitraire. On garde une
    // petite marge (1 palier) pour absorber les arrondis de synchronisation.
    const requested = Math.floor(pointsToDeduct || (sessionDuration * rate) || 0)
    const maxAllowed = sessionDuration > 0
      ? Math.floor(sessionDuration * rate) + rate
      : requested
    const points = Math.max(0, Math.min(requested, maxAllowed))
    if (points <= 0) {
      return NextResponse.json({ success: false, error: 'Rien a deduire' }, { status: 400 })
    }

    // Cap quotidien de GPU (2h/jour/compte) : on comptabilise le temps reellement
    // ecoule sur cette sync (~10s) puis on coupe le swap si le plafond est atteint.
    // C'est ce qui rend le garde-fou effectif (l'emission du token ne comptait 0s).
    const elapsed = Math.max(0, Math.min(Math.floor(sessionDuration || 0), 60))
    const gpu = trackGPUUsage(user.id, elapsed)
    if (!gpu.allowed) {
      console.warn(`[Points] CAP quotidien atteint user=${user.id} used=${gpu.totalUsed}s`)
      return NextResponse.json(
        { success: false, error: 'Limite quotidienne de swap atteinte (2h). Reessaie demain.', code: 'daily_cap', depleted: true },
        { status: 429 }
      )
    }

    // ...mais on ecrit avec le service_role (RLS verrouille les ecritures via la
    // cle publique). C'est sur : on reste STRICTEMENT scope au user_id verifie,
    // donc l'utilisateur ne peut pas manipuler son propre solde depuis le client.
    const admin = createAdminClient()

    // Recuperer les points actuels (scope au user authentifie)
    const { data: subscription, error: fetchError } = await admin
      .from('subscriptions')
      .select('id, points, max_points, plan')
      .eq('user_id', user.id)
      .single()

    if (fetchError || !subscription) {
      return NextResponse.json({ 
        success: false, 
        error: 'Aucun abonnement trouve',
        currentPoints: 0
      }, { status: 404 })
    }

    const currentPoints = subscription.points || 0

    // Si le solde est deja a zero, rien a deduire : le swap doit s'arreter.
    if (currentPoints <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Points insuffisants',
        currentPoints: 0,
        depleted: true,
      }, { status: 400 })
    }

    // Deduire ce qui est demande, mais jamais plus que le solde disponible.
    // Ainsi le client consomme TOUS ses points jusqu'a epuisement, sans
    // gaspiller le dernier palier incomplet.
    const pointsDeducted = Math.min(points, currentPoints)
    const newPoints = currentPoints - pointsDeducted
    const depleted = newPoints <= 0

    const { error: updateError } = await admin
      .from('subscriptions')
      .update({ 
        points: newPoints,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.id)

    if (updateError) {
      console.error('[Points] Update error:', updateError)
      return NextResponse.json({ 
        success: false, 
        error: 'Erreur mise a jour points'
      }, { status: 500 })
    }

    // NB : on n'enregistre PLUS de ligne swap_sessions ici. Cette route est
    // appelee toutes les ~10s pour deduire les points ; enregistrer a chaque
    // fois creait des dizaines de fausses "sessions" de 10s. L'historique est
    // desormais ecrit UNE fois par swap via la branche saveSession ci-dessus.

    return NextResponse.json({
      success: true,
      previousPoints: currentPoints,
      pointsDeducted,
      currentPoints: newPoints,
      maxPoints: subscription.max_points || 0,
      // Signale au client que le solde est epuise -> il doit couper le swap.
      depleted,
    })

  } catch (error) {
    console.error('[Points] Error:', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

// GET: Recuperer les points actuels de l'utilisateur
export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Non authentifie' }, { status: 401 })
    }

    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('points, max_points, plan, expires_at, is_active')
      .eq('user_id', user.id)
      .single()

    if (error || !subscription) {
      return NextResponse.json({
        success: true,
        points: 0,
        maxPoints: 0,
        plan: 'free',
        isActive: false
      })
    }

    // Verifier si l'abonnement est expire
    const expiresMs = subscription.expires_at ? new Date(subscription.expires_at).getTime() : null
    const isExpired = expiresMs !== null && expiresMs < Date.now()

    // Fenetre de grace de GRACE_DAYS : passe ce delai, les points non utilises
    // sont definitivement remis a zero (meme regle que le verrou de swap).
    let points = subscription.points || 0
    if (isExpired && expiresMs !== null) {
      const daysSinceExpiry = (Date.now() - expiresMs) / 86_400_000
      if (daysSinceExpiry > GRACE_DAYS && points > 0) {
        await supabase.from('subscriptions').update({ points: 0 }).eq('user_id', user.id)
        points = 0
      }
    }

    return NextResponse.json({
      success: true,
      points,
      maxPoints: subscription.max_points || 0,
      plan: subscription.plan || 'free',
      isActive: subscription.is_active && !isExpired,
      expiresAt: subscription.expires_at
    })

  } catch (error) {
    console.error('[Points] Error:', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
