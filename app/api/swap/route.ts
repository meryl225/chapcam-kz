import { NextRequest, NextResponse } from 'next/server'
import { fal } from '@fal-ai/client'

fal.config({
  credentials: process.env.FAL_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { sourceImage, targetImage } = await request.json()

    if (!sourceImage || !targetImage) {
      return NextResponse.json(
        { error: 'sourceImage and targetImage are required' },
        { status: 400 }
      )
    }

    const result = await fal.subscribe('fal-ai/face-swap', {
      input: {
        base_image_url: sourceImage,
        swap_image_url: targetImage,
      },
    })

    return NextResponse.json({ 
      success: true, 
      image: (result as any).data?.image?.url || (result as any).image?.url 
    })
  } catch (error: any) {
    console.error('Swap error:', error)
    return NextResponse.json(
      { error: error.message || 'Swap failed' },
      { status: 500 }
    )
  }
}