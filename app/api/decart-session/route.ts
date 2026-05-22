import { createDecartClient } from '@decartai/sdk'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const apiKey = process.env.DECART_API_KEY
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'DECART_API_KEY not configured' },
        { status: 500 }
      )
    }

    const client = createDecartClient({
      apiKey: apiKey,
    })

    // Create a short-lived client token for frontend use
    const token = await client.tokens.create({
      expiresIn: 300, // 5 minutes
      allowedModels: ['lucy-2.1'],
    })

    return NextResponse.json(token)
  } catch (error: any) {
    console.error('[Decart] Token generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate token', details: error.message },
      { status: 500 }
    )
  }
}
