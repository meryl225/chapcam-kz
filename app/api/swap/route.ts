import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { base_image, swap_image } = await request.json()

    if (!base_image || !swap_image) {
      return NextResponse.json({ error: 'Missing images' }, { status: 400 })
    }

    const FAL_KEY = process.env.FAL_KEY

    if (!FAL_KEY) {
      return NextResponse.json({ error: 'FAL_KEY not configured' }, { status: 500 })
    }

    // Call fal.ai face-swap API (Lucy 2.0)
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

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Fal.ai error:', errorText)
      return NextResponse.json({ error: 'Swap failed' }, { status: 500 })
    }

    const result = await response.json()

    return NextResponse.json({
      image_url: result.image?.url || result.output?.url || null,
    })

  } catch (error) {
    console.error('Swap API error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
