const { app, BrowserWindow, ipcMain, systemPreferences, Menu, Tray, nativeImage, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')
const { getVirtualCamera, setupVirtualCameraIPC } = require('./virtual-camera')
const { getVoiceSwap, setupVoiceSwapIPC } = require('./voice-swap')

// Resolution/cadence de sortie de la camera virtuelle
const VCAM = { width: 1280, height: 720, fps: 30 }

// Set app user model ID for Windows (must be called early)
if (process.platform === 'win32') {
  app.setAppUserModelId('com.chapcam.desktop')
}

let mainWindow
let splashWindow
let tray
let nextServer

const isDev = process.env.NODE_ENV === 'development'
const PORT = 3000

// Debug logging
function log(message) {
  console.log(`[ChapCam] ${message}`)
}

// Create splash screen
function createSplashScreen() {
  splashWindow = new BrowserWindow({
    width: 500,
    height: 350,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  const splashHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #0a0e1a 0%, #1a1f35 100%);
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          overflow: hidden;
          border-radius: 20px;
          border: 1px solid rgba(0, 255, 136, 0.3);
        }
        .container {
          text-align: center;
          position: relative;
        }
        .logo {
          font-size: 64px;
          font-weight: 900;
          background: linear-gradient(135deg, #00ff88 0%, #00d4ff 50%, #e91e8c 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 10px;
          animation: glow 2s ease-in-out infinite alternate;
        }
        .subtitle {
          color: rgba(255, 255, 255, 0.6);
          font-size: 14px;
          letter-spacing: 3px;
          text-transform: uppercase;
          margin-bottom: 40px;
        }
        .loader {
          width: 200px;
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          overflow: hidden;
          margin: 0 auto;
        }
        .loader-bar {
          height: 100%;
          width: 0%;
          background: linear-gradient(90deg, #00ff88, #00d4ff, #e91e8c);
          border-radius: 4px;
          animation: loading 2s ease-in-out forwards;
        }
        .status {
          color: rgba(255, 255, 255, 0.5);
          font-size: 12px;
          margin-top: 20px;
        }
        .glow-circle {
          position: absolute;
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(0, 255, 136, 0.15) 0%, transparent 70%);
          border-radius: 50%;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: -1;
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes glow {
          from { filter: drop-shadow(0 0 20px rgba(0, 255, 136, 0.5)); }
          to { filter: drop-shadow(0 0 40px rgba(0, 212, 255, 0.8)); }
        }
        @keyframes loading {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 100%; }
        }
        @keyframes pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
          50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.8; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="glow-circle"></div>
        <div class="logo">ChapCam</div>
        <div class="subtitle">Face Swap en Temps Reel</div>
        <div class="loader"><div class="loader-bar"></div></div>
        <div class="status">Chargement...</div>
      </div>
    </body>
    </html>
  `

  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHTML)}`)
  log('Splash screen created')
}

// Create the main application window
function createWindow() {
  // Get icon path
  const iconPath = getIconPath()
  log(`Using icon: ${iconPath}`)

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    title: 'ChapCam - Face Swap en Temps Reel',
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: !isDev,
      devTools: true
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#0a0e1a',
    show: false
  })

  // Load the app
  loadApp()

  // Voice Swap : relier la fenetre au service pour les push d'etat (latence,
  // sante connexion, buffering) vers l'UI web.
  try {
    getVoiceSwap().attachWindow(mainWindow)
  } catch (e) {
    log(`Voice Swap attach error: ${e.message}`)
  }

  // Show DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools()
  }

  // Handle window events
  mainWindow.webContents.on('did-finish-load', () => {
    log('Content loaded successfully')
    showMainWindow()
  })

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    log(`Failed to load: ${errorDescription} (${errorCode}) - URL: ${validatedURL}`)
    loadFallbackPage()
  })

  mainWindow.webContents.on('crashed', () => {
    log('Renderer process crashed')
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

// Get the correct icon path based on platform
function getIconPath() {
  // For Windows, try .ico first, then fall back to .jpg
  // For other platforms, use .jpg
  const iconNames = process.platform === 'win32' 
    ? ['icon.ico', 'icon-512.jpg', 'icon.jpg'] 
    : ['icon.jpg', 'icon-512.jpg']
  
  // Try multiple paths with multiple icon names
  const basePaths = [
    path.join(__dirname, '../public/icons'),
    path.join(process.resourcesPath || '', 'public/icons'),
    path.join(app.getAppPath(), 'public/icons'),
    path.join(__dirname, '..', 'public', 'icons')
  ]

  for (const basePath of basePaths) {
    for (const iconName of iconNames) {
      const fullPath = path.join(basePath, iconName)
      if (fs.existsSync(fullPath)) {
        log(`Found icon at: ${fullPath}`)
        return fullPath
      }
    }
  }

  // Ultimate fallback
  const fallback = path.join(__dirname, '../public/icons/icon.jpg')
  log(`Using fallback icon: ${fallback}`)
  return fallback
}

// Load the application
function loadApp() {
  if (isDev) {
    // Development: connect to local Next.js dev server
    const devUrl = `http://localhost:${PORT}`
    log(`Loading dev URL: ${devUrl}`)
    mainWindow.loadURL(devUrl)
  } else {
    // Production: load the web app directly (like Slack, Discord do)
    log('Loading ChapCam web app...')
    mainWindow.loadURL('https://chapcam.com/dashboard')
  }
}

// Load fallback page when main content fails
function loadFallbackPage() {
  const fallbackHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>ChapCam - Erreur de chargement</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #0a0e1a 0%, #1a1f35 100%);
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          color: white;
        }
        .container { text-align: center; padding: 40px; }
        .logo {
          font-size: 48px;
          font-weight: 900;
          background: linear-gradient(135deg, #00ff88 0%, #00d4ff 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 20px;
        }
        h1 { font-size: 24px; margin-bottom: 10px; color: #fff; }
        p { color: rgba(255,255,255,0.6); margin-bottom: 30px; }
        .btn {
          display: inline-block;
          padding: 12px 30px;
          background: linear-gradient(135deg, #00ff88, #00d4ff);
          color: #000;
          text-decoration: none;
          border-radius: 30px;
          font-weight: 600;
          margin: 5px;
          cursor: pointer;
          border: none;
          font-size: 14px;
        }
        .btn:hover { transform: scale(1.05); }
        .btn-secondary {
          background: transparent;
          border: 1px solid rgba(255,255,255,0.3);
          color: white;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">ChapCam</div>
        <h1>Impossible de charger l'application</h1>
        <p>Verifiez votre connexion internet ou reessayez.</p>
        <button class="btn" onclick="location.reload()">Reessayer</button>
        <button class="btn btn-secondary" onclick="window.location.href='https://chapcam.com'">Ouvrir le site web</button>
      </div>
    </body>
    </html>
  `

  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(fallbackHTML)}`)
  showMainWindow()
}

// Show main window and close splash
function showMainWindow() {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close()
    splashWindow = null
  }
  
  if (mainWindow) {
    mainWindow.show()
    mainWindow.focus()
    
    // Request camera permissions on macOS
    if (process.platform === 'darwin') {
      requestCameraAccess()
    }
  }
}

// Request camera access on macOS
async function requestCameraAccess() {
  if (process.platform === 'darwin') {
    try {
      const cameraStatus = systemPreferences.getMediaAccessStatus('camera')
      
      if (cameraStatus !== 'granted') {
        const granted = await systemPreferences.askForMediaAccess('camera')
        log(`Camera access: ${granted ? 'granted' : 'denied'}`)
      }
      
      const micStatus = systemPreferences.getMediaAccessStatus('microphone')
      if (micStatus !== 'granted') {
        await systemPreferences.askForMediaAccess('microphone')
      }
    } catch (error) {
      log(`Error requesting camera access: ${error.message}`)
    }
  }
}

// Create system tray
function createTray() {
  const iconPath = path.join(__dirname, '../public/icons/tray-icon.jpg')
  
  let icon
  try {
    icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
  } catch (e) {
    log(`Tray icon error: ${e.message}`)
    return
  }
  
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
  
  tray.setToolTip('ChapCam - Face Swap en Temps Reel')
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
        { label: 'Forcer le rechargement', accelerator: 'CmdOrCtrl+Shift+R', click: () => mainWindow?.webContents.reloadIgnoringCache() },
        { type: 'separator' },
        { label: 'Outils de developpement', accelerator: 'F12', click: () => mainWindow?.webContents.toggleDevTools() },
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
        { label: 'Documentation', click: () => shell.openExternal('https://chapcam.com/docs') },
        { label: 'Support', click: () => shell.openExternal('https://t.me/chapcam1') },
        { type: 'separator' },
        { label: 'Signaler un probleme...', click: () => shell.openExternal('https://t.me/chapcam1') }
      ]
    }
  ]
  
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// Toggle virtual camera : (de)marre le pilote ET la capture du renderer.
async function toggleVirtualCamera(enabled) {
  const vc = getVirtualCamera()
  try {
    if (enabled) {
      const status = await vc.start(VCAM)
      // Demarrer la capture du canvas transforme cote page web
      if (mainWindow) mainWindow.webContents.send('vcam:start', VCAM)
      pushVcamState(status)
    } else {
      if (mainWindow) mainWindow.webContents.send('vcam:stop')
      const status = vc.stop()
      pushVcamState(status)
    }
  } catch (e) {
    log(`Virtual camera error: ${e.message}`)
    pushVcamState(vc.getStatus())
    if (mainWindow) {
      mainWindow.webContents.send('virtual-camera-toggle', false)
    }
  }
  // Compat : notifier aussi l'ancien canal d'evenement
  if (mainWindow) mainWindow.webContents.send('virtual-camera-toggle', enabled)
  log(`Virtual camera: ${enabled ? 'enabled' : 'disabled'}`)
}

// Pousse l'etat de la camera virtuelle vers l'UI web
function pushVcamState(state) {
  if (mainWindow) mainWindow.webContents.send('virtual-camera-state', state)
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
    log('Starting Next.js dev server...')
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
  log('App ready')

  // Enregistrer les handlers IPC de la camera virtuelle
  setupVirtualCameraIPC()

  // Enregistrer les handlers IPC de Voice Swap (architecture/scaffolding)
  setupVoiceSwapIPC()

  // Show splash screen first
  createSplashScreen()
  
  // Start dev server if in development
  if (isDev) {
    startNextServer()
    setTimeout(createWindow, 5000)
  } else {
    // Small delay to show splash
    setTimeout(createWindow, 1500)
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

  // Couper proprement la camera virtuelle
  try {
    getVirtualCamera().stop()
  } catch (_) {}

  // Couper proprement la session Voice Swap
  try {
    getVoiceSwap().stop()
  } catch (_) {}

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

// Set app user model ID for Windows
if (process.platform === 'win32') {
  app.setAppUserModelId('com.chapcam.desktop')
  
  // Also set the icon explicitly for the taskbar
  const iconPath = path.join(__dirname, '../public/icons/icon-512.jpg')
  if (fs.existsSync(iconPath)) {
    app.setAsDefaultProtocolClient('chapcam')
  }
}

log('Main process initialized')
