import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const apiKey = process.env.DECART_API_KEY
    
    if (!apiKey) {
      console.error('[Decart] DECART_API_KEY is not set in environment variables')
      return NextResponse.json(
        { error: 'DECART_API_KEY not configured' },
        { status: 500 }
      )
    }

    // Return the API key for client-side WebRTC connection
    // The Decart SDK on the client will use this to authenticate
    return NextResponse.json({
      apiKey: apiKey,
      expiresAt: Date.now() + 300000, // 5 minutes from now
    })
  } catch (error: any) {
    console.error('[Decart] Session error:', error)
    return NextResponse.json(
      { error: 'Failed to create session', details: error.message },
      { status: 500 }
    )
  }
}
