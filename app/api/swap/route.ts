import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Support both parameter formats
    const base_image = body.base_image || body.sourceImage
    const swap_image = body.swap_image || body.targetImage

    if (!base_image || !swap_image) {
      return NextResponse.json(
        { error: 'Missing images' },
        { status: 400 }
      )
    }

    const FAL_KEY = process.env.FAL_KEY
    if (!FAL_KEY) {
      return NextResponse.json(
        { error: 'FAL_KEY not configured' },
        { status: 500 }
      )
    }

    // Call fal.ai face-swap API directly
    const response = await fetch('https://queue.fal.run/fal-ai/face-swap', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        base_image_url: base_image,
        swap_image_url: swap_image,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Fal.ai error:', errorText)
      return NextResponse.json(
        { error: 'Face swap failed', details: errorText },
        { status: response.status }
      )
    }

    const result = await response.json()
    
    // Handle different response formats from fal.ai
    const imageUrl = result.image?.url || result.images?.[0]?.url || result.output?.url

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'No image in response', result },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      image: imageUrl,
    })

  } catch (error: any) {
    console.error('Swap error:', error)
    return NextResponse.json(
      { error: error.message || 'Swap failed' },
      { status: 500 }
    )
  }
}