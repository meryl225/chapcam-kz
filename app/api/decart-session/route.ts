import { createDecartClient } from '@decartai/sdk'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const apiKey = process.env.DECART_API_KEY

    if (!apiKey) {
      console.error('DECART_API_KEY manquante sur Vercel')
      return NextResponse.json(
        { error: 'DECART_API_KEY not configured' },
        { status: 500 }
      )
    }

    const client = createDecartClient({ apiKey })

    const token = await client.tokens.create({
      expiresIn: 600,           // 10 minutes
      allowedModels: ['lucy-2.1'],
      // allowedOrigins: ['https://chapcam.com', 'http://localhost:3000'] // décommente si besoin
    })

    return NextResponse.json({
      success: true,
      token: token.apiKey || token.token,   // selon la version du SDK
      expiresAt: token.expiresAt
    })
  } catch (error: any) {
    console.error('[Decart Session] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate token', details: error.message },
      { status: 500 }
    )
  }
}
