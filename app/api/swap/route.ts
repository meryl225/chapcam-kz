import { NextRequest, NextResponse } from 'next/server'
import { fal } from '@fal-ai/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

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

    // Configure fal client
    fal.config({ credentials: FAL_KEY })

    // Use fal.subscribe for synchronous execution with automatic polling
    const result = await fal.subscribe('fal-ai/face-swap', {
      input: {
        base_image_url: base_image,
        swap_image_url: swap_image,
      },
    })

    console.log('[v0] Fal.ai result:', JSON.stringify(result, null, 2))

    // Extract image URL from result - fal.ai returns different structures
    const data = result.data || result
    const imageUrl = data?.image?.url || 
                     data?.image || 
                     data?.images?.[0]?.url ||
                     data?.output?.url ||
                     (typeof data === 'string' ? data : null)

    console.log('[v0] Extracted imageUrl:', imageUrl)
    console.log('[v0] Full data keys:', data ? Object.keys(data) : 'null')

    if (!imageUrl) {
      console.log('[v0] No image found in result:', result)
      return NextResponse.json(
        { error: 'No image in response', result: data },
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
      { error: error.message || 'Swap failed', details: error.body || error.toString() },
      { status: 500 }
    )
  }
}
