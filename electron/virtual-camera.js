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

const { ipcMain, app } = require('electron')
const path = require('path')
const fs = require('fs')
const { spawn, execFile } = require('child_process')

const DEVICE_DESCRIPTION = 'ChapCam Camera'
const DEVICE_ID = 'ChapCamCamera'
const MAC_EXTENSION_ID = 'com.chapcam.desktop.camera-extension'
const DEFAULT = { width: 1280, height: 720, fps: 30 }

const WIN_EXIT = { unsupportedOs: 2, notInstalled: 3 }

function log(msg) {
  console.log(`[VirtualCamera] ${msg}`)
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
    return {
      isRunning: this.isRunning,
      deviceName: this.deviceName,
      platform: process.platform,
      width: this.width,
      height: this.height,
      fps: this.fps,
      available: this.isAvailable(),
      error: this._lastError,
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

  // macOS : activer l'extension (une approbation utilisateur est demandee la 1re fois).
  async startMacOS() {
    const helper = helperPath()
    const activator = loadMacActivator()
    if (!helper || !activator) throw new Error('Camera "ChapCam Camera" absente de cette version de ChapCam.')

    if (!this._macActivated) {
      const exe = app.getPath('exe')
      if (!exe.startsWith('/Applications/')) {
        throw new Error('Deplace ChapCam dans le dossier Applications, puis relance-le pour activer la camera.')
      }
      const result = await activator.activate(MAC_EXTENSION_ID)
      log(`Extension camera: ${result}`)
      if (result === 'needs-approval') {
        throw new Error(
          'Autorise "ChapCam" dans Reglages Systeme > General > Ouverture et extensions > Extensions de camera, puis reactive la camera.',
        )
      }
      if (result === 'reboot-required') {
        throw new Error('Redemarre ton Mac pour terminer l\'installation de "ChapCam Camera".')
      }
      this._macActivated = true
    }

    this.spawnHelper(helper)
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
  DEVICE_DESCRIPTION,
  DEVICE_ID,
}
