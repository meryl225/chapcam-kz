import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

// Route serveur qui etablit une session a partir d'un lien de recuperation
// (mot de passe oublie) ou de confirmation d'email. Elle gere les DEUX formats
// de lien Supabase :
//   - token_hash + type  -> verifyOtp (recommande, fonctionne cross-device)
//   - code               -> exchangeCodeForSession (flux PKCE)
// puis pose les cookies de session AVANT de rediriger vers la page de saisie du
// nouveau mot de passe. Sans cette etape, updateUser() echoue avec
// "Auth session missing!".
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)

  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/auth/update-password'

  // Erreur renvoyee directement par Supabase (lien deja consomme / expire).
  const errorCode = searchParams.get('error_code')
  const errorDescription = searchParams.get('error_description')
  if (errorCode) {
    const reason = errorCode === 'otp_expired' ? 'expired' : 'invalid'
    return NextResponse.redirect(
      `${origin}/auth/update-password?reset_error=${reason}&msg=${encodeURIComponent(errorDescription ?? '')}`,
    )
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ojmzqokffbptmcktnwdy.supabase.co',
    process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Ignore
          }
        },
      },
    },
  )

  // Cas 1 : lien avec token_hash (verifyOtp) — le plus fiable, cross-device.
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
    return NextResponse.redirect(`${origin}/auth/update-password?reset_error=expired`)
  }

  // Cas 2 : lien avec code (flux PKCE).
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
    return NextResponse.redirect(`${origin}/auth/update-password?reset_error=expired`)
  }

  // Aucun parametre exploitable.
  return NextResponse.redirect(`${origin}/auth/update-password?reset_error=invalid`)
}
