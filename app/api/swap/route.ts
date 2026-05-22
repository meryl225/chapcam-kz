import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { sourceImage, targetImage } = await request.json()

    if (!sourceImage || !targetImage) {
      return NextResponse.json(
        { error: 'sourceImage and targetImage are required' },
        { status: 400 }
      )
    }

    const falKey = process.env.FAL_KEY
    if (!falKey) {
      return NextResponse.json(
        { error: 'FAL_KEY not configured' },
        { status: 500 }
      )
    }

    // Call fal.ai face-swap API directly
    const response = await fetch('https://queue.fal.run/fal-ai/face-swap', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        base_image_url: sourceImage,
        swap_image_url: targetImage,
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
    
    // fal.ai returns the result in different formats depending on sync/async
    const imageUrl = result.image?.url || result.images?.[0]?.url || result.output?.url

    if (!imageUrl) {
      console.error('No image URL in result:', result)
      return NextResponse.json(
        { error: 'No image returned from face swap' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      image: imageUrl 
    })

  } catch (error: any) {
    console.error('Swap error:', error)
    return NextResponse.json(
      { error: error.message || 'Swap failed' },
      { status: 500 }
    )
  }
}
