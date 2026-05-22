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

    // Use fal.run for synchronous execution (not queue.fal.run)
    const response = await fetch('https://fal.run/fal-ai/face-swap', {
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

    const responseText = await response.text()
    console.log('[v0] Fal.ai response status:', response.status)
    console.log('[v0] Fal.ai response:', responseText)

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Face swap failed', details: responseText },
        { status: response.status }
      )
    }

    let result
    try {
      result = JSON.parse(responseText)
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid JSON response', details: responseText },
        { status: 500 }
      )
    }
    
    // Handle different response formats from fal.ai
    const imageUrl = result.image?.url || 
                     result.image || 
                     result.images?.[0]?.url || 
                     result.output?.url ||
                     result.output ||
                     result.url

    console.log('[v0] Extracted image URL:', imageUrl)

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
    console.error('[v0] Swap error:', error)
    return NextResponse.json(
      { error: error.message || 'Swap failed' },
      { status: 500 }
    )
  }
}
