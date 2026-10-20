/**
 * Camera virtuelle ChapCam Desktop - "ChapCam Camera"
 * ---------------------------------------------------
 * Pilotes natifs, sans OBS :
 *   - Windows 11 : source Media Foundation (MFCreateVirtualCamera)
 *       resources/vcam/win/ChapCamVCamSource.dll + chapcam-vcam.exe
 *   - macOS 12.3+ : extension Core Media IO (Camera Extension)
 *       ChapCam.app/Contents/Library/SystemExtensions/... + chapcam-vcam-mac
 *   - Linux (dev) : v4l2loopback via ffmpeg
 *
 * Flux : preload (capture du canvas transforme, RGBA) --IPC--> main
 *        --stdin BGRA--> helper natif --> "ChapCam Camera" --> Zoom/Teams/Meet/OBS
 */

const { ipcMain, app, BrowserWindow, systemPreferences } = require('electron')
const path = require('path')
const fs = require('fs')
const { spawn, execFile } = require('child_process')

const DEVICE_DESCRIPTION = 'ChapCam Camera'
const DEVICE_ID = 'ChapCamCamera'
const MAC_EXTENSION_ID = 'com.chapcam.desktop.camera-extension'
const DEFAULT = { width: 1280, height: 720, fps: 30 }

const WIN_EXIT = { unsupportedOs: 2, notInstalled: 3 }

// OSSystemExtensionErrorCode (SystemExtensions.framework)
const MAC_EXTENSION_ERRORS = {
  1: 'Erreur inconnue du systeme.',
  2: "Autorisation d'installation manquante dans la signature de ChapCam.",
  3: 'ChapCam doit etre lance depuis le dossier Applications.',
  4: "Extension camera introuvable dans ChapCam.app.",
  5: "Identifiant de l'extension camera manquant.",
  6: 'Une autre extension utilise deja cet identifiant.',
  7: "Type d'extension non reconnu par macOS.",
  8: "Signature de l'extension camera invalide.",
  9: "macOS a refuse l'extension camera (validation echouee).",
  10: "L'installation est bloquee par une politique du Mac (MDM ou profil de gestion).",
  11: 'Demande annulee.',
  12: 'Demande remplacee par une demande plus recente.',
  13: 'Autorisation administrateur requise.',
}

let logFile
function log(msg) {
  const line = `[VirtualCamera] ${msg}`
  console.log(line)
  if (process.platform !== 'darwin') return
  try {
    if (logFile === undefined) {
      const dir = app.getPath('logs')
      fs.mkdirSync(dir, { recursive: true })
      logFile = path.join(dir, 'virtual-camera.log')
    }
    fs.appendFileSync(logFile, `${new Date().toISOString()} ${msg}\n`)
  } catch (_) {
    logFile = null
  }
}

function macLogPath() {
  return logFile || null
}

function nativeDir() {
  const sub = process.platform === 'win32' ? 'win' : 'mac'
  const candidates = [
    path.join(process.resourcesPath || '', 'vcam', sub),
    path.join(__dirname, '..', 'resources', 'vcam', sub),
  ]
  return candidates.find((dir) => fs.existsSync(dir)) || null
}

function helperPath() {
  const dir = nativeDir()
  if (!dir) return null
  const file = process.platform === 'win32' ? 'chapcam-vcam.exe' : 'chapcam-vcam-mac'
  const full = path.join(dir, file)
  return fs.existsSync(full) ? full : null
}

let macActivator
function loadMacActivator() {
  if (macActivator !== undefined) return macActivator
  macActivator = null
  const dir = nativeDir()
  const arch = process.arch === 'arm64' ? 'arm64' : 'x64'
  const addon = dir && path.join(dir, arch, 'vcam_activator.node')
  if (addon && fs.existsSync(addon)) {
    try {
      macActivator = require(addon)
    } catch (e) {
      log(`Activateur macOS indisponible: ${e.message}`)
    }
  }
  return macActivator
}

function runHelper(helper, args) {
  return new Promise((resolve) => {
    execFile(helper, args, { timeout: 20000 }, (err, stdout, stderr) => {
      resolve({ code: err ? (typeof err.code === 'number' ? err.code : 1) : 0, output: `${stdout}${stderr}`.trim() })
    })
  })
}

// ------------------------------------------------------------
// macOS : etat reel de l'extension "ChapCam Camera"
// ------------------------------------------------------------

function macExtensionBundlePath() {
  return path.join(path.dirname(app.getPath('exe')), '..', 'Library', 'SystemExtensions', `${MAC_EXTENSION_ID}.systemextension`)
}

// Lit la ligne de `systemextensionsctl list` correspondant a l'extension :
//   *  *  TEAMID  com.chapcam.desktop.camera-extension (1.0.0/1)  ChapCam Camera  [activated enabled]
function readMacRegistration() {
  return new Promise((resolve) => {
    execFile('/usr/bin/systemextensionsctl', ['list'], { timeout: 10000 }, (err, stdout) => {
      if (err && !stdout) return resolve({ registration: 'unknown', raw: err.message })
      const lines = String(stdout).split('\n').filter((l) => l.includes(MAC_EXTENSION_ID))
      if (!lines.length) return resolve({ registration: 'not-installed', raw: '' })
      const states = lines.map((l) => (l.match(/\[([^\]]+)\]\s*$/) || [])[1] || '')
      const pick = (needle) => states.find((s) => s.includes(needle))
      const state = pick('activated enabled') || pick('waiting for user') || pick('activated') || states[0]
      let registration = 'unknown'
      if (state === 'activated enabled') registration = 'activated'
      else if (state.includes('waiting for user')) registration = 'waiting-for-user'
      else if (state.includes('activated disabled')) registration = 'disabled'
      else if (state.includes('terminat') || state.includes('uninstall')) registration = 'not-installed'
      resolve({ registration, raw: lines.join('\n').replace(/\b[A-Z0-9]{10}\b/g, '<TEAM>') })
    })
  })
}

// Verification independante du helper : liste des cameras vue par AVFoundation,
// c'est-a-dire exactement ce que Zoom, Telegram, FaceTime... voient.
function readAvFoundationCameras() {
  return new Promise((resolve) => {
    execFile('/usr/sbin/system_profiler', ['SPCameraDataType', '-json'], { timeout: 20000 }, (err, stdout) => {
      if (err && !stdout) return resolve(null)
      try {
        const items = JSON.parse(String(stdout)).SPCameraDataType || []
        resolve(items.map((item) => item._name).filter(Boolean))
      } catch (_) {
        resolve(null)
      }
    })
  })
}

function isMacExtensionRunning() {
  return new Promise((resolve) => {
    execFile('/usr/bin/pgrep', ['-f', MAC_EXTENSION_ID], { timeout: 5000 }, (err, stdout) => {
      resolve(!err && String(stdout).trim().length > 0)
    })
  })
}

function macCameraAccess() {
  try {
    return systemPreferences.getMediaAccessStatus('camera')
  } catch (_) {
    return 'unknown'
  }
}

// Journaux systeme lies a l'extension (lancement, sandbox, CoreMediaIO, sysextd),
// recopies dans virtual-camera.log pour le diagnostic.
function collectMacSystemLogs() {
  const predicate = [
    `subsystem == "${MAC_EXTENSION_ID}"`,
    `process CONTAINS "${MAC_EXTENSION_ID}"`,
    `(eventMessage CONTAINS[c] "chapcam" AND (subsystem BEGINSWITH "com.apple.cmio" OR process == "sysextd" OR process == "kernel" OR process == "amfid" OR process == "registerassistantservice"))`,
  ].join(' OR ')
  return new Promise((resolve) => {
    execFile('/usr/bin/log', ['show', '--last', '15m', '--style', 'compact', '--info', '--predicate', predicate],
      { timeout: 45000, maxBuffer: 8 * 1024 * 1024 }, (err, stdout) => {
        const lines = String(stdout || '').split('\n').filter((l) => l.trim() && !l.startsWith('Timestamp'))
        resolve(lines.length ? lines.slice(-200).join('\n') : err ? `log show indisponible: ${err.message}` : '(aucune entree)')
      })
  })
}

function macApprovalSettingsUrl() {
  const major = parseInt(String(process.getSystemVersion()).split('.')[0], 10) || 0
  if (major >= 15) return 'x-apple.systempreferences:com.apple.LoginItems-Settings.extension'
  if (major >= 13) return 'x-apple.systempreferences:com.apple.settings.PrivacySecurity.extension'
  return 'x-apple.systempreferences:com.apple.preference.security?General'
}

function macApprovalHint() {
  const major = parseInt(String(process.getSystemVersion()).split('.')[0], 10) || 0
  if (major >= 15) {
    return 'Reglages Systeme > General > Ouverture et extensions > Extensions de camera : active "ChapCam".'
  }
  return 'Reglages Systeme > Confidentialite et securite : clique "Autoriser" a cote du logiciel systeme de ChapCam.'
}

function describeMacError(error) {
  const message = (error && error.message) || String(error)
  const match = message.match(/\[OSSystemExtensionErrorDomain (\d+)\]/)
  const code = match ? Number(match[1]) : null
  const text = (code && MAC_EXTENSION_ERRORS[code]) || message.replace(/^\[[^\]]+\]\s*/, '')
  return { code, message: code ? `${text} (code ${code})` : text }
}

class VirtualCamera {
  constructor() {
    this.isRunning = false
    this.proc = null
    this.deviceName = DEVICE_DESCRIPTION
    this.width = DEFAULT.width
    this.height = DEFAULT.height
    this.fps = DEFAULT.fps
    this._out = null
    this._lastError = null
    this._frames = 0
    this._macActivated = false
  }

  getStatus() {
    const available = this.isAvailable()
    let error = this._lastError
    let mac
    if (process.platform === 'darwin') {
      // Pas d'etat "prete" tant que macOS n'expose pas reellement la camera.
      mac = this._macState || null
      if (!this.isRunning && mac && mac.status !== 'ready' && !error) {
        error = `${mac.message} Menu Camera > Activer la camera virtuelle.`
      }
      if (!mac || Date.now() - (this._macStateAt || 0) > 5000) {
        this._macStateAt = Date.now()
        this.getMacState().catch((e) => log(`Etat macOS illisible: ${e.message}`))
      }
    }
    return {
      running: this.isRunning,
      driverInstalled: available,
      isRunning: this.isRunning,
      deviceName: this.deviceName,
      platform: process.platform,
      width: this.width,
      height: this.height,
      fps: this.fps,
      available,
      error,
      mac,
    }
  }

  isAvailable() {
    if (process.platform === 'win32') return !!helperPath()
    if (process.platform === 'darwin') return !!helperPath() && !!loadMacActivator()
    if (process.platform === 'linux') return fs.existsSync('/dev/video10')
    return false
  }

  async start(options = {}) {
    this.width = options.width || DEFAULT.width
    this.height = options.height || DEFAULT.height
    this.fps = options.fps || DEFAULT.fps
    this._lastError = null

    if (this.isRunning) return this.getStatus()

    try {
      if (process.platform === 'win32') await this.startWindows()
      else if (process.platform === 'darwin') await this.startMacOS()
      else if (process.platform === 'linux') await this.startLinux()
      else throw new Error(`Plateforme non supportee: ${process.platform}`)
      this.isRunning = true
      this._frames = 0
      log(`Demarree (${this.deviceName} ${this.width}x${this.height}@${this.fps})`)
    } catch (error) {
      this._lastError = error.message
      log(`Echec demarrage: ${error.message}`)
      throw error
    }
    return this.getStatus()
  }

  stop() {
    if (this.proc) {
      try {
        this.proc.stdin && this.proc.stdin.end()
      } catch (_) {}
      try {
        this.proc.kill()
      } catch (_) {}
      this.proc = null
    }
    this.isRunning = false
    log('Arretee')
    return this.getStatus()
  }

  // Windows 11 : source Media Foundation enregistree a l'installation.
  async startWindows() {
    const helper = helperPath()
    if (!helper) throw new Error('Camera "ChapCam Camera" introuvable. Reinstalle ChapCam.')

    const { code, output } = await runHelper(helper, ['status'])
    if (code === WIN_EXIT.unsupportedOs) {
      throw new Error('La camera virtuelle ChapCam necessite Windows 11.')
    }
    if (code === WIN_EXIT.notInstalled) {
      throw new Error('Camera "ChapCam Camera" non installee. Reinstalle ChapCam (droits administrateur).')
    }
    if (code !== 0) throw new Error(`Camera virtuelle indisponible: ${output}`)

    this.spawnHelper(helper)
  }

  /**
   * Etat reel de "ChapCam Camera" sur macOS, mesure a chaque appel :
   *   missing | move-to-applications | not-installed | installing |
   *   needs-approval | disabled | reboot-required | activated | ready | error
   * "ready" = extension activee ET peripherique visible dans CoreMediaIO.
   */
  async getMacState() {
    const base = {
      platform: 'darwin',
      macos: process.getSystemVersion(),
      appPath: app.getPath('exe'),
      logPath: macLogPath(),
      approvalHint: macApprovalHint(),
    }
    const helper = helperPath()
    const activator = loadMacActivator()
    const bundled = fs.existsSync(macExtensionBundlePath())
    const parts = { bundled, helper: !!helper, activator: !!activator }

    if (!bundled || !helper || !activator) {
      const missing = Object.entries(parts).filter(([, ok]) => !ok).map(([k]) => k).join(', ')
      return this._setMacState({ ...base, ...parts, status: 'missing', message: `Composants camera absents de ChapCam.app (${missing}). Reinstalle ChapCam.` })
    }
    if (!app.getPath('exe').startsWith('/Applications/')) {
      return this._setMacState({ ...base, ...parts, status: 'move-to-applications', message: 'ChapCam doit etre dans le dossier Applications pour installer sa camera.' })
    }

    // Sans autorisation camera, macOS refuse a ChapCam l'acces au flux d'entree
    // de "ChapCam Camera" : on la demande une fois, ChapCam en a besoin de toute facon.
    let cameraAccess = macCameraAccess()
    if (cameraAccess === 'not-determined' && !this._macAccessAsked) {
      this._macAccessAsked = true
      try {
        await systemPreferences.askForMediaAccess('camera')
      } catch (_) {}
      cameraAccess = macCameraAccess()
    }

    const { registration, raw } = await readMacRegistration()
    const probe = await runHelper(helper, ['probe'])
    const cmioVisible = probe.code === 0
    const cmioDevices = (probe.output.match(/devices: (.*)/) || [])[1] || ''
    const avCameras = registration === 'activated' ? await readAvFoundationCameras() : null
    const avVisible = !!avCameras && avCameras.includes(DEVICE_DESCRIPTION)
    const extensionRunning = await isMacExtensionRunning()
    const deviceVisible = cmioVisible
    const state = {
      ...base, ...parts, registration, registrationRaw: raw, deviceVisible,
      cmioVisible, cmioDevices, avVisible, avCameras, extensionRunning, cameraAccess,
    }
    this._logMacDiagnostics(state)

    if (this._macActivating) return this._setMacState({ ...state, status: 'installing', message: 'Installation de la camera en cours...' })
    if (deviceVisible) return this._setMacState({ ...state, status: 'ready', message: '"ChapCam Camera" est disponible dans les applications video.' })
    if (avVisible && cameraAccess === 'denied') {
      return this._setMacState({ ...state, status: 'error', message: 'ChapCam Camera est visible pour macOS, mais ChapCam n\'a pas acces a la camera. Reglages Systeme > Confidentialite et securite > Camera : active ChapCam.' })
    }
    if (this._macPendingReboot) return this._setMacState({ ...state, status: 'reboot-required', message: 'Redemarre ton Mac pour terminer l\'installation.' })
    if (registration === 'waiting-for-user') return this._setMacState({ ...state, status: 'needs-approval', message: `Autorisation macOS requise. ${macApprovalHint()}` })
    if (registration === 'disabled') return this._setMacState({ ...state, status: 'disabled', message: `Extension desactivee dans macOS. ${macApprovalHint()}` })
    if (registration === 'activated') {
      const reason = avVisible
        ? 'macOS expose bien ChapCam Camera, mais ChapCam ne parvient pas a s\'y connecter.'
        : extensionRunning
          ? 'L\'extension tourne mais ne publie pas encore la camera.'
          : 'macOS n\'a pas lance l\'extension camera (voir le journal).'
      return this._setMacState({ ...state, status: 'activated', message: `Extension activee. ${reason} Si cela dure plus d'une minute, redemarre le Mac.` })
    }
    if (this._macError) return this._setMacState({ ...state, status: 'error', message: this._macError })
    return this._setMacState({ ...state, status: 'not-installed', message: 'Camera virtuelle pas encore activee.' })
  }

  _logMacDiagnostics(state) {
    const summary = `registration=${state.registration} cmio=${state.cmioVisible} av=${state.avVisible} ` +
      `extensionProcess=${state.extensionRunning} cameraAccess=${state.cameraAccess} ` +
      `cmioDevices=[${state.cmioDevices}] avCameras=[${(state.avCameras || []).join(' | ')}]`
    if (summary !== this._lastMacSummary) {
      this._lastMacSummary = summary
      log(`Diagnostic: ${summary}`)
    }
    // Extension enregistree mais camera absente : on recopie une fois les journaux systeme.
    if (state.registration === 'activated' && !state.cmioVisible && !this._macSystemLogsCollected) {
      this._macSystemLogsCollected = true
      collectMacSystemLogs().then((text) => log(`Journaux systeme (15 dernieres minutes):\n${text}`))
    }
  }

  _setMacState(state) {
    if (!this._macState || this._macState.status !== state.status) log(`Etat macOS: ${state.status} (${state.message})`)
    this._macState = state
    return state
  }

  /** Soumet OSSystemExtensionRequest puis renvoie l'etat reel mesure. */
  async activateMac() {
    const current = await this.getMacState()
    if (['missing', 'move-to-applications', 'ready'].includes(current.status)) return current
    if (this._macActivating) return current

    this._macActivating = true
    this._macError = null
    log(`Activation demandee (macOS ${process.getSystemVersion()}, ${app.getPath('exe')})`)
    try {
      const result = await loadMacActivator().activate(MAC_EXTENSION_ID)
      log(`OSSystemExtensionRequest: ${result}`)
      if (result === 'reboot-required') this._macPendingReboot = true
    } catch (error) {
      const { message } = describeMacError(error)
      this._macError = message
      log(`OSSystemExtensionRequest echec: ${error.message}`)
    } finally {
      this._macActivating = false
    }
    return this.getMacState()
  }

  async startMacOS() {
    let state = await this.getMacState()
    if (state.status !== 'ready') state = await this.activateMac()
    if (state.status !== 'ready') {
      if (this.onMacActivationNeeded) this.onMacActivationNeeded(state)
      throw new Error(state.message)
    }
    this.spawnHelper(helperPath())
  }

  spawnHelper(helper) {
    this.proc = spawn(helper, ['stream', String(this.width), String(this.height), String(this.fps)], {
      stdio: ['pipe', 'ignore', 'pipe'],
    })
    this.proc.stderr.on('data', (d) => log(`helper: ${String(d).trim()}`))
    this.proc.on('error', (e) => {
      this._lastError = e.message
      log(`Erreur process: ${e.message}`)
      this.isRunning = false
    })
    this.proc.on('close', (code) => {
      log(`Flux termine (code ${code})`)
      if (code === 3) this._lastError = 'Camera "ChapCam Camera" introuvable sur le systeme.'
      this.isRunning = false
      this.proc = null
    })
  }

  // Linux : v4l2loopback via ffmpeg (dev/tests)
  async startLinux() {
    const device = '/dev/video10'
    if (!fs.existsSync(device)) {
      throw new Error(
        'v4l2loopback absent. Installe-le : sudo modprobe v4l2loopback video_nr=10 card_label="ChapCam Camera"',
      )
    }
    this.proc = spawn(
      'ffmpeg',
      ['-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${this.width}x${this.height}`, '-r', String(this.fps),
        '-i', 'pipe:0', '-f', 'v4l2', '-pix_fmt', 'yuv420p', device],
      { stdio: ['pipe', 'pipe', 'pipe'] },
    )
    this.proc.stderr.on('data', (d) => {
      const s = String(d)
      if (/error|invalid|No such/i.test(s)) log(`ffmpeg: ${s.trim()}`)
    })
    this.proc.on('close', (code) => {
      log(`ffmpeg termine (code ${code})`)
      this.isRunning = false
      this.proc = null
    })
  }

  /**
   * Recoit une frame RGBA (top-down) du renderer. Windows/macOS attendent du
   * BGRA top-down ; Linux (ffmpeg) prend le RGBA tel quel.
   */
  writeFrame(rgba, width, height) {
    if (!this.isRunning || !this.proc || !this.proc.stdin || this.proc.stdin.destroyed) return
    if (width !== this.width || height !== this.height) return
    const bytes = width * height * 4
    if (!rgba || rgba.length < bytes) return

    if (process.platform === 'linux') {
      this._safeWrite(rgba.subarray(0, bytes))
      return
    }

    if (!this._out || this._out.length !== bytes) this._out = Buffer.allocUnsafe(bytes)
    const out = this._out
    for (let i = 0; i < bytes; i += 4) {
      out[i] = rgba[i + 2]
      out[i + 1] = rgba[i + 1]
      out[i + 2] = rgba[i]
      out[i + 3] = 255
    }
    this._safeWrite(out)
  }

  _safeWrite(buf) {
    try {
      // Si le pipe sature, on laisse tomber la frame pour garder la latence.
      if (this.proc.stdin.writableLength > buf.length * 2) return
      this.proc.stdin.write(Buffer.from(buf))
      this._frames++
    } catch (e) {
      this._lastError = e.message
    }
  }
}

let instance = null
function getVirtualCamera() {
  if (!instance) instance = new VirtualCamera()
  return instance
}

function setupVirtualCameraIPC() {
  ipcMain.handle('virtual-camera-start', async (_e, options) => getVirtualCamera().start(options || {}))
  ipcMain.handle('virtual-camera-stop', async () => getVirtualCamera().stop())
  ipcMain.handle('virtual-camera-status', async () => getVirtualCamera().getStatus())
  ipcMain.handle('virtual-camera-mac-state', async () =>
    process.platform === 'darwin' ? getVirtualCamera().getMacState() : { platform: process.platform, status: 'unsupported' },
  )
  ipcMain.handle('virtual-camera-mac-activate', async () =>
    process.platform === 'darwin' ? getVirtualCamera().activateMac() : { platform: process.platform, status: 'unsupported' },
  )
  // Frames poussees par le preload : send/on (invoke serait trop lourd a 30 fps).
  ipcMain.on('vcam:frame', (_e, payload) => {
    if (!payload || !payload.buffer) return
    getVirtualCamera().writeFrame(Buffer.from(payload.buffer), payload.width, payload.height)
  })
}

module.exports = {
  VirtualCamera,
  getVirtualCamera,
  setupVirtualCameraIPC,
  macApprovalSettingsUrl,
  DEVICE_DESCRIPTION,
  DEVICE_ID,
}
