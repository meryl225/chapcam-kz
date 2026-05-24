// GPU Pool Manager for RunPod Serverless
// Manages GPU allocation, load balancing, and auto-scaling

export interface GPUWorker {
  id: string
  endpoint: string
  status: 'idle' | 'processing' | 'error' | 'scaling'
  load: number // 0-100
  currentSessions: number
  maxSessions: number
  tier: 'free' | 'premium'
  lastHeartbeat: number
}

export interface GPUAllocationResult {
  success: boolean
  workerId?: string
  endpoint?: string
  queuePosition?: number
  estimatedWaitTime?: number
  error?: string
}

export interface SessionConfig {
  userId: string
  tier: 'free' | 'premium'
  avatarUrl: string
  quality: '480p' | '720p' | '1080p'
  fps: number
}

// RunPod API configuration
const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY || ''
const RUNPOD_ENDPOINT_FACE = process.env.RUNPOD_ENDPOINT_FACE || ''
const RUNPOD_ENDPOINT_BODY = process.env.RUNPOD_ENDPOINT_BODY || ''

// Tier configurations
const TIER_CONFIG = {
  free: {
    maxResolution: '480p' as const,
    maxFps: 15,
    maxSessionDuration: 5 * 60, // 5 minutes in seconds
    priority: 1,
    gpuMemoryLimit: 4096, // 4GB
  },
  premium: {
    maxResolution: '1080p' as const,
    maxFps: 30,
    maxSessionDuration: Infinity,
    priority: 10,
    gpuMemoryLimit: 12288, // 12GB
  },
}

class GPUPoolManager {
  private workers: Map<string, GPUWorker> = new Map()
  private freeQueue: string[] = []
  private premiumQueue: string[] = []
  private sessionMap: Map<string, string> = new Map() // userId -> workerId

  constructor() {
    // Initialize worker pools
    this.initializeWorkers()
  }

  private initializeWorkers() {
    // In production, these would be dynamically managed by RunPod
    // Here we setup the endpoint references
    console.log('[v0] GPUPoolManager: Initializing worker pools')
  }

  async allocateGPU(config: SessionConfig): Promise<GPUAllocationResult> {
    const { userId, tier } = config

    // Check if user already has an allocation
    const existingWorkerId = this.sessionMap.get(userId)
    if (existingWorkerId) {
      const worker = this.workers.get(existingWorkerId)
      if (worker && worker.status === 'processing') {
        return {
          success: true,
          workerId: existingWorkerId,
          endpoint: worker.endpoint,
        }
      }
    }

    // Get appropriate endpoint based on tier
    const endpoint = this.getEndpointForTier(tier)
    
    // For RunPod Serverless, we don't pre-allocate workers
    // Instead, we return the endpoint and RunPod handles scaling
    const workerId = `runpod-${tier}-${Date.now()}`

    // Track the session
    this.sessionMap.set(userId, workerId)

    return {
      success: true,
      workerId,
      endpoint,
    }
  }

  private getEndpointForTier(tier: 'free' | 'premium'): string {
    // Both tiers use the same endpoint, but with different parameters
    return RUNPOD_ENDPOINT_FACE || 'https://api.runpod.ai/v2/chapcam-swap'
  }

  async processFrame(
    endpoint: string,
    frameData: string,
    avatarData: string,
    config: SessionConfig
  ): Promise<{ success: boolean; processedFrame?: string; latency?: number; error?: string }> {
    const startTime = performance.now()
    const tierConfig = TIER_CONFIG[config.tier]

    try {
      const response = await fetch(`${endpoint}/runsync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RUNPOD_API_KEY}`,
        },
        body: JSON.stringify({
          input: {
            frame: frameData,
            avatar: avatarData,
            quality: Math.min(
              this.resolutionToNumber(config.quality),
              this.resolutionToNumber(tierConfig.maxResolution)
            ),
            fps: Math.min(config.fps, tierConfig.maxFps),
            priority: tierConfig.priority,
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`RunPod API error: ${response.status}`)
      }

      const result = await response.json()
      const latency = performance.now() - startTime

      if (result.output?.frame) {
        return {
          success: true,
          processedFrame: result.output.frame,
          latency,
        }
      } else {
        return {
          success: false,
          error: result.error || 'No output frame received',
        }
      }
    } catch (error) {
      console.error('[v0] GPU processFrame error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  private resolutionToNumber(resolution: '480p' | '720p' | '1080p'): number {
    switch (resolution) {
      case '480p': return 480
      case '720p': return 720
      case '1080p': return 1080
      default: return 720
    }
  }

  async releaseGPU(userId: string): Promise<void> {
    const workerId = this.sessionMap.get(userId)
    if (workerId) {
      this.sessionMap.delete(userId)
      console.log(`[v0] GPUPoolManager: Released GPU for user ${userId}`)
    }
  }

  getTierConfig(tier: 'free' | 'premium') {
    return TIER_CONFIG[tier]
  }

  getQueuePosition(userId: string, tier: 'free' | 'premium'): number {
    const queue = tier === 'free' ? this.freeQueue : this.premiumQueue
    return queue.indexOf(userId) + 1
  }

  async getGPUStatus(): Promise<{
    freeWorkers: number
    premiumWorkers: number
    totalLoad: number
    activeSessions: number
  }> {
    // In production, this would query RunPod API for current worker status
    return {
      freeWorkers: 10,
      premiumWorkers: 40,
      totalLoad: 45,
      activeSessions: this.sessionMap.size,
    }
  }
}

// Singleton instance
let gpuPoolManager: GPUPoolManager | null = null

export function getGPUPoolManager(): GPUPoolManager {
  if (!gpuPoolManager) {
    gpuPoolManager = new GPUPoolManager()
  }
  return gpuPoolManager
}

export { TIER_CONFIG }
