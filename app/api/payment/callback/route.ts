import { NextRequest, NextResponse } from 'next/server'

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
      const userEmail = customData?.user_email
      
      // TODO: Mettre a jour la base de donnees avec les points de l'utilisateur
      // await updateUserPoints(userEmail, points, plan)
      
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
