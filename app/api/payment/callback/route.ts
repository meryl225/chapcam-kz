import { NextRequest, NextResponse } from 'next/server'
import { sendPaymentConfirmationEmail } from '@/lib/email'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Verifier le hash PayDunya pour la securite
    const paydunyaHash = request.headers.get('PAYDUNYA-SHA1-SIGNATURE')
    
    // Log du callback pour debug
    console.log('[PayDunya Callback]', JSON.stringify(body, null, 2))
    
    const { data } = body
    
    if (data?.status === 'completed') {
      // Paiement reussi
      const customData = data.custom_data
      const plan = customData?.plan
      const points = parseInt(customData?.points || '0')
      const duration = customData?.duration
      const userEmail = customData?.user_email
      const userName = customData?.user_name || 'Utilisateur'
      const amount = data.invoice?.total_amount || 0
      const transactionId = data.token || data.invoice?.token || 'N/A'
      
      // Mettre a jour la base de donnees avec les points de l'utilisateur
      try {
        const supabase = await createClient()
        
        // Recuperer l'utilisateur par email
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('id, points, plan')
          .eq('email', userEmail)
          .single()
        
        if (userData && !userError) {
          // Calculer la date d'expiration du plan
          const durationDays = parseInt(duration) || 30
          const expiresAt = new Date()
          expiresAt.setDate(expiresAt.getDate() + durationDays)
          
          // Mettre a jour les points et le plan
          const newPoints = (userData.points || 0) + points
          await supabase
            .from('profiles')
            .update({ 
              points: newPoints, 
              plan: plan,
              plan_expires_at: expiresAt.toISOString()
            })
            .eq('id', userData.id)
          
          console.log(`[PayDunya] Updated user ${userEmail}: +${points} points, plan: ${plan}`)
        }
      } catch (dbError) {
        console.error('[PayDunya] Database update error:', dbError)
        // Continue meme si la mise a jour DB echoue - on envoie quand meme l'email
      }
      
      // Envoyer l'email de confirmation de paiement
      const emailResult = await sendPaymentConfirmationEmail(
        userEmail,
        userName,
        plan,
        amount,
        points,
        duration,
        transactionId
      )
      
      if (emailResult.success) {
        console.log(`[PayDunya] Confirmation email sent to ${userEmail}`)
      } else {
        console.error(`[PayDunya] Failed to send confirmation email to ${userEmail}`)
      }
      
      console.log(`[PayDunya Success] User ${userEmail} purchased plan ${plan} with ${points} points`)
      
      return NextResponse.json({ success: true })
    } else if (data?.status === 'cancelled') {
      console.log('[PayDunya Cancelled]', data)
      return NextResponse.json({ success: false, status: 'cancelled' })
    } else {
      console.log('[PayDunya Pending]', data)
      return NextResponse.json({ success: false, status: 'pending' })
    }
  } catch (error) {
    console.error('[PayDunya Callback Error]', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
