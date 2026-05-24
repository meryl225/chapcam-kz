import { NextRequest, NextResponse } from 'next/server'
import { gpuPoolManager } from '@/lib/gpu-pool'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      userId, 
      sessionId,
      avatarUrl,
      quality = 'medium',
      processingMode = 'cloud'
    } = body

    // Verifier si l'utilisateur veut du traitement local
    if (processingMode === 'local') {
      return NextResponse.json({
        success: true,
        mode: 'local',
        message: 'Traitement local active - pas besoin de GPU cloud'
      })
    }

    // Acquerir une instance GPU pour le traitement cloud
    const gpuInstance = await gpuPoolManager.acquireInstance(userId, quality as 'low' | 'medium' | 'high')

    if (!gpuInstance) {
      return NextResponse.json({
        success: false,
        error: 'Aucune instance GPU disponible. Veuillez reessayer.',
        fallbackToLocal: true
      }, { status: 503 })
    }

    // Creer une session de swap
    const swapSession = {
      sessionId: sessionId || `swap-${userId}-${Date.now()}`,
      userId,
      gpuInstanceId: gpuInstance.id,
      gpuEndpoint: gpuInstance.endpoint,
      avatarUrl,
      quality,
      startedAt: Date.now(),
      status: 'active'
    }

    return NextResponse.json({
      success: true,
      mode: 'cloud',
      session: swapSession,
      gpuEndpoint: gpuInstance.endpoint,
      estimatedLatency: gpuInstance.region === 'eu-west' ? 50 : 100 // ms
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

    // Liberer l'instance GPU
    gpuPoolManager.releaseInstance(userId)

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
    const stats = gpuPoolManager.getPoolStats()
    
    return NextResponse.json({
      success: true,
      stats: {
        totalInstances: stats.total,
        availableInstances: stats.available,
        inUseInstances: stats.inUse,
        utilizationPercent: stats.total > 0 ? Math.round((stats.inUse / stats.total) * 100) : 0
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
