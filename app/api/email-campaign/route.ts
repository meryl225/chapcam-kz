import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'

const resend = new Resend(process.env.RESEND_API_KEY)

// Template email pour le rappel de lancement
function getLaunchReminderEmail(userName: string, isD1: boolean) {
  const subject = isD1 
    ? "DEMAIN - Lancement ChapCam a 19h GMT !"
    : "AUJOURD'HUI - ChapCam lance a 19h GMT !"
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0e1a; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #00ff88; font-size: 32px; margin: 0;">ChapCam</h1>
      <p style="color: #888; font-size: 14px; margin-top: 5px;">Face Swap en Temps Reel</p>
    </div>
    
    <!-- Main Content -->
    <div style="background: linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%); border: 1px solid rgba(0, 255, 136, 0.3); border-radius: 20px; padding: 30px; text-align: center;">
      
      <!-- Rocket Icon -->
      <div style="font-size: 60px; margin-bottom: 20px;">🚀</div>
      
      <h2 style="color: #ffffff; font-size: 24px; margin: 0 0 10px 0;">
        ${isD1 ? 'C\'est DEMAIN !' : 'C\'est AUJOURD\'HUI !'}
      </h2>
      
      <p style="color: #00ff88; font-size: 20px; font-weight: bold; margin: 0 0 20px 0;">
        Samedi 30 Mai - 19h GMT
      </p>
      
      <p style="color: #cccccc; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
        Salut ${userName || 'toi'} ! Le lancement officiel de ChapCam ${isD1 ? 'arrive demain' : 'c\'est maintenant'}. 
        Ne rate pas les offres exceptionnelles de lancement !
      </p>
      
      <!-- Offers Box -->
      <div style="background: rgba(0, 255, 136, 0.1); border: 1px solid rgba(0, 255, 136, 0.3); border-radius: 12px; padding: 20px; margin-bottom: 25px;">
        <p style="color: #00ff88; font-weight: bold; margin: 0 0 10px 0;">Offres de Lancement :</p>
        <p style="color: #ffffff; margin: 5px 0;">✓ Jusqu'a <strong>-29%</strong> sur tous les plans</p>
        <p style="color: #ffffff; margin: 5px 0;">✓ Avatars exclusifs offerts</p>
        <p style="color: #ffffff; margin: 5px 0;">✓ Support prioritaire</p>
      </div>
      
      <!-- CTA Button -->
      <a href="https://chapcam.com/#tarifs" style="display: inline-block; background: linear-gradient(90deg, #00ff88, #00d4ff); color: #000000; font-weight: bold; font-size: 16px; padding: 15px 40px; border-radius: 12px; text-decoration: none; margin-bottom: 20px;">
        Voir les Offres
      </a>
      
      <p style="color: #888888; font-size: 12px; margin-top: 20px;">
        Places limitees - Offre valable uniquement pendant le lancement
      </p>
    </div>
    
    <!-- Footer -->
    <div style="text-align: center; margin-top: 30px;">
      <p style="color: #666666; font-size: 12px;">
        Tu recois cet email car tu es inscrit sur ChapCam.<br>
        <a href="https://chapcam.com" style="color: #00ff88;">chapcam.com</a>
      </p>
    </div>
  </div>
</body>
</html>
`
  
  return { subject, html }
}

// POST - Envoyer campagne email (admin only)
export async function POST(request: NextRequest) {
  try {
    // Verifier auth admin
    const session = await auth.api.getSession({
      headers: await headers()
    })
    
    if (!session?.user?.email || session.user.email !== 'fanny.guck@gmail.com') {
      return NextResponse.json({ error: 'Non autorise' }, { status: 403 })
    }
    
    const body = await request.json()
    const { type } = body // 'D1' (demain) ou 'DJ' (jour J)
    
    if (!type || !['D1', 'DJ'].includes(type)) {
      return NextResponse.json({ error: 'Type invalide. Utilise D1 ou DJ' }, { status: 400 })
    }
    
    // Recuperer tous les utilisateurs avec email
    const allUsers = await db.select({
      email: users.email,
      name: users.name
    }).from(users)
    
    if (!allUsers.length) {
      return NextResponse.json({ error: 'Aucun utilisateur trouve' }, { status: 404 })
    }
    
    const isD1 = type === 'D1'
    let successCount = 0
    let errorCount = 0
    
    // Envoyer les emails par batch de 10
    const batchSize = 10
    for (let i = 0; i < allUsers.length; i += batchSize) {
      const batch = allUsers.slice(i, i + batchSize)
      
      const promises = batch.map(async (user) => {
        if (!user.email) return
        
        const { subject, html } = getLaunchReminderEmail(user.name || '', isD1)
        
        try {
          await resend.emails.send({
            from: 'ChapCam <noreply@chapcam.com>',
            to: user.email,
            subject,
            html
          })
          successCount++
        } catch (err) {
          console.error(`Erreur envoi email a ${user.email}:`, err)
          errorCount++
        }
      })
      
      await Promise.all(promises)
      
      // Pause entre les batches pour eviter rate limiting
      if (i + batchSize < allUsers.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Campagne ${type} envoyee`,
      stats: {
        total: allUsers.length,
        success: successCount,
        errors: errorCount
      }
    })
    
  } catch (error: any) {
    console.error('[Email Campaign] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
