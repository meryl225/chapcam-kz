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
      // Identifiant unique du swap en cours (genere par le client au demarrage).
      // Cle d'upsert : garantit UNE seule ligne swap_sessions par swap, creee des
      // le premier heartbeat -> plus aucune session "fantome" si le client meurt.
      sessionId,
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
      const admin = createAdminClient()
      const endedAt = new Date()
      const startedAtDate = startedAt ? new Date(startedAt) : new Date(endedAt.getTime() - duration * 1000)
      // Points bornes au max theorique (duree x tarif) : un client ne peut pas
      // gonfler l'historique. Le ratio points_used/duration_seconds distingue
      // ensuite une session HD (4 pts/s) d'une SD (2 pts/s).
      const finalPoints = Math.max(0, Math.min(
        Math.floor(pointsToDeduct || duration * rate),
        duration * rate,
      ))
      const frames = Math.max(0, Math.floor(framesProcessed || 0))

      // Cas normal : une ligne a deja ete creee par les heartbeats. On la
      // FINALISE (avatar, totaux, finalized=true) au lieu d'en creer une 2e.
      if (sessionId) {
        const { data: existing } = await admin
          .from('swap_sessions')
          .select('id, duration_seconds, points_used')
          .eq('session_id', sessionId)
          .eq('user_id', user.id)
          .maybeSingle()
        if (existing) {
          const { error: finErr } = await admin
            .from('swap_sessions')
            .update({
              avatar_id: avatarId ?? null,
              avatar_name: avatarName ?? null,
              // On garde le plus grand entre l'accumule (heartbeats) et le total
              // client, pour ne JAMAIS sous-compter la conso reelle.
              duration_seconds: Math.max(existing.duration_seconds || 0, duration),
              points_used: Math.max(existing.points_used || 0, finalPoints),
              frames_processed: frames,
              ended_at: endedAt.toISOString(),
              updated_at: endedAt.toISOString(),
              finalized: true,
            })
            .eq('id', existing.id)
          if (finErr) {
            console.error('[Points] Finalize session error:', finErr)
            return NextResponse.json({ success: false, error: 'Erreur finalisation session' }, { status: 500 })
          }
          return NextResponse.json({ success: true, finalized: true })
        }
      }

      // Repli : aucune ligne heartbeat (session tres courte, ou sans sessionId).
      // Rien a enregistrer si la session est vide.
      if (duration <= 0) {
        return NextResponse.json({ success: true, skipped: true })
      }
      const { error: sessionError } = await admin.from('swap_sessions').insert({
        session_id: sessionId ?? null,
        user_id: user.id,
        avatar_id: avatarId ?? null,
        avatar_name: avatarName ?? null,
        duration_seconds: duration,
        points_used: finalPoints,
        frames_processed: frames,
        started_at: startedAtDate.toISOString(),
        ended_at: endedAt.toISOString(),
        finalized: true,
        updated_at: endedAt.toISOString(),
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

    // === Upsert "heartbeat" de la session ===
    // A chaque deduction (~10s), on cree la ligne swap_sessions au 1er battement
    // puis on l'incremente. Resultat : des qu'UN point est debite, la session
    // existe en base -> plus aucune session "fantome" si l'onglet se ferme, si le
    // reseau tombe, ou si le beacon de fin echoue. La finalisation (avatar,
    // finalized=true) se fera via la branche saveSession a l'arret propre.
    // Non bloquant : un echec ici ne doit jamais empecher la deduction.
    if (sessionId) {
      try {
        const nowIso = new Date().toISOString()
        const { data: existing } = await admin
          .from('swap_sessions')
          .select('id, duration_seconds, points_used')
          .eq('session_id', sessionId)
          .eq('user_id', user.id)
          .maybeSingle()
        if (existing) {
          await admin
            .from('swap_sessions')
            .update({
              duration_seconds: (existing.duration_seconds || 0) + elapsed,
              points_used: (existing.points_used || 0) + pointsDeducted,
              ended_at: nowIso,
              updated_at: nowIso,
            })
            .eq('id', existing.id)
        } else {
          const startIso = startedAt ? new Date(startedAt).toISOString() : nowIso
          const { error: insErr } = await admin.from('swap_sessions').insert({
            session_id: sessionId,
            user_id: user.id,
            avatar_id: avatarId ?? null,
            avatar_name: avatarName ?? null,
            duration_seconds: elapsed,
            points_used: pointsDeducted,
            frames_processed: 0,
            started_at: startIso,
            ended_at: nowIso,
            finalized: false,
            updated_at: nowIso,
          })
          // Course rare (2 heartbeats quasi simultanes) : l'index unique rejette
          // le 2e insert -> on rejoue en increment sur la ligne desormais presente.
          if (insErr) {
            const { data: again } = await admin
              .from('swap_sessions')
              .select('id, duration_seconds, points_used')
              .eq('session_id', sessionId)
              .eq('user_id', user.id)
              .maybeSingle()
            if (again) {
              await admin
                .from('swap_sessions')
                .update({
                  duration_seconds: (again.duration_seconds || 0) + elapsed,
                  points_used: (again.points_used || 0) + pointsDeducted,
                  ended_at: nowIso,
                  updated_at: nowIso,
                })
                .eq('id', again.id)
            }
          }
        }
      } catch (e) {
        console.error('[Points] Heartbeat session upsert echoue:', e)
      }
    }

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
