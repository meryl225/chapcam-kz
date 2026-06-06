import { NextRequest, NextResponse } from 'next/server'
import { sendPasswordResetEmail } from '@/lib/email'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email requis' },
        { status: 400 }
      )
    }

    // Generer le lien de reinitialisation via Supabase
    const supabase = await createClient()
    const { data, error: supabaseError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://chapcam.com'}/auth/update-password`,
    })

    if (supabaseError) {
      console.error('[API] Supabase reset error:', supabaseError)
      // On ne revele pas si l'email existe ou non pour des raisons de securite
      return NextResponse.json({ 
        success: true, 
        message: 'Si cet email existe, un lien de reinitialisation a ete envoye.' 
      })
    }

    // Note: Supabase envoie deja l'email de reinitialisation par defaut
    // Mais on peut aussi envoyer notre propre email personnalise si on configure
    // le custom SMTP dans Supabase pour desactiver les emails automatiques

    return NextResponse.json({ 
      success: true, 
      message: 'Si cet email existe, un lien de reinitialisation a ete envoye.' 
    })
  } catch (error) {
    console.error('[API] Error sending reset email:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
