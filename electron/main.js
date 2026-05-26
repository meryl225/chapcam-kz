const { app, BrowserWindow, ipcMain, systemPreferences, Menu, Tray, nativeImage } = require('electron')
const path = require('path')
const { spawn } = require('child_process')

let mainWindow
let tray
let nextServer

const isDev = process.env.NODE_ENV === 'development'
const PORT = 3000

// Create the main application window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    title: 'ChapCam - Face Swap en Temps Reel',
    icon: path.join(__dirname, '../public/icons/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true
    },
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 15, y: 15 },
    backgroundColor: '#0a0e1a',
    show: false
  })

  // Load the app
  const startUrl = isDev 
    ? `http://localhost:${PORT}` 
    : `file://${path.join(__dirname, '../out/index.html')}`
  
  mainWindow.loadURL(startUrl)

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    
    // Request camera permissions on macOS
    if (process.platform === 'darwin') {
      requestCameraAccess()
    }
  })

  // Handle window close
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault()
      mainWindow.hide()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Create application menu
  createMenu()
}

// Request camera access on macOS
async function requestCameraAccess() {
  if (process.platform === 'darwin') {
    const cameraStatus = systemPreferences.getMediaAccessStatus('camera')
    
    if (cameraStatus !== 'granted') {
      const granted = await systemPreferences.askForMediaAccess('camera')
      console.log('[ChapCam] Camera access:', granted ? 'granted' : 'denied')
    }
    
    const micStatus = systemPreferences.getMediaAccessStatus('microphone')
    if (micStatus !== 'granted') {
      await systemPreferences.askForMediaAccess('microphone')
    }
  }
}

// Create system tray
function createTray() {
  const iconPath = path.join(__dirname, '../public/icons/tray-icon.png')
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
  
  tray = new Tray(icon)
  
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Ouvrir ChapCam', 
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        }
      }
    },
    { type: 'separator' },
    { 
      label: 'Camera Virtuelle', 
      type: 'checkbox',
      checked: false,
      click: (menuItem) => {
        toggleVirtualCamera(menuItem.checked)
      }
    },
    { type: 'separator' },
    { 
      label: 'Quitter', 
      click: () => {
        app.isQuitting = true
        app.quit()
      }
    }
  ])
  
  tray.setToolTip('ChapCam - Face Swap')
  tray.setContextMenu(contextMenu)
  
  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show()
    }
  })
}

// Create application menu
function createMenu() {
  const template = [
    {
      label: 'ChapCam',
      submenu: [
        { label: 'A propos de ChapCam', role: 'about' },
        { type: 'separator' },
        { label: 'Preferences...', accelerator: 'CmdOrCtrl+,', click: () => openPreferences() },
        { type: 'separator' },
        { label: 'Masquer ChapCam', role: 'hide' },
        { label: 'Masquer les autres', role: 'hideOthers' },
        { label: 'Tout afficher', role: 'unhide' },
        { type: 'separator' },
        { label: 'Quitter', accelerator: 'CmdOrCtrl+Q', click: () => { app.isQuitting = true; app.quit() } }
      ]
    },
    {
      label: 'Edition',
      submenu: [
        { label: 'Annuler', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'Retablir', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: 'Couper', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'Copier', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'Coller', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: 'Tout selectionner', accelerator: 'CmdOrCtrl+A', role: 'selectAll' }
      ]
    },
    {
      label: 'Affichage',
      submenu: [
        { label: 'Recharger', accelerator: 'CmdOrCtrl+R', click: () => mainWindow?.reload() },
        { type: 'separator' },
        { label: 'Plein ecran', accelerator: 'F11', role: 'togglefullscreen' },
        { type: 'separator' },
        { label: 'Zoom avant', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: 'Zoom arriere', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { label: 'Taille reelle', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' }
      ]
    },
    {
      label: 'Camera',
      submenu: [
        { 
          label: 'Activer Camera Virtuelle', 
          accelerator: 'CmdOrCtrl+Shift+V',
          type: 'checkbox',
          checked: false,
          click: (menuItem) => toggleVirtualCamera(menuItem.checked)
        },
        { type: 'separator' },
        { label: 'Parametres Camera...', click: () => openCameraSettings() }
      ]
    },
    {
      label: 'Fenetre',
      submenu: [
        { label: 'Minimiser', accelerator: 'CmdOrCtrl+M', role: 'minimize' },
        { label: 'Fermer', accelerator: 'CmdOrCtrl+W', role: 'close' }
      ]
    },
    {
      label: 'Aide',
      submenu: [
        { label: 'Documentation', click: () => require('electron').shell.openExternal('https://chapcam.com/docs') },
        { label: 'Support', click: () => require('electron').shell.openExternal('https://chapcam.com/support') },
        { type: 'separator' },
        { label: 'Signaler un probleme...', click: () => require('electron').shell.openExternal('https://chapcam.com/feedback') }
      ]
    }
  ]
  
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// Toggle virtual camera
function toggleVirtualCamera(enabled) {
  if (mainWindow) {
    mainWindow.webContents.send('virtual-camera-toggle', enabled)
  }
  console.log('[ChapCam] Virtual camera:', enabled ? 'enabled' : 'disabled')
}

// Open preferences
function openPreferences() {
  if (mainWindow) {
    mainWindow.webContents.send('open-preferences')
  }
}

// Open camera settings
function openCameraSettings() {
  if (mainWindow) {
    mainWindow.webContents.send('open-camera-settings')
  }
}

// IPC Handlers
ipcMain.handle('get-camera-access', async () => {
  if (process.platform === 'darwin') {
    return systemPreferences.getMediaAccessStatus('camera')
  }
  return 'granted'
})

ipcMain.handle('request-camera-access', async () => {
  await requestCameraAccess()
  return systemPreferences.getMediaAccessStatus('camera')
})

ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

ipcMain.handle('get-platform', () => {
  return process.platform
})

// Start Next.js dev server in development
function startNextServer() {
  if (isDev) {
    console.log('[ChapCam] Starting Next.js dev server...')
    nextServer = spawn('npm', ['run', 'dev'], {
      cwd: path.join(__dirname, '..'),
      shell: true,
      stdio: 'pipe'
    })
    
    nextServer.stdout.on('data', (data) => {
      console.log(`[Next.js] ${data}`)
    })
    
    nextServer.stderr.on('data', (data) => {
      console.error(`[Next.js Error] ${data}`)
    })
  }
}

// App lifecycle
app.whenReady().then(() => {
  // Start dev server if in development
  if (isDev) {
    startNextServer()
    // Wait for Next.js to start
    setTimeout(createWindow, 5000)
  } else {
    createWindow()
  }
  
  createTray()
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    } else if (mainWindow) {
      mainWindow.show()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  app.isQuitting = true
  
  // Kill Next.js server in development
  if (nextServer) {
    nextServer.kill()
  }
})

// Handle certificate errors for development
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (isDev) {
    event.preventDefault()
    callback(true)
  } else {
    callback(false)
  }
})
