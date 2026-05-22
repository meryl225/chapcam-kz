import { NextRequest, NextResponse } from 'next/server'

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

    // Upload base64 frame to fal storage
    const base64Data = base_image.replace(/^data:image\/\w+;base64,/, '')

    const uploadResponse = await fetch('https://fal.run/fal-ai/storage/upload/base64', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64Data,
        content_type: 'image/jpeg',
      }),
    })

    if (!uploadResponse.ok) {
      const err = await uploadResponse.text()
      console.error('[swap] Upload error:', err)
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    }

    const { url: baseImageUrl } = await uploadResponse.json()

    // Call fal.ai face-swap
    const swapResponse = await fetch('https://fal.run/fal-ai/face-swap', {
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

    if (!swapResponse.ok) {
      const errorText = await swapResponse.text()
      console.error('[swap] Face-swap error:', errorText)
      return NextResponse.json({ error: 'Swap failed' }, { status: 500 })
    }

    const result = await swapResponse.json()
    const imageUrl = result.image?.url || result.images?.[0]?.url || null

    return NextResponse.json({ 
      success: true,
      image: imageUrl,
      image_url: imageUrl,
    })

  } catch (error: any) {
    console.error('[swap] Internal error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal error' },
      { status: 500 }
    )
  }
}
