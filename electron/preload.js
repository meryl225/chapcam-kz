const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Camera access
  getCameraAccess: () => ipcRenderer.invoke('get-camera-access'),
  requestCameraAccess: () => ipcRenderer.invoke('request-camera-access'),
  
  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  
  // Virtual camera
  onVirtualCameraToggle: (callback) => {
    ipcRenderer.on('virtual-camera-toggle', (event, enabled) => callback(enabled))
  },
  
  // Navigation events
  onOpenPreferences: (callback) => {
    ipcRenderer.on('open-preferences', () => callback())
  },
  onOpenCameraSettings: (callback) => {
    ipcRenderer.on('open-camera-settings', () => callback())
  },
  
  // Window controls
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  maximizeWindow: () => ipcRenderer.send('maximize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),
  
  // Platform detection
  isElectron: true,
  platform: process.platform
})

// Log when preload is ready
console.log('[ChapCam] Preload script initialized')
