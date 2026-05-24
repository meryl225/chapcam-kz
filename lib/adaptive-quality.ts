// Adaptive Quality Manager
// Dynamically adjusts video quality based on network conditions and GPU load

export interface QualityMetrics {
  latency: number // ms
  fps: number
  gpuLoad: number // 0-100
  networkBandwidth: number // kbps
  packetLoss: number // 0-1
}

export interface QualitySettings {
  resolution: '480p' | '720p' | '1080p'
  fps: number
  bitrate: number // kbps
  keyFrameInterval: number // frames
}

export interface AdaptiveConfig {
  minResolution: '480p' | '720p' | '1080p'
  maxResolution: '480p' | '720p' | '1080p'
  minFps: number
  maxFps: number
  targetLatency: number // ms
  maxLatency: number // ms
}

const DEFAULT_CONFIG: AdaptiveConfig = {
  minResolution: '480p',
  maxResolution: '1080p',
  minFps: 15,
  maxFps: 30,
  targetLatency: 100,
  maxLatency: 200,
}

const QUALITY_PRESETS: Record<string, QualitySettings> = {
  '1080p-high': { resolution: '1080p', fps: 30, bitrate: 4000, keyFrameInterval: 60 },
  '1080p-medium': { resolution: '1080p', fps: 24, bitrate: 3000, keyFrameInterval: 48 },
  '720p-high': { resolution: '720p', fps: 30, bitrate: 2500, keyFrameInterval: 60 },
  '720p-medium': { resolution: '720p', fps: 24, bitrate: 2000, keyFrameInterval: 48 },
  '480p-high': { resolution: '480p', fps: 30, bitrate: 1500, keyFrameInterval: 60 },
  '480p-medium': { resolution: '480p', fps: 24, bitrate: 1000, keyFrameInterval: 48 },
  '480p-low': { resolution: '480p', fps: 15, bitrate: 500, keyFrameInterval: 30 },
}

class AdaptiveQualityManager {
  private config: AdaptiveConfig
  private metricsHistory: QualityMetrics[] = []
  private readonly maxHistorySize = 30 // 30 samples
  private currentQuality: QualitySettings

  constructor(config?: Partial<AdaptiveConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.currentQuality = QUALITY_PRESETS['720p-medium']
  }

  addMetrics(metrics: QualityMetrics): void {
    this.metricsHistory.push(metrics)
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory.shift()
    }
  }

  calculateOptimalQuality(): QualitySettings {
    if (this.metricsHistory.length < 5) {
      // Not enough data, return current quality
      return this.currentQuality
    }

    const avgMetrics = this.calculateAverageMetrics()
    const newQuality = this.selectQualityPreset(avgMetrics)

    // Smooth transitions - don't change too rapidly
    if (this.shouldChangeQuality(newQuality)) {
      this.currentQuality = newQuality
    }

    return this.currentQuality
  }

  private calculateAverageMetrics(): QualityMetrics {
    const sum = this.metricsHistory.reduce(
      (acc, m) => ({
        latency: acc.latency + m.latency,
        fps: acc.fps + m.fps,
        gpuLoad: acc.gpuLoad + m.gpuLoad,
        networkBandwidth: acc.networkBandwidth + m.networkBandwidth,
        packetLoss: acc.packetLoss + m.packetLoss,
      }),
      { latency: 0, fps: 0, gpuLoad: 0, networkBandwidth: 0, packetLoss: 0 }
    )

    const count = this.metricsHistory.length
    return {
      latency: sum.latency / count,
      fps: sum.fps / count,
      gpuLoad: sum.gpuLoad / count,
      networkBandwidth: sum.networkBandwidth / count,
      packetLoss: sum.packetLoss / count,
    }
  }

  private selectQualityPreset(metrics: QualityMetrics): QualitySettings {
    // High latency -> lower quality
    if (metrics.latency > this.config.maxLatency || metrics.packetLoss > 0.1) {
      return QUALITY_PRESETS['480p-low']
    }

    if (metrics.latency > 150 || metrics.gpuLoad > 90) {
      return QUALITY_PRESETS['480p-medium']
    }

    if (metrics.latency > 120 || metrics.gpuLoad > 80) {
      return QUALITY_PRESETS['720p-medium']
    }

    if (metrics.latency > this.config.targetLatency || metrics.gpuLoad > 70) {
      return QUALITY_PRESETS['720p-high']
    }

    // Good conditions
    if (metrics.networkBandwidth > 4000 && metrics.latency < 80) {
      return QUALITY_PRESETS['1080p-high']
    }

    if (metrics.networkBandwidth > 3000) {
      return QUALITY_PRESETS['1080p-medium']
    }

    return QUALITY_PRESETS['720p-high']
  }

  private shouldChangeQuality(newQuality: QualitySettings): boolean {
    // Only change if there's a significant difference
    const currentScore = this.getQualityScore(this.currentQuality)
    const newScore = this.getQualityScore(newQuality)

    // Allow downgrade immediately, but require stable improvement for upgrade
    if (newScore < currentScore) {
      return true // Downgrade immediately
    }

    if (newScore > currentScore) {
      // Check if recent metrics are consistently good
      const recentMetrics = this.metricsHistory.slice(-10)
      const avgLatency = recentMetrics.reduce((a, m) => a + m.latency, 0) / recentMetrics.length
      return avgLatency < this.config.targetLatency
    }

    return false
  }

  private getQualityScore(quality: QualitySettings): number {
    const resolutionScore = { '480p': 1, '720p': 2, '1080p': 3 }[quality.resolution]
    const fpsScore = quality.fps / 30
    return resolutionScore * fpsScore * (quality.bitrate / 1000)
  }

  getCurrentQuality(): QualitySettings {
    return this.currentQuality
  }

  setConfig(config: Partial<AdaptiveConfig>): void {
    this.config = { ...this.config, ...config }
  }

  reset(): void {
    this.metricsHistory = []
    this.currentQuality = QUALITY_PRESETS['720p-medium']
  }

  getMetricsHistory(): QualityMetrics[] {
    return [...this.metricsHistory]
  }

  getAverageLatency(): number {
    if (this.metricsHistory.length === 0) return 0
    return this.metricsHistory.reduce((a, m) => a + m.latency, 0) / this.metricsHistory.length
  }
}

// Factory function
export function createAdaptiveQualityManager(config?: Partial<AdaptiveConfig>): AdaptiveQualityManager {
  return new AdaptiveQualityManager(config)
}

export { QUALITY_PRESETS }
