import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const FAL_KEY = process.env.FAL_KEY
    
    if (!FAL_KEY) {
      return NextResponse.json(
        { error: 'FAL_KEY not configured' },
        { status: 500 }
      )
    }

    // Return the key for client-side fal.realtime usage
    return NextResponse.json({ 
      token: FAL_KEY 
    })
    
  } catch (error: any) {
    console.error('[v0] Token error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get token' },
      { status: 500 }
    )
  }
}
