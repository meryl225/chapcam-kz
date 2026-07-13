import { createDecartClient } from '@decartai/sdk'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  // 1. Verifier que l'utilisateur est authentifie
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.id) {
    return NextResponse.json(
      { error: 'Non authentifie. Connecte-toi pour utiliser le swap.' },
      { status: 401 }
    )
  }

  try {
    const apiKey = process.env.DECART_API_KEY

    if (!apiKey) {
      console.error('[Decart Session] DECART_API_KEY manquante')
      return NextResponse.json(
        { error: 'Service temporairement indisponible' },
        { status: 500 }
      )
    }

    const client = createDecartClient({ apiKey })

    // 2. Creer un token ephemere avec restrictions strictes
    const token = await client.tokens.create({
      expiresIn: 600, // 10 minutes max
      allowedModels: ['lucy-2.5', 'lucy-2.1'],
      allowedOrigins: [
        'https://chapcam.com',
        'https://www.chapcam.com',
        'http://localhost:3000'
      ],
      metadata: {
        userId: user.id,
        userEmail: user.email,
        sessionType: 'realtime-swap',
        createdAt: new Date().toISOString()
      }
    })

    console.log(`[Decart Session] Session creee pour user ${user.id}`)

    return NextResponse.json({
      success: true,
      token: token.apiKey || token.token,
      expiresAt: token.expiresAt,
      userId: user.id
    })
  } catch (error: any) {
    console.error('[Decart Session] Error:', error)
    return NextResponse.json(
      { error: 'Impossible de demarrer la session. Reessaie.', details: error.message },
      { status: 500 }
    )
  }
}
