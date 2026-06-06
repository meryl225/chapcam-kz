// Types for ChapCam Cloud Swap Architecture

export interface HardwareCapabilities {
  tier: 'high-end' | 'mid-range' | 'low-end' | 'mobile'
  gpu: {
    name: string
    vram: number
    isDiscrete: boolean
    supportsWebGPU: boolean
  }
  cpu: {
    cores: number
    threads: number
  }
  memory: number
  network: {
    downlink: number
    rtt: number
    effectiveType: string
  }
  canProcessLocally: boolean
  recommendedMode: 'local' | 'cloud' | 'hybrid'
  maxResolution: '480p' | '720p' | '1080p' | '4k'
  maxFps: number
}

export interface SwapSession {
  id: string
  userId: string
  roomName: string
  mode: 'local' | 'cloud' | 'hybrid'
  status: 'connecting' | 'active' | 'paused' | 'ended'
  quality: QualitySettings
  stats: SessionStats
  startedAt: Date
  endedAt?: Date
}

export interface QualitySettings {
  resolution: '480p' | '720p' | '1080p' | '4k'
  fps: number
  bitrate: number
  codec: 'h264' | 'vp8' | 'vp9' | 'av1'
}

export interface SessionStats {
  framesProcessed: number
  averageLatency: number
  peakLatency: number
  droppedFrames: number
  pointsUsed: number
  processingTime: number
  networkLatency: number
  gpuUtilization?: number
}

export interface GPUInstance {
  id: string
  provider: 'runpod' | 'vast' | 'lambda'
  type: string
  vram: number
  status: 'available' | 'busy' | 'offline' | 'warming'
  currentLoad: number
  region: string
  costPerHour: number
  lastHealthCheck: Date
}

export interface CloudSwapConfig {
  mode: 'local' | 'cloud' | 'hybrid'
  avatarId: string
  avatarUrl: string
  quality: QualitySettings
  userId: string
  userTier: 'free' | 'starter' | 'standard' | 'premium' | 'ultimate'
  maxDuration?: number
  enableAdaptiveQuality: boolean
}

export interface LiveKitConfig {
  wsUrl: string
  token: string
  roomName: string
}

export interface SwapFrame {
  timestamp: number
  imageData: string // base64
  width: number
  height: number
  processingMode: 'local' | 'cloud'
}

export interface ProcessedFrame {
  timestamp: number
  imageData: string // base64
  latency: number
  gpuId?: string
}

export interface UserPlan {
  id: string
  name: 'free' | 'starter' | 'standard' | 'premium' | 'ultimate'
  points: number
  maxPoints: number
  maxResolution: '480p' | '720p' | '1080p' | '4k'
  maxFps: number
  cloudProcessingEnabled: boolean
  priorityQueue: boolean
  maxSessionDuration: number // in seconds, -1 for unlimited
}

export const PLAN_LIMITS: Record<string, UserPlan> = {
  free: {
    id: 'free',
    name: 'free',
    points: 0,
    maxPoints: 0,
    maxResolution: '480p',
    maxFps: 15,
    cloudProcessingEnabled: false,
    priorityQueue: false,
    maxSessionDuration: 300 // 5 minutes
  },
  starter: {
    id: 'starter',
    name: 'starter',
    points: 500,
    maxPoints: 500,
    maxResolution: '720p',
    maxFps: 24,
    cloudProcessingEnabled: true,
    priorityQueue: false,
    maxSessionDuration: 600 // 10 minutes
  },
  standard: {
    id: 'standard',
    name: 'standard',
    points: 1250,
    maxPoints: 1250,
    maxResolution: '1080p',
    maxFps: 30,
    cloudProcessingEnabled: true,
    priorityQueue: false,
    maxSessionDuration: -1 // unlimited
  },
  premium: {
    id: 'premium',
    name: 'premium',
    points: 2500,
    maxPoints: 2500,
    maxResolution: '1080p',
    maxFps: 30,
    cloudProcessingEnabled: true,
    priorityQueue: true,
    maxSessionDuration: -1
  },
  ultimate: {
    id: 'ultimate',
    name: 'ultimate',
    points: 4250,
    maxPoints: 4250,
    maxResolution: '4k',
    maxFps: 60,
    cloudProcessingEnabled: true,
    priorityQueue: true,
    maxSessionDuration: -1
  }
}
