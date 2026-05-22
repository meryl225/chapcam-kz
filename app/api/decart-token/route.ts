import { NextResponse } from 'next/server'

export async function GET() {
  const apiKey = process.env.DECART_API_KEY || process.env.NEXT_PUBLIC_DECART_API_KEY
  
  if (!apiKey) {
    return NextResponse.json({ error: 'Decart API key not configured' }, { status: 500 })
  }

  return NextResponse.json({ apiKey })
}
