import { createDecartClient } from '@decartai/sdk'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const apiKey = process.env.DECART_API_KEY

  if (!apiKey) {
    console.error('❌ DECART_API_KEY not configured on Vercel')
    return NextResponse.json(
      { error: 'DECART_API_KEY not configured' },
      { status: 500 }
    )
  }

  try {
    const client = createDecartClient({ apiKey })

    const token = await client.tokens.create({
      expiresIn: 600, // 10 minutes
      allowedModels: ['lucy-2.1'],
    })

    return NextResponse.json({
      success: true,
      token: token.apiKey || token.token,
      expiresAt: token.expiresAt
    })
  } catch (error: any) {
    console.error('[Decart Token] Error:', error.message)
    return NextResponse.json(
      { error: 'Failed to create Decart token', details: error.message },
      { status: 500 }
    )
  }
}
