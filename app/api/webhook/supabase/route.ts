import { NextRequest, NextResponse } from 'next/server'
import { sendWelcomeEmail } from '@/lib/email'

// Webhook appele par Supabase apres inscription
export async function POST(request: NextRequest) {
  try {
    // Verifier le secret pour securiser le webhook
    const authHeader = request.headers.get('authorization')
    const webhookSecret = process.env.SUPABASE_WEBHOOK_SECRET
    
    if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, record } = body

    // Verifier que c'est un evenement d'inscription
    if (type === 'INSERT' && record) {
      const email = record.email
      const fullName = record.raw_user_meta_data?.full_name || record.email?.split('@')[0] || 'Utilisateur'

      console.log('[v0] Sending welcome email to:', email)

      // Envoyer l'email de bienvenue
      const result = await sendWelcomeEmail(email, fullName)

      if (result.success) {
        console.log('[v0] Welcome email sent successfully to:', email)
        return NextResponse.json({ success: true, message: 'Email de bienvenue envoye' })
      } else {
        console.error('[v0] Failed to send welcome email:', result.error)
        return NextResponse.json({ success: false, error: result.error }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, message: 'Event ignored' })
  } catch (error) {
    console.error('[v0] Webhook error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
