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

    // Step 1: Upload base_image (webcam frame) to fal storage
    const uploadResponse = await fetch('https://fal.run/fal-ai/storage/upload/base64', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base_image.replace(/^data:image\/\w+;base64,/, ''),
        content_type: 'image/jpeg',
      }),
    })

    if (!uploadResponse.ok) {
      const err = await uploadResponse.text()
      console.error('Upload error:', err)
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    }

    const { url: baseImageUrl } = await uploadResponse.json()

    // Step 2: Call fal.ai face-swap with correct parameters
    const response = await fetch('https://fal.run/fal-ai/face-swap', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        base_image_url: baseImageUrl,
        swap_image_url: swap_image,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Fal.ai face-swap error:', errorText)
      return NextResponse.json({ error: 'Swap failed' }, { status: 500 })
    }

    const result = await response.json()

    return NextResponse.json({
      image_url: result.image?.url || result.images?.[0]?.url || null,
    })

  } catch (error) {
    console.error('Swap API error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
