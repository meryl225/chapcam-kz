import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Lazy initialization to avoid build-time errors
function getResend() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('RESEND_API_KEY not configured')
  }
  return new Resend(apiKey)
}

// Template email pour le rappel de lancement
function getLaunchReminderEmail(userName: string, isReminder: 'friday' | 'saturday') {
  const subject = isReminder === 'friday' 
    ? "J-1 avant le lancement de ChapCam !" 
    : "C'est aujourd'hui ! ChapCam lance a 19h"
  
  return {
    subject,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0e1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0e1a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%); border-radius: 24px; border: 1px solid rgba(0, 255, 136, 0.3); overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(90deg, #7c3aed, #ec4899, #f59e0b); padding: 20px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 800;">
                ${isReminder === 'friday' ? 'J-1' : "C'est le jour J !"}
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #ffffff; font-size: 18px; margin: 0 0 20px;">
                Salut ${userName || 'ami'},
              </p>
              
              ${isReminder === 'friday' ? `
              <p style="color: #a0a0a0; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Plus qu'un jour avant le grand lancement de <span style="color: #00ff88; font-weight: bold;">ChapCam</span> !
              </p>
              <p style="color: #a0a0a0; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Rendez-vous demain <strong style="color: white;">Samedi 31 Mai a 19h00</strong> pour decouvrir la revolution du face swap en temps reel.
              </p>
              ` : `
              <p style="color: #a0a0a0; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Le moment est arrive ! <span style="color: #00ff88; font-weight: bold;">ChapCam</span> lance officiellement aujourd'hui a <strong style="color: white;">19h00</strong>.
              </p>
              <p style="color: #a0a0a0; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Sois parmi les premiers a telecharger l'application et profite des offres de lancement exclusives !
              </p>
              `}
              
              <!-- Offer Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(0, 255, 136, 0.1); border: 1px solid rgba(0, 255, 136, 0.3); border-radius: 16px; margin: 30px 0;">
                <tr>
                  <td style="padding: 25px; text-align: center;">
                    <p style="color: #00ff88; font-size: 14px; font-weight: bold; text-transform: uppercase; margin: 0 0 10px;">
                      Offre de Lancement
                    </p>
                    <p style="color: white; font-size: 32px; font-weight: 800; margin: 0 0 10px;">
                      Jusqu'a -29%
                    </p>
                    <p style="color: #a0a0a0; font-size: 14px; margin: 0;">
                      sur tous les plans + avatars exclusifs offerts
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="https://chapcam.com" style="display: inline-block; background: linear-gradient(90deg, #00ff88, #00d4ff); color: #000000; font-size: 16px; font-weight: bold; text-decoration: none; padding: 16px 40px; border-radius: 12px;">
                      ${isReminder === 'friday' ? 'Voir les offres' : 'Telecharger maintenant'}
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Countdown -->
              <p style="color: #a0a0a0; font-size: 14px; text-align: center; margin: 30px 0 0;">
                ${isReminder === 'friday' ? 'Rendez-vous demain Samedi 31 Mai a 19h !' : 'Lancement a 19h00 - Ne rate pas ca !'}
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; border-top: 1px solid rgba(255,255,255,0.1);">
              <p style="color: #666; font-size: 12px; text-align: center; margin: 0;">
                ChapCam - Face Swap en Temps Reel<br>
                <a href="https://chapcam.com" style="color: #00ff88;">chapcam.com</a>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `
  }
}

// POST - Send launch reminder to all users or specific user
export async function POST(request: Request) {
  try {
    // Verify admin or internal call
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    const internalSecret = request.headers.get('x-internal-secret')
    const isInternalCall = internalSecret === process.env.INTERNAL_API_SECRET
    
    // Only admin or internal calls can trigger mass emails
    if (!user?.email?.includes('admin') && !isInternalCall) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type = 'friday', testEmail } = body

    // If test email, only send to that address
    if (testEmail) {
      const emailContent = getLaunchReminderEmail('Testeur', type)
      const resend = getResend()
      
      const { data, error } = await resend.emails.send({
        from: 'ChapCam <noreply@chapcam.com>',
        to: testEmail,
        subject: emailContent.subject,
        html: emailContent.html,
      })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true, 
        message: `Test email sent to ${testEmail}`,
        id: data?.id 
      })
    }

    // Get all users via admin client (service_role), emails from auth.users
    const admin = createAdminClient()
    const usersWithEmail: { email: string; name: string }[] = []

    let page = 1
    const perPage = 1000
    while (true) {
      const { data: listData, error: dbError } = await admin.auth.admin.listUsers({ page, perPage })

      if (dbError) {
        return NextResponse.json({ error: dbError.message }, { status: 500 })
      }

      const batchUsers = listData?.users ?? []
      for (const u of batchUsers) {
        if (u.email) {
          const name = (u.user_metadata?.name as string) || u.email.split('@')[0]
          usersWithEmail.push({ email: u.email, name })
        }
      }

      if (batchUsers.length < perPage) break
      page++
    }

    if (usersWithEmail.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'No users with email found' 
      })
    }

    // Send emails in batches
    const batchSize = 50
    let sentCount = 0
    let errorCount = 0

    for (let i = 0; i < usersWithEmail.length; i += batchSize) {
      const batch = usersWithEmail.slice(i, i + batchSize)
      
      const promises = batch.map(async (user) => {
        const emailContent = getLaunchReminderEmail(user.name || 'ami', type)
        const resend = getResend()
        
        try {
          await resend.emails.send({
            from: 'ChapCam <noreply@chapcam.com>',
            to: user.email!,
            subject: emailContent.subject,
            html: emailContent.html,
          })
          sentCount++
        } catch (err) {
          console.error(`Failed to send to ${user.email}:`, err)
          errorCount++
        }
      })

      await Promise.all(promises)
      
      // Rate limit: wait between batches
      if (i + batchSize < usersWithEmail.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    return NextResponse.json({
      success: true,
      message: `Campaign completed`,
      stats: {
        total: usersWithEmail.length,
        sent: sentCount,
        errors: errorCount
      }
    })

  } catch (error: any) {
    console.error('[Email Campaign] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to send emails', 
      details: error.message 
    }, { status: 500 })
  }
}
