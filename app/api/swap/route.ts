import { NextRequest, NextResponse } from 'next/server'
import { fal } from '@fal-ai/client'

// Configure fal client
fal.config({
  credentials: process.env.FAL_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { base_image, swap_image } = await request.json()

    console.log('[v0] Swap API called')
    console.log('[v0] base_image length:', base_image?.length)
    console.log('[v0] swap_image:', swap_image?.substring(0, 100))

    if (!base_image || !swap_image) {
      console.error('[v0] Missing images')
      return NextResponse.json({ error: 'Missing images' }, { status: 400 })
    }

    const FAL_KEY = process.env.FAL_KEY
    if (!FAL_KEY) {
      console.error('[v0] FAL_KEY not configured')
      return NextResponse.json({ error: 'FAL_KEY not configured' }, { status: 500 })
    }

    console.log('[v0] Calling fal.ai face-swap...')
    
    // Use fal.subscribe for face-swap
    const result = await fal.subscribe('fal-ai/face-swap', {
      input: {
        base_image_url: base_image,
        swap_image_url: swap_image,
      },
      logs: true,
      onQueueUpdate: (update) => {
        console.log('[v0] Queue update:', update.status)
      },
    })

    console.log('[v0] Fal.ai result:', JSON.stringify(result, null, 2))

    // Extract image URL from result
    const imageUrl = (result as any)?.image?.url || 
                     (result as any)?.data?.image?.url || 
                     (result as any)?.output?.url ||
                     (result as any)?.images?.[0]?.url

    if (!imageUrl) {
      console.error('[v0] No image URL in result')
      return NextResponse.json({ error: 'No image generated' }, { status: 500 })
    }

    console.log('[v0] Success, image URL:', imageUrl.substring(0, 100))
    return NextResponse.json({ image_url: imageUrl })

  } catch (error: any) {
    console.error('[v0] Swap API error:', error?.message || error)
    return NextResponse.json({ 
      error: error?.message || 'Swap failed',
      details: String(error)
    }, { status: 500 })
  }
}
