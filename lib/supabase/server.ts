import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies, headers } from 'next/headers'

// Hardcoded Supabase credentials for chapcam-kz project
const SUPABASE_URL = 'https://ojmzqokffbptmcktnwdy.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qbXpxb2tmZmJwdG1ja3Rud2R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMTAzNTYsImV4cCI6MjA5NDg4NjM1Nn0.e9sk4b_15ge2LIIQwFpXC3n_q48ctu9IJ6oJxV85kgw'

// The native iOS app has no auth cookies: it sends its Supabase access token as
// `Authorization: Bearer`. The token is validated by Supabase in getUser(), and
// forwarding it to PostgREST keeps every query scoped by RLS to that user.
async function getBearerToken(): Promise<string | null> {
  try {
    const header = (await headers()).get('authorization') || ''
    if (!header.startsWith('Bearer ')) return null
    const token = header.slice(7).trim()
    return token.split('.').length === 3 ? token : null
  } catch {
    return null
  }
}

export async function createClient() {
  const bearer = await getBearerToken()
  if (bearer) {
    const client = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { Authorization: `Bearer ${bearer}` } },
    })
    const getUser = client.auth.getUser.bind(client.auth)
    client.auth.getUser = (jwt?: string) => getUser(jwt ?? bearer)
    return client as unknown as ReturnType<typeof createServerClient>
  }

  const cookieStore = await cookies()

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Ignore errors in Server Components
        }
      },
    },
  })
}

// Client dedie a la generation du lien "mot de passe oublie".
// flowType: 'implicit' => le token du mail n'est PAS prefixe "pkce_" et ne
// necessite donc AUCUN cookie "code verifier". Le lien fonctionne ainsi depuis
// n'importe quel appareil / navigateur (cross-device), et peut etre verifie
// cote navigateur via verifyOtp sur /auth/reset-password.
export async function createResetClient() {
  const cookieStore = await cookies()

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { flowType: 'implicit' },
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Ignore
        }
      },
    },
  })
}
