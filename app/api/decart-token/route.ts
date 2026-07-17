import { createDecartClient } from '@decartai/sdk'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveWatermarkForUser, pickDecartApiKey } from '@/lib/watermark'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  // 1. Verifier que l'utilisateur est authentifie
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.id) {
    return NextResponse.json(
      { error: 'Non authentifie. Connecte-toi pour utiliser le swap.' },
      { status: 401 }
    )
  }

  // 2. Choisir la cle Decart selon le forfait (avec/sans watermark).
  //    Toute la decision est cote serveur : le client ne choisit jamais sa cle.
  const decision = await resolveWatermarkForUser(user.id)
  const { apiKey, usedNoWatermark } = pickDecartApiKey(decision.noWatermark)

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
        userId: user.id,
        userEmail: user.email,
        noWatermark: usedNoWatermark,
        createdAt: new Date().toISOString()
      }
    })

    console.log(
      `[Decart Token] Token cree pour user ${user.id} | plan=${decision.plan || 'none'} | ` +
      `noWatermark=${usedNoWatermark} (${decision.reason})`
    )

    return NextResponse.json({
      success: true,
      token: token.apiKey || token.token,
      expiresAt: token.expiresAt,
      userId: user.id,
      noWatermark: usedNoWatermark
    })
  } catch (error: any) {
    console.error('[Decart Token] Error:', error.message)
    return NextResponse.json(
      { error: 'Impossible de demarrer le swap. Reessaie.', details: error.message },
      { status: 500 }
    )
  }
}
