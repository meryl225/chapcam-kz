const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('cameraSetup', {
  state: () => ipcRenderer.invoke('virtual-camera-mac-state'),
  activate: () => ipcRenderer.invoke('virtual-camera-mac-activate'),
  openSettings: () => ipcRenderer.invoke('camera-setup-open-settings'),
  openLog: () => ipcRenderer.invoke('camera-setup-open-log'),
  close: () => ipcRenderer.invoke('camera-setup-close'),
})
