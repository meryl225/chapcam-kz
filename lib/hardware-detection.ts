"use client"

// Detecteur de capacites hardware pour choisir entre traitement local ou cloud
export interface HardwareCapabilities {
  hasGPU: boolean
  gpuTier: 'high' | 'medium' | 'low' | 'none'
  gpuName: string | null
  vramEstimate: number // en GB
  cpuCores: number
  memoryGB: number
  isGamingPC: boolean
  recommendedMode: 'local' | 'cloud' | 'hybrid'
  maxLocalResolution: '1080p' | '720p' | '480p' | 'none'
  maxLocalFPS: number
}

// Liste des GPUs gaming connus avec leur tier
const GPU_TIERS: Record<string, { tier: 'high' | 'medium' | 'low', vram: number }> = {
  // NVIDIA RTX 40 Series
  'rtx 4090': { tier: 'high', vram: 24 },
  'rtx 4080': { tier: 'high', vram: 16 },
  'rtx 4070 ti': { tier: 'high', vram: 12 },
  'rtx 4070': { tier: 'high', vram: 12 },
  'rtx 4060 ti': { tier: 'medium', vram: 8 },
  'rtx 4060': { tier: 'medium', vram: 8 },
  // NVIDIA RTX 30 Series
  'rtx 3090': { tier: 'high', vram: 24 },
  'rtx 3080 ti': { tier: 'high', vram: 12 },
  'rtx 3080': { tier: 'high', vram: 10 },
  'rtx 3070 ti': { tier: 'high', vram: 8 },
  'rtx 3070': { tier: 'high', vram: 8 },
  'rtx 3060 ti': { tier: 'medium', vram: 8 },
  'rtx 3060': { tier: 'medium', vram: 12 },
  'rtx 3050': { tier: 'low', vram: 8 },
  // NVIDIA RTX 20 Series
  'rtx 2080 ti': { tier: 'high', vram: 11 },
  'rtx 2080 super': { tier: 'high', vram: 8 },
  'rtx 2080': { tier: 'medium', vram: 8 },
  'rtx 2070 super': { tier: 'medium', vram: 8 },
  'rtx 2070': { tier: 'medium', vram: 8 },
  'rtx 2060 super': { tier: 'medium', vram: 8 },
  'rtx 2060': { tier: 'medium', vram: 6 },
  // NVIDIA GTX Series
  'gtx 1080 ti': { tier: 'medium', vram: 11 },
  'gtx 1080': { tier: 'medium', vram: 8 },
  'gtx 1070 ti': { tier: 'low', vram: 8 },
  'gtx 1070': { tier: 'low', vram: 8 },
  'gtx 1660 ti': { tier: 'low', vram: 6 },
  'gtx 1660 super': { tier: 'low', vram: 6 },
  'gtx 1660': { tier: 'low', vram: 6 },
  'gtx 1650': { tier: 'low', vram: 4 },
  // AMD RX 7000 Series
  'rx 7900 xtx': { tier: 'high', vram: 24 },
  'rx 7900 xt': { tier: 'high', vram: 20 },
  'rx 7800 xt': { tier: 'high', vram: 16 },
  'rx 7700 xt': { tier: 'medium', vram: 12 },
  'rx 7600': { tier: 'medium', vram: 8 },
  // AMD RX 6000 Series
  'rx 6950 xt': { tier: 'high', vram: 16 },
  'rx 6900 xt': { tier: 'high', vram: 16 },
  'rx 6800 xt': { tier: 'high', vram: 16 },
  'rx 6800': { tier: 'high', vram: 16 },
  'rx 6700 xt': { tier: 'medium', vram: 12 },
  'rx 6600 xt': { tier: 'medium', vram: 8 },
  'rx 6600': { tier: 'low', vram: 8 },
  // Intel Arc
  'arc a770': { tier: 'medium', vram: 16 },
  'arc a750': { tier: 'medium', vram: 8 },
  'arc a580': { tier: 'low', vram: 8 },
}

export async function detectHardwareCapabilities(): Promise<HardwareCapabilities> {
  const capabilities: HardwareCapabilities = {
    hasGPU: false,
    gpuTier: 'none',
    gpuName: null,
    vramEstimate: 0,
    cpuCores: navigator.hardwareConcurrency || 4,
    memoryGB: 8, // Default estimate
    isGamingPC: false,
    recommendedMode: 'cloud',
    maxLocalResolution: 'none',
    maxLocalFPS: 0,
  }

  // Detecter la memoire si disponible
  if ('deviceMemory' in navigator) {
    capabilities.memoryGB = (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 8
  }

  // Detecter le GPU via WebGL
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
    
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
      if (debugInfo) {
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
        capabilities.gpuName = renderer
        capabilities.hasGPU = true

        // Identifier le tier du GPU
        const gpuNameLower = renderer.toLowerCase()
        
        for (const [gpuKey, gpuInfo] of Object.entries(GPU_TIERS)) {
          if (gpuNameLower.includes(gpuKey)) {
            capabilities.gpuTier = gpuInfo.tier
            capabilities.vramEstimate = gpuInfo.vram
            capabilities.isGamingPC = gpuInfo.tier === 'high' || gpuInfo.tier === 'medium'
            break
          }
        }

        // Si pas trouve dans la liste mais contient des mots cles gaming
        if (capabilities.gpuTier === 'none') {
          if (gpuNameLower.includes('rtx') || gpuNameLower.includes('radeon rx') || gpuNameLower.includes('arc a')) {
            capabilities.gpuTier = 'low'
            capabilities.hasGPU = true
            capabilities.vramEstimate = 4
          } else if (gpuNameLower.includes('intel') || gpuNameLower.includes('integrated')) {
            capabilities.gpuTier = 'none'
            capabilities.hasGPU = false
          }
        }
      }
    }
  } catch (error) {
    console.error('[v0] Error detecting GPU:', error)
  }

  // Determiner les capacites locales basees sur le tier
  switch (capabilities.gpuTier) {
    case 'high':
      capabilities.maxLocalResolution = '1080p'
      capabilities.maxLocalFPS = 30
      capabilities.recommendedMode = 'local'
      break
    case 'medium':
      capabilities.maxLocalResolution = '720p'
      capabilities.maxLocalFPS = 25
      capabilities.recommendedMode = 'hybrid'
      break
    case 'low':
      capabilities.maxLocalResolution = '480p'
      capabilities.maxLocalFPS = 15
      capabilities.recommendedMode = 'cloud'
      break
    default:
      capabilities.maxLocalResolution = 'none'
      capabilities.maxLocalFPS = 0
      capabilities.recommendedMode = 'cloud'
  }

  // Bonus si beaucoup de RAM et CPU
  if (capabilities.memoryGB >= 16 && capabilities.cpuCores >= 8) {
    if (capabilities.recommendedMode === 'cloud' && capabilities.gpuTier !== 'none') {
      capabilities.recommendedMode = 'hybrid'
    }
  }

  return capabilities
}

// Tester les performances reelles du GPU avec un benchmark rapide
export async function benchmarkGPU(): Promise<{
  score: number
  canHandleLocalProcessing: boolean
  recommendedFPS: number
}> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const gl = canvas.getContext('webgl2')
    
    if (!gl) {
      resolve({ score: 0, canHandleLocalProcessing: false, recommendedFPS: 0 })
      return
    }

    // Simple benchmark: mesurer combien de frames on peut rendre en 1 seconde
    let frameCount = 0
    const startTime = performance.now()
    const duration = 1000 // 1 seconde

    const render = () => {
      // Simuler un travail GPU
      gl.clearColor(Math.random(), Math.random(), Math.random(), 1)
      gl.clear(gl.COLOR_BUFFER_BIT)
      
      // Creer une texture et la manipuler
      const texture = gl.createTexture()
      gl.bindTexture(gl.TEXTURE_2D, texture)
      const pixels = new Uint8Array(512 * 512 * 4)
      for (let i = 0; i < pixels.length; i++) {
        pixels[i] = Math.floor(Math.random() * 256)
      }
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 512, 512, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
      gl.deleteTexture(texture)
      
      frameCount++
      
      if (performance.now() - startTime < duration) {
        requestAnimationFrame(render)
      } else {
        // Score base sur le nombre de frames
        const score = frameCount
        const canHandle = score >= 30 // Au moins 30 fps pour le traitement local
        const recommendedFPS = Math.min(30, Math.floor(score * 0.5))
        
        resolve({
          score,
          canHandleLocalProcessing: canHandle,
          recommendedFPS: recommendedFPS
        })
      }
    }
    
    requestAnimationFrame(render)
  })
}

// Stocker les preferences utilisateur
export interface UserProcessingPreferences {
  mode: 'auto' | 'local' | 'cloud'
  maxLocalFPS: number
  preferQuality: boolean // true = qualite, false = performance
  forceCloud: boolean
}

const PREFERENCES_KEY = 'chapcam_processing_preferences'

export function saveProcessingPreferences(prefs: UserProcessingPreferences) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs))
  } catch {
    // Ignore (mode prive, quota, etc.)
  }
}

export function loadProcessingPreferences(): UserProcessingPreferences {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(PREFERENCES_KEY)
      if (saved) {
        return JSON.parse(saved)
      }
    } catch {
      // Ignore
    }
  }
  return {
    mode: 'auto',
    maxLocalFPS: 25,
    preferQuality: true,
    forceCloud: false
  }
}

// Determiner le mode optimal base sur les capacites et preferences
export function determineProcessingMode(
  capabilities: HardwareCapabilities,
  preferences: UserProcessingPreferences,
  networkQuality: 'good' | 'medium' | 'poor'
): {
  mode: 'local' | 'cloud'
  resolution: '1080p' | '720p' | '480p'
  fps: number
  reason: string
} {
  // Si l'utilisateur force le cloud
  if (preferences.forceCloud) {
    return {
      mode: 'cloud',
      resolution: '1080p',
      fps: 30,
      reason: 'Mode cloud force par l\'utilisateur'
    }
  }

  // Si l'utilisateur veut local et a un bon GPU
  if (preferences.mode === 'local' && capabilities.isGamingPC) {
    return {
      mode: 'local',
      resolution: capabilities.maxLocalResolution as '1080p' | '720p' | '480p',
      fps: Math.min(preferences.maxLocalFPS, capabilities.maxLocalFPS),
      reason: `Traitement local sur ${capabilities.gpuName}`
    }
  }

  // Mode auto - choisir intelligemment
  if (preferences.mode === 'auto') {
    // PC gamer avec bon GPU et bonne connexion = local
    if (capabilities.gpuTier === 'high') {
      return {
        mode: 'local',
        resolution: '1080p',
        fps: 30,
        reason: `GPU gaming detecte: ${capabilities.gpuName}`
      }
    }

    // GPU moyen - hybride selon la qualite reseau
    if (capabilities.gpuTier === 'medium') {
      if (networkQuality === 'poor') {
        return {
          mode: 'local',
          resolution: '720p',
          fps: 20,
          reason: 'Connexion faible - traitement local prefere'
        }
      }
      return {
        mode: 'cloud',
        resolution: '1080p',
        fps: 30,
        reason: 'Bonne connexion - cloud pour meilleure qualite'
      }
    }

    // GPU faible ou inexistant = cloud
    return {
      mode: 'cloud',
      resolution: networkQuality === 'good' ? '1080p' : '720p',
      fps: networkQuality === 'good' ? 30 : 20,
      reason: 'GPU insuffisant - traitement cloud'
    }
  }

  // Par defaut cloud
  return {
    mode: 'cloud',
    resolution: '720p',
    fps: 25,
    reason: 'Mode cloud par defaut'
  }
}
