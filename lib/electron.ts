// Electron API types for ChapCam Desktop
export interface ElectronAPI {
  // Camera access
  getCameraAccess: () => Promise<'granted' | 'denied' | 'restricted' | 'unknown'>
  requestCameraAccess: () => Promise<'granted' | 'denied' | 'restricted' | 'unknown'>
  
  // App info
  getAppVersion: () => Promise<string>
  getPlatform: () => Promise<NodeJS.Platform>
  
  // Virtual camera
  onVirtualCameraToggle: (callback: (enabled: boolean) => void) => void
  
  // Navigation events
  onOpenPreferences: (callback: () => void) => void
  onOpenCameraSettings: (callback: () => void) => void
  
  // Window controls
  minimizeWindow: () => void
  maximizeWindow: () => void
  closeWindow: () => void
  
  // Platform detection
  isElectron: boolean
  platform: NodeJS.Platform
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

/**
 * Check if running in Electron environment
 */
export function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI?.isElectron
}

/**
 * Get the Electron API safely
 */
export function getElectronAPI(): ElectronAPI | null {
  if (isElectron()) {
    return window.electronAPI!
  }
  return null
}

/**
 * Request camera access (works in both web and Electron)
 */
export async function requestCameraAccess(): Promise<boolean> {
  const api = getElectronAPI()
  
  if (api) {
    // Electron environment
    const status = await api.requestCameraAccess()
    return status === 'granted'
  } else {
    // Web environment
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      stream.getTracks().forEach(track => track.stop())
      return true
    } catch {
      return false
    }
  }
}

/**
 * Get current platform
 */
export function getPlatform(): 'mac' | 'windows' | 'linux' | 'web' {
  const api = getElectronAPI()
  
  if (api) {
    switch (api.platform) {
      case 'darwin': return 'mac'
      case 'win32': return 'windows'
      case 'linux': return 'linux'
      default: return 'web'
    }
  }
  
  return 'web'
}

/**
 * Get app version
 */
export async function getAppVersion(): Promise<string> {
  const api = getElectronAPI()
  
  if (api) {
    return api.getAppVersion()
  }
  
  return '1.0.0'
}
