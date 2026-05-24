import { NextRequest, NextResponse } from 'next/server'
import { getGPUPoolManager } from '@/lib/gpu-pool'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      userId, 
      sessionId,
      avatarUrl,
      quality = '720p',
      processingMode = 'cloud',
      tier = 'free'
    } = body

    // Verifier si l'utilisateur veut du traitement local
    if (processingMode === 'local') {
      return NextResponse.json({
        success: true,
        mode: 'local',
        message: 'Traitement local active - pas besoin de GPU cloud'
      })
    }

    const gpuPool = getGPUPoolManager()

    // Acquerir une instance GPU pour le traitement cloud
    const allocation = await gpuPool.allocateGPU({
      userId,
      tier: tier as 'free' | 'premium',
      avatarUrl,
      quality: quality as '480p' | '720p' | '1080p',
      fps: tier === 'premium' ? 30 : 15
    })

    if (!allocation.success) {
      return NextResponse.json({
        success: false,
        error: allocation.error || 'Aucune instance GPU disponible. Veuillez reessayer.',
        fallbackToLocal: true,
        queuePosition: allocation.queuePosition,
        estimatedWaitTime: allocation.estimatedWaitTime
      }, { status: 503 })
    }

    // Creer une session de swap
    const swapSession = {
      sessionId: sessionId || `swap-${userId}-${Date.now()}`,
      userId,
      gpuWorkerId: allocation.workerId,
      gpuEndpoint: allocation.endpoint,
      avatarUrl,
      quality,
      tier,
      startedAt: Date.now(),
      status: 'active'
    }

    return NextResponse.json({
      success: true,
      mode: 'cloud',
      session: swapSession,
      gpuEndpoint: allocation.endpoint,
      estimatedLatency: 50 // ms
    })
  } catch (error) {
    console.error('[CloudSwap] Error starting session:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur demarrage session swap' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const sessionId = searchParams.get('sessionId')

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId requis' },
        { status: 400 }
      )
    }

    const gpuPool = getGPUPoolManager()
    
    // Liberer l'instance GPU
    await gpuPool.releaseGPU(userId)

    return NextResponse.json({
      success: true,
      message: 'Session terminee',
      sessionId
    })
  } catch (error) {
    console.error('[CloudSwap] Error ending session:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur fin session swap' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const gpuPool = getGPUPoolManager()
    const status = await gpuPool.getGPUStatus()
    
    return NextResponse.json({
      success: true,
      stats: {
        freeWorkers: status.freeWorkers,
        premiumWorkers: status.premiumWorkers,
        activeSessions: status.activeSessions,
        totalLoad: status.totalLoad,
        utilizationPercent: status.totalLoad
      }
    })
  } catch (error) {
    console.error('[CloudSwap] Error getting stats:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur stats' },
      { status: 500 }
    )
  }
}
