/**
 * Camera virtuelle ChapCam Desktop
 * ----------------------------------
 * Cree un VRAI peripherique camera systeme nomme "ChapCam Camera" et lui
 * pousse, image par image, la sortie face-swap deja transformee.
 *
 * IMPORTANT (limite OS) : une app ne peut PAS "inventer" une camera systeme
 * sans pilote. Il faut un pilote de camera virtuelle installe. ChapCam embarque
 * le pilote open-source "akvirtualcamera" (DirectShow + Media Foundation), ce
 * qui le rend visible PARTOUT :
 *   - DirectShow  -> OBS (Peripherique de capture video), Zoom, Discord, Chrome/Google Meet, Edge
 *   - Media Foundation -> Microsoft Teams, application Camera de Windows
 *
 * Flux des frames :
 *   renderer (capture du canvas) --IPC--> main --stdin--> AkVCamManager stream
 *   --> pilote "ChapCam Camera" --> applications tierces.
 *
 * Le binaire pilote est attendu sous resources/akvirtualcamera/<arch>/.
 * Cf. electron/build/ pour l'installation/desinstallation au moment du setup.
 */

const { ipcMain, app } = require('electron')
const path = require('path')
const fs = require('fs')
const { spawn, execFile } = require('child_process')

// ---- Identite du peripherique (ce que verront OBS/Zoom/Teams/etc.) ----
const DEVICE_DESCRIPTION = 'ChapCam Camera'
const DEVICE_ID = 'ChapCamCamera' // id interne stable pour akvirtualcamera

// ---- Format de sortie ----
const DEFAULT = { width: 1280, height: 720, fps: 30 }

// Reglages couleur/orientation (a ajuster si rendu errone au 1er test Windows) :
//   - SWAP_RB : echange Rouge/Bleu (RGBA navigateur -> BGR DirectShow)
//   - FLIP_V  : retourne verticalement (DShow attend souvent bottom-up)
const SWAP_RB = true
const FLIP_V = true

function log(msg) {
  console.log(`[VirtualCamera] ${msg}`)
}

// Resout le chemin du gestionnaire akvirtualcamera selon plateforme/arch.
function akvcamManagerPath() {
  if (process.platform !== 'win32') return null
  const arch = process.arch === 'ia32' ? 'x86' : 'x64'
  const candidates = [
    // Empaquete dans l'app (production)
    path.join(process.resourcesPath || '', 'akvirtualcamera', arch, 'AkVCamManager.exe'),
    // Dev : binaire pose dans le repo
    path.join(__dirname, '..', 'resources', 'akvirtualcamera', arch, 'AkVCamManager.exe'),
    // Installation systeme du pilote (fallback)
    path.join(process.env['ProgramFiles'] || 'C:\\Program Files', 'AkVirtualCamera', arch, 'AkVCamManager.exe'),
  ]
  for (const c of candidates) {
    if (c && fs.existsSync(c)) return c
  }
  return null
}

class VirtualCamera {
  constructor() {
    this.isRunning = false
    this.proc = null // process AkVCamManager stream / ffmpeg
    this.deviceName = DEVICE_DESCRIPTION
    this.width = DEFAULT.width
    this.height = DEFAULT.height
    this.fps = DEFAULT.fps
    this._rgb = null // buffer RGB24 reutilise (anti-GC)
    this._lastError = null
    this._frames = 0
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

  // Le pilote est-il present sur la machine ?
  isAvailable() {
    if (process.platform === 'win32') return !!akvcamManagerPath()
    if (process.platform === 'linux') return fs.existsSync('/dev/video10')
    return false // macOS : voir startMacOS
  }

  async start(options = {}) {
    this.width = options.width || DEFAULT.width
    this.height = options.height || DEFAULT.height
    this.fps = options.fps || DEFAULT.fps
    this._lastError = null

    if (this.isRunning) {
      log('Deja active')
      return this.getStatus()
    }

    try {
      if (process.platform === 'win32') {
        await this.startWindows()
      } else if (process.platform === 'linux') {
        await this.startLinux()
      } else if (process.platform === 'darwin') {
        await this.startMacOS()
      } else {
        throw new Error(`Plateforme non supportee: ${process.platform}`)
      }
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

  // ----------------------------------------------------------------
  // WINDOWS : pilote akvirtualcamera (DirectShow + Media Foundation)
  // ----------------------------------------------------------------
  async startWindows() {
    const manager = akvcamManagerPath()
    if (!manager) {
      throw new Error(
        'Pilote "ChapCam Camera" introuvable. Reinstalle ChapCam pour installer le pilote camera.',
      )
    }

    // S'assurer que le peripherique existe et expose le bon format.
    await this.ensureWindowsDevice(manager)

    // Lancer le flux : AkVCamManager lit des frames RGB24 brutes sur stdin.
    this.proc = spawn(
      manager,
      ['stream', '--fps', String(this.fps), DEVICE_ID, 'RGB24', String(this.width), String(this.height)],
      { stdio: ['pipe', 'pipe', 'pipe'] },
    )

    this.proc.stderr.on('data', (d) => log(`akvcam: ${String(d).trim()}`))
    this.proc.on('error', (e) => {
      this._lastError = e.message
      log(`Erreur process: ${e.message}`)
      this.isRunning = false
    })
    this.proc.on('close', (code) => {
      log(`Flux termine (code ${code})`)
      this.isRunning = false
      this.proc = null
    })
  }

  // Cree/renomme le peripherique "ChapCam Camera" et configure son format.
  // Idempotent : peut etre relance a chaque demarrage sans casser l'existant.
  ensureWindowsDevice(manager) {
    return new Promise((resolve) => {
      const run = (args) =>
        new Promise((res) => {
          execFile(manager, args, (err, stdout, stderr) => {
            if (err) log(`(${args[0]}) ${stderr || err.message}`)
            res({ stdout: String(stdout || ''), err })
          })
        })

      ;(async () => {
        // Le device existe-t-il deja ?
        const { stdout } = await run(['devices'])
        const exists = stdout.split(/\r?\n/).some((l) => l.trim() === DEVICE_ID)

        if (!exists) {
          await run(['add-device', '--id', DEVICE_ID, DEVICE_DESCRIPTION])
        } else {
          // Garantir le bon nom affiche
          await run(['set-description', DEVICE_ID, DEVICE_DESCRIPTION])
        }
        // (Re)declarer le format de sortie souhaite
        await run(['add-format', DEVICE_ID, 'RGB24', String(this.width), String(this.height), String(this.fps)])
        // Appliquer
        await run(['update'])
        resolve()
      })()
    })
  }

  // ----------------------------------------------------------------
  // LINUX : v4l2loopback via ffmpeg (dev/tests)
  // ----------------------------------------------------------------
  async startLinux() {
    const device = '/dev/video10'
    if (!fs.existsSync(device)) {
      throw new Error(
        'v4l2loopback absent. Installe-le : sudo modprobe v4l2loopback video_nr=10 card_label="ChapCam Camera"',
      )
    }
    this.proc = spawn(
      'ffmpeg',
      [
        '-f', 'rawvideo',
        '-pix_fmt', 'rgba',
        '-s', `${this.width}x${this.height}`,
        '-r', String(this.fps),
        '-i', 'pipe:0',
        '-f', 'v4l2',
        '-pix_fmt', 'yuv420p',
        device,
      ],
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

  // ----------------------------------------------------------------
  // macOS : pilote CMIO (akvirtualcamera fournit aussi macOS). Non cable ici.
  // ----------------------------------------------------------------
  async startMacOS() {
    throw new Error(
      'Camera virtuelle macOS non encore cablee. Le pilote akvirtualcamera macOS doit etre installe et streame de la meme facon.',
    )
  }

  /**
   * Recoit une frame RGBA (Uint8/Buffer, longueur = w*h*4) depuis le renderer,
   * la convertit au format attendu par le pilote, et l'ecrit sur stdin.
   */
  writeFrame(rgba, width, height) {
    if (!this.isRunning || !this.proc || !this.proc.stdin || !this.proc.stdin.writable) return

    // Linux/ffmpeg : on envoie le RGBA tel quel (pix_fmt rgba).
    if (process.platform === 'linux') {
      this._safeWrite(Buffer.isBuffer(rgba) ? rgba : Buffer.from(rgba))
      return
    }

    // Windows/akvcam : conversion RGBA -> RGB24 (+ swap R/B et flip vertical au besoin).
    const w = width || this.width
    const h = height || this.height
    const need = w * h * 3
    if (!this._rgb || this._rgb.length !== need) this._rgb = Buffer.allocUnsafe(need)
    const out = this._rgb
    const src = rgba

    for (let y = 0; y < h; y++) {
      const sy = FLIP_V ? h - 1 - y : y
      let si = sy * w * 4
      let di = y * w * 3
      for (let x = 0; x < w; x++) {
        const r = src[si]
        const g = src[si + 1]
        const b = src[si + 2]
        if (SWAP_RB) {
          out[di] = b
          out[di + 1] = g
          out[di + 2] = r
        } else {
          out[di] = r
          out[di + 1] = g
          out[di + 2] = b
        }
        si += 4
        di += 3
      }
    }
    this._safeWrite(out)
  }

  _safeWrite(buf) {
    try {
      // back-pressure : si le pipe est sature, on laisse tomber la frame
      // (on privilegie la latence a l'exhaustivite).
      const ok = this.proc.stdin.write(buf)
      this._frames++
      if (!ok && this._frames % 120 === 0) log('stdin sature : frames droppees pour garder la latence')
    } catch (e) {
      this._lastError = e.message
    }
  }
}

// ---- Singleton ----
let instance = null
function getVirtualCamera() {
  if (!instance) instance = new VirtualCamera()
  return instance
}

// ---- IPC ----
function setupVirtualCameraIPC() {
  ipcMain.handle('virtual-camera-start', async (_e, options) => {
    return getVirtualCamera().start(options || {})
  })
  ipcMain.handle('virtual-camera-stop', async () => {
    return getVirtualCamera().stop()
  })
  ipcMain.handle('virtual-camera-status', async () => {
    return getVirtualCamera().getStatus()
  })
  // Frames poussees par le renderer (preload). On evite invoke (trop lourd a 30fps)
  // au profit de send/on.
  ipcMain.on('vcam:frame', (_e, payload) => {
    if (!payload || !payload.buffer) return
    const view = Buffer.from(payload.buffer)
    getVirtualCamera().writeFrame(view, payload.width, payload.height)
  })
}

module.exports = {
  VirtualCamera,
  getVirtualCamera,
  setupVirtualCameraIPC,
  DEVICE_DESCRIPTION,
  DEVICE_ID,
}
