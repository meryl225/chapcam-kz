import { createDecartClient } from '@decartai/sdk'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  // 1. Verifier que l'utilisateur est authentifie
  const session = await auth.api.getSession({
    headers: await headers()
  })

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Non authentifie. Connecte-toi pour utiliser le swap.' },
      { status: 401 }
    )
  }

  const apiKey = process.env.DECART_API_KEY

  if (!apiKey) {
    console.error('[Decart Token] DECART_API_KEY not configured')
    return NextResponse.json(
      { error: 'Service temporairement indisponible' },
      { status: 500 }
    )
  }

  try {
    const client = createDecartClient({ apiKey })

    // 2. Creer un token ephemere avec restrictions
    const token = await client.tokens.create({
      expiresIn: 600, // 10 minutes max
      allowedModels: ['lucy-2.1'],
      allowedOrigins: [
        'https://chapcam.com',
        'https://www.chapcam.com',
        'http://localhost:3000' // Dev only
      ],
      metadata: {
        userId: session.user.id,
        userEmail: session.user.email,
        createdAt: new Date().toISOString()
      }
    })

    console.log(`[Decart Token] Token cree pour user ${session.user.id}`)

    return NextResponse.json({
      success: true,
      token: token.apiKey || token.token,
      expiresAt: token.expiresAt,
      userId: session.user.id
    })
  } catch (error: any) {
    console.error('[Decart Token] Error:', error.message)
    return NextResponse.json(
      { error: 'Impossible de demarrer le swap. Reessaie.', details: error.message },
      { status: 500 }
    )
  }
}
