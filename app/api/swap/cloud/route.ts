import { NextRequest, NextResponse } from 'next/server'
import { getGPUPoolManager } from '@/lib/gpu-pool'
import { requireAuth, withGPUProtection } from '@/lib/api-security'

export async function POST(request: NextRequest) {
  try {
    // Authentification obligatoire : sans session valide -> 401.
    // Empeche l'abus externe (des milliers de requetes anonymes qui allouaient
    // des GPU couteux). Le userId provient de la session, jamais du body.
    const authResult = await requireAuth()
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const body = await request.json()
    const {
      sessionId,
      avatarUrl,
      quality = '720p',
      processingMode = 'cloud',
      tier = 'free',
    } = body

    // Verifier si l'utilisateur veut du traitement local
    if (processingMode === 'local') {
      return NextResponse.json({
        success: true,
        mode: 'local',
        message: 'Traitement local active - pas besoin de GPU cloud',
      })
    }

    // Protection anti-abus GPU (quota quotidien par utilisateur).
    return withGPUProtection(user.id, 0, async () => {
      const gpuPool = getGPUPoolManager()

      // Acquerir une instance GPU pour le traitement cloud
      const allocation = await gpuPool.allocateGPU({
        userId: user.id,
        tier: tier as 'free' | 'premium',
        avatarUrl,
        quality: quality as '480p' | '720p' | '1080p',
        fps: tier === 'premium' ? 30 : 15,
      })

      if (!allocation.success) {
        return NextResponse.json(
          {
            success: false,
            error: allocation.error || 'Aucune instance GPU disponible. Veuillez reessayer.',
            fallbackToLocal: true,
            queuePosition: allocation.queuePosition,
            estimatedWaitTime: allocation.estimatedWaitTime,
          },
          { status: 503 },
        )
      }

      // Creer une session de swap
      const swapSession = {
        sessionId: sessionId || `swap-${user.id}-${Date.now()}`,
        userId: user.id,
        gpuWorkerId: allocation.workerId,
        gpuEndpoint: allocation.endpoint,
        avatarUrl,
        quality,
        tier,
        startedAt: Date.now(),
        status: 'active',
      }

      return NextResponse.json({
        success: true,
        mode: 'cloud',
        session: swapSession,
        gpuEndpoint: allocation.endpoint,
        estimatedLatency: 50, // ms
      })
    })
  } catch (error) {
    console.error('[CloudSwap] Error starting session:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur demarrage session swap' },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Authentification obligatoire. On libere uniquement le GPU de l'utilisateur
    // connecte (userId issu de la session), pas d'un userId arbitraire.
    const authResult = await requireAuth()
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    const gpuPool = getGPUPoolManager()

    // Liberer l'instance GPU de l'utilisateur connecte
    await gpuPool.releaseGPU(user.id)

    return NextResponse.json({
      success: true,
      message: 'Session terminee',
      sessionId,
    })
  } catch (error) {
    console.error('[CloudSwap] Error ending session:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur fin session swap' },
      { status: 500 },
    )
  }
}

export async function GET() {
  try {
    // Meme les statistiques GPU exigent une session : evite le scraping anonyme.
    const authResult = await requireAuth()
    if (authResult instanceof NextResponse) return authResult

    const gpuPool = getGPUPoolManager()
    const status = await gpuPool.getGPUStatus()

    return NextResponse.json({
      success: true,
      stats: {
        freeWorkers: status.freeWorkers,
        premiumWorkers: status.premiumWorkers,
        activeSessions: status.activeSessions,
        totalLoad: status.totalLoad,
        utilizationPercent: status.totalLoad,
      },
    })
  } catch (error) {
    console.error('[CloudSwap] Error getting stats:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur stats' },
      { status: 500 },
    )
  }
}
