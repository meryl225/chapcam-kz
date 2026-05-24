import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 2 points = 1 seconde
const POINTS_PER_SECOND = 2

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Non authentifie' }, { status: 401 })
    }

    const body = await request.json()
    const { pointsToDeduct, sessionDuration } = body

    // Calculer les points a deduire
    const points = pointsToDeduct || (sessionDuration * POINTS_PER_SECOND)

    // Recuperer les points actuels
    const { data: subscription, error: fetchError } = await supabase
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
    
    // Verifier si l'utilisateur a assez de points
    if (currentPoints < points) {
      return NextResponse.json({ 
        success: false, 
        error: 'Points insuffisants',
        currentPoints,
        requiredPoints: points
      }, { status: 400 })
    }

    // Deduire les points
    const newPoints = Math.max(0, currentPoints - points)
    
    const { error: updateError } = await supabase
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

    // Enregistrer la session de swap
    await supabase.from('swap_sessions').insert({
      user_id: user.id,
      duration_seconds: sessionDuration || Math.floor(points / POINTS_PER_SECOND),
      points_used: points,
    })

    return NextResponse.json({
      success: true,
      previousPoints: currentPoints,
      pointsDeducted: points,
      currentPoints: newPoints,
      maxPoints: subscription.max_points || 0
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
    const isExpired = subscription.expires_at && new Date(subscription.expires_at) < new Date()
    
    return NextResponse.json({
      success: true,
      points: subscription.points || 0,
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
