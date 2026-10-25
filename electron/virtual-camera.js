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

const { ipcMain, app, BrowserWindow, systemPreferences, shell } = require('electron')
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
      const activeLine = lines.find((l) => l.includes(`[${state}]`)) || lines[0]
      const versionMatch = activeLine.match(/\(([^/)]+)\/([^)]+)\)/)
      const installedVersion = versionMatch ? `${versionMatch[1]}/${versionMatch[2]}` : null
      let registration = 'unknown'
      if (state === 'activated enabled') registration = 'activated'
      else if (state.includes('waiting for user')) registration = 'waiting-for-user'
      else if (state.includes('activated disabled')) registration = 'disabled'
      else if (state.includes('terminat') || state.includes('uninstall')) registration = 'not-installed'
      resolve({ registration, installedVersion, raw: lines.join('\n').replace(/\b[A-Z0-9]{10}\b/g, '<TEAM>') })
    })
  })
}

// "1.0.3/57" read from the extension embedded in ChapCam.app.
function readBundledExtensionVersion() {
  try {
    const plist = fs.readFileSync(path.join(macExtensionBundlePath(), 'Contents', 'Info.plist'), 'utf8')
    const value = (key) => (plist.match(new RegExp(`<key>${key}</key>\\s*<string>([^<]+)</string>`)) || [])[1]
    const short = value('CFBundleShortVersionString')
    const build = value('CFBundleVersion')
    return short && build ? `${short}/${build}` : null
  } catch (_) {
    return null
  }
}

function parseKeyValues(line) {
  const out = {}
  for (const [, key, value] of line.matchAll(/(\w+)=(\S+)/g)) out[key] = /^-?\d+$/.test(value) ? Number(value) : value
  return out
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
    // Stream health: frames from the UI, helper counters, and read-back checks.
    this._wanted = false
    this._connected = false
    this._startedAt = 0
    this._inFrames = 0
    this._wrongSize = 0
    this._input = { fps: 0, wrongSize: 0, lastAt: 0 }
    this._helperStats = null
    this._verify = null
    this._restartAttempts = 0
    this._restartTimer = null
    this._verifyTimer = null
    this._rateTimer = null
  }

  _startRateTimer() {
    if (this._rateTimer) return
    this._rateTimer = setInterval(() => {
      const now = Date.now()
      this._input = {
        fps: this._inFrames,
        wrongSize: this._wrongSize,
        lastAt: this._inFrames > 0 ? now : this._input.lastAt,
      }
      this._inFrames = 0
      this._wrongSize = 0
      const health = this._health()
      if (health.state !== this._lastHealthState) {
        this._lastHealthState = health.state
        log(`Flux: ${health.state} (${health.message})`)
      }
    }, 1000)
  }

  _stopTimers() {
    clearInterval(this._rateTimer)
    clearTimeout(this._restartTimer)
    clearTimeout(this._verifyTimer)
    this._rateTimer = this._restartTimer = this._verifyTimer = null
  }

  /**
   * Real stream state, never inferred from "helper launched":
   *   stopped | connecting | reconnecting | no-source | wrong-size | blocked |
   *   checking | placeholder | no-output | ok
   */
  _health() {
    const now = Date.now()
    if (!this._wanted) return { state: 'stopped', healthy: false, message: 'Camera virtuelle arretee.' }
    if (this._fatal) return { state: 'failed', healthy: false, message: this._fatal }
    if (this._restartTimer || (!this.proc && this._wanted)) {
      return { state: 'reconnecting', healthy: false, message: 'Reconnexion a ChapCam Camera...' }
    }
    if (!this._connected) return { state: 'connecting', healthy: false, message: 'Connexion a ChapCam Camera...' }
    const warm = now - this._startedAt > 3000
    if (warm && this._input.wrongSize > 0 && this._input.fps === this._input.wrongSize) {
      return { state: 'wrong-size', healthy: false, message: `Images ignorees : format different de ${this.width}x${this.height}.` }
    }
    if (warm && now - (this._input.lastAt || this._startedAt) > 2500) {
      return { state: 'no-source', healthy: false, message: 'Aucune image transformee recue. Lance le Live Swap : la camera ChapCam doit etre visible dans l\'app.' }
    }
    const stats = this._helperStats
    if (stats && now - stats.at < 3000 && stats.enq === 0 && stats.full > 0) {
      return { state: 'blocked', healthy: false, message: 'L\'extension camera ne recoit plus les images. Reconnexion automatique...' }
    }
    if (process.platform !== 'darwin') {
      return warm
        ? { state: 'ok', healthy: true, message: `Diffusion active (${this._input.fps} img/s).` }
        : { state: 'checking', healthy: false, message: 'Verification du flux...' }
    }
    // Each hop measured separately: renderer -> main -> helper -> sink -> extension.
    const fresh = stats && now - stats.at < 3000
    if (warm && fresh && this._input.fps > 0 && stats.in === 0) {
      return { state: 'helper-starved', healthy: false, message: 'Les images ne parviennent pas au composant natif (pipe bloque). Clique "Redemarrer".' }
    }
    if (fresh && stats.ext_diag === 'unsupported') {
      return { state: 'extension-outdated', healthy: false, message: 'Une ancienne version de l\'extension camera tourne encore. Redemarre le Mac pour charger la nouvelle.' }
    }
    if (fresh && stats.ext_fresh === 1) {
      return { state: 'ok', healthy: true, message: `Diffusion verifiee : l'extension recoit les images ChapCam (${this._input.fps} img/s).` }
    }
    if (warm && fresh && stats.ext_rej > 0) {
      return { state: 'ext-rejected', healthy: false, message: `L'extension refuse les images (${stats.ext_issue}).` }
    }
    if (warm && fresh && now - this._startedAt > 5000 && typeof stats.ext_rx === 'number' && stats.ext_rx === 0) {
      const why = stats.ext_sink === 0
        ? 'le flux d\'entree de l\'extension n\'est pas demarre'
        : `aucune image recue (${stats.ext_issue || 'raison inconnue'})`
      return { state: 'sink-dropped', healthy: false, message: `Le composant natif envoie ${stats.enq} img/s mais l'extension n'en recoit aucune : ${why}.` }
    }
    const verify = this._verify
    if (verify && verify.error && String(verify.error).startsWith('camera-')) {
      return { state: 'no-permission', healthy: false, message: 'ChapCam n\'a pas acces a la camera. Reglages Systeme > Confidentialite et securite > Camera : active ChapCam.' }
    }
    if (!verify || verify.at < this._startedAt) {
      return { state: 'checking', healthy: false, message: 'Verification de ce que recoivent les applications...' }
    }
    if (verify.real > 0) {
      return { state: 'ok', healthy: true, message: `Diffusion verifiee : les applications recoivent l'image ChapCam (${this._input.fps} img/s).` }
    }
    if (verify.placeholder > 0) {
      return { state: 'placeholder', healthy: false, message: 'Les applications recoivent l\'ecran d\'attente : les images n\'atteignent pas l\'extension. Clique "Redemarrer".' }
    }
    return { state: 'no-output', healthy: false, message: 'ChapCam Camera ne produit aucune image. Clique "Redemarrer" ou redemarre le Mac.' }
  }

  _scheduleVerify(delayMs) {
    clearTimeout(this._verifyTimer)
    if (process.platform !== 'darwin' || !this._wanted) return
    this._verifyTimer = setTimeout(() => this.verifyOutput().catch(() => {}), delayMs)
  }

  /** Reads ChapCam Camera's output like Telegram would (macOS only). */
  async verifyOutput() {
    if (process.platform !== 'darwin') return this._verify
    const helper = helperPath()
    if (!helper || this._verifying) return this._verify
    this._verifying = true
    try {
      const { code, output } = await runHelper(helper, ['verify', '2.5'])
      const line = output.split('\n').find((l) => l.startsWith('verify ')) || ''
      const result = { ...parseKeyValues(line), code, at: Date.now() }
      this._verify = { frames: result.frames || 0, real: result.real || 0, placeholder: result.placeholder || 0, size: result.size || null, error: result.error || null, code, at: result.at }
      log(`Verification sortie: frames=${this._verify.frames} reelles=${this._verify.real} attente=${this._verify.placeholder} ${this._verify.size || ''} code=${code}${this._verify.error ? ` erreur=${this._verify.error}` : ''}`)
    } finally {
      this._verifying = false
      // Re-check often while unhealthy, rarely once verified.
      if (this._wanted) this._scheduleVerify(this._verify && this._verify.real > 0 ? 30000 : 8000)
    }
    return this._verify
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
    const health = this._health()
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
      stream: {
        ...health,
        inputFps: this._input.fps,
        outputFps: this._helperStats ? this._helperStats.enq : null,
        appsReading: this._helperStats ? this._helperStats.readers === 1 : null,
        verify: this._verify,
        restarts: this._restartAttempts,
        extension: this._helperStats
          ? {
              received: this._helperStats.ext_rx ?? null,
              rejected: this._helperStats.ext_rej ?? null,
              errors: this._helperStats.ext_err ?? null,
              sinkRunning: this._helperStats.ext_sink === 1,
              issue: this._helperStats.ext_issue ?? this._helperStats.ext_diag ?? null,
            }
          : null,
        diagnostic: this._lastStatsLine || null,
        logPath: macLogPath(),
      },
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
    this._fatal = null

    if (this.isRunning) return this.getStatus()

    try {
      if (process.platform === 'win32') await this.startWindows()
      else if (process.platform === 'darwin') await this.startMacOS()
      else if (process.platform === 'linux') await this.startLinux()
      else throw new Error(`Plateforme non supportee: ${process.platform}`)
      this.isRunning = true
      this._wanted = true
      this._frames = 0
      this._startedAt = Date.now()
      this._restartAttempts = 0
      this._startRateTimer()
      log(`Demarree (${this.deviceName} ${this.width}x${this.height}@${this.fps})`)
    } catch (error) {
      this._lastError = error.message
      log(`Echec demarrage: ${error.message}`)
      throw error
    }
    return this.getStatus()
  }

  stop() {
    this._wanted = false
    this._stopTimers()
    this._killHelper()
    this.isRunning = false
    this._connected = false
    log('Arretee')
    return this.getStatus()
  }

  _killHelper() {
    const proc = this.proc
    this.proc = null
    if (!proc) return
    proc.removeAllListeners('close')
    try {
      proc.stdin && proc.stdin.end()
    } catch (_) {}
    try {
      proc.kill()
    } catch (_) {}
  }

  /** Stops and reconnects the native stream (button "Redemarrer"). */
  async restart() {
    const options = { width: this.width, height: this.height, fps: this.fps }
    this.stop()
    this._verify = null
    this._helperStats = null
    if (process.platform === 'darwin') this._macUpgradeTried = false
    return this.start(options)
  }

  // Helper died while the camera is wanted: reconnect with backoff.
  _scheduleReconnect(code) {
    if (!this._wanted || this._restartTimer) return
    // No endless retry loop hiding a broken pipeline: code 7 (sink never
    // started) is deterministic, and 4 failed attempts in a row is a real fault.
    if (code === 7 || this._restartAttempts >= 4) {
      this._fatal = code === 7
        ? 'L\'extension ChapCam Camera n\'a pas demarre son flux d\'entree (sink-not-started). Ouvre le Journal pour le detail.'
        : `Le flux vers ChapCam Camera echoue en boucle (code ${code}). Ouvre le Journal pour le detail.`
      this._lastError = this._fatal
      log(`Reconnexion abandonnee: ${this._fatal}`)
      return
    }
    this._restartAttempts++
    const delay = Math.min(15000, 1000 * 2 ** Math.min(this._restartAttempts, 4))
    log(`Reconnexion dans ${delay / 1000}s (tentative ${this._restartAttempts}, code ${code})`)
    this._restartTimer = setTimeout(async () => {
      this._restartTimer = null
      if (!this._wanted) return
      try {
        if (process.platform === 'darwin') {
          const state = await this.getMacState()
          if (state.status !== 'ready') throw new Error(state.message)
        }
        const helper = helperPath()
        if (!helper) throw new Error('Composant camera absent.')
        this.spawnHelper(helper)
      } catch (error) {
        this._lastError = error.message
        this._scheduleReconnect('erreur')
      }
    }, delay)
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

    const { registration, installedVersion, raw } = await readMacRegistration()
    const bundledVersion = readBundledExtensionVersion()
    // macOS keeps running the previously approved extension until ChapCam asks
    // for a replacement, so an app update alone never updates the camera.
    const extensionOutdated = registration === 'activated' && !!installedVersion && !!bundledVersion &&
      installedVersion !== bundledVersion
    if (extensionOutdated && !this._macUpgradeTried && !this._macActivating) {
      this._macUpgradeTried = true
      log(`Extension camera ${installedVersion} remplacee par ${bundledVersion}`)
      setImmediate(() => this.activateMac({ force: true }).catch((e) => log(`Mise a jour extension: ${e.message}`)))
    }
    const probe = await runHelper(helper, ['probe'])
    const cmioVisible = probe.code === 0
    const cmioDevices = (probe.output.match(/devices: (.*)/) || [])[1] || ''
    const avCameras = registration === 'activated' ? await readAvFoundationCameras() : null
    const avVisible = !!avCameras && avCameras.includes(DEVICE_DESCRIPTION)
    const extensionRunning = await isMacExtensionRunning()
    // Telegram/Zoom rely on AVFoundation: if macOS lists the camera there, start
    // streaming even when the helper's CoreMediaIO probe is late to see it.
    const deviceVisible = cmioVisible || (avVisible && cameraAccess !== 'denied')
    const state = {
      ...base, ...parts, registration, registrationRaw: raw, deviceVisible,
      installedVersion, bundledVersion, extensionOutdated,
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
    const summary = `registration=${state.registration} installed=${state.installedVersion} bundled=${state.bundledVersion} ` +
      `cmio=${state.cmioVisible} av=${state.avVisible} ` +
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
  async activateMac({ force = false } = {}) {
    const current = await this.getMacState()
    if (['missing', 'move-to-applications'].includes(current.status)) return current
    if (current.status === 'ready' && !force && !current.extensionOutdated) return current
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
    this._connected = process.platform !== 'darwin'
    this._helperStats = null
    const proc = spawn(helper, ['stream', String(this.width), String(this.height), String(this.fps)], {
      stdio: ['pipe', 'ignore', 'pipe'],
    })
    this.proc = proc
    let pending = ''
    let statsLines = 0
    proc.stderr.on('data', (d) => {
      pending += String(d)
      const lines = pending.split('\n')
      pending = lines.pop()
      for (const raw of lines) {
        const line = raw.trim()
        if (!line) continue
        if (line.startsWith('stats ')) {
          const previous = this._helperStats
          this._helperStats = { ...parseKeyValues(line), at: Date.now() }
          this._lastStatsLine = `${line} entree=${this._input.fps}`
          const stats = this._helperStats
          // Only a frame confirmed by the extension counts as a recovered stream.
          if (stats.ext_fresh === 1) this._restartAttempts = 0
          // Log every 10 s, plus whenever the extension-side picture changes.
          const changed = !previous || (previous.ext_rx > 0) !== (stats.ext_rx > 0) ||
            previous.ext_issue !== stats.ext_issue || previous.ext_sink !== stats.ext_sink
          if (changed || statsLines++ % 10 === 0) log(`helper: ${this._lastStatsLine}`)
          continue
        }
        if (line.startsWith('connected ')) {
          this._connected = true
          this._scheduleVerify(3000)
        }
        log(`helper: ${line}`)
      }
    })
    proc.stdin.on('error', (e) => log(`Pipe helper: ${e.message}`))
    proc.on('error', (e) => {
      this._lastError = e.message
      log(`Erreur process: ${e.message}`)
    })
    proc.on('close', (code) => {
      if (this.proc !== proc) return
      log(`Flux termine (code ${code})`)
      if (code === 3) this._lastError = 'Camera "ChapCam Camera" introuvable sur le systeme.'
      this.proc = null
      this._connected = false
      this._helperStats = null
      this._scheduleReconnect(code)
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
    if (!this.isRunning) return
    this._inFrames++
    if (width !== this.width || height !== this.height) {
      this._wrongSize++
      return
    }
    if (!this.proc || !this.proc.stdin || this.proc.stdin.destroyed) return
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
      if (this._frames === 1) log(`Premiere image envoyee a ${this.deviceName}`)
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
  // The web UI starts the camera through this handler, not the menu: the
  // renderer capture loop must be started too, otherwise the helper runs with
  // no frames and apps only receive the extension's placeholder (black) image.
  ipcMain.handle('virtual-camera-start', async (e, options) => {
    const status = await getVirtualCamera().start(options || {})
    if (status.isRunning && !e.sender.isDestroyed()) {
      const vc = getVirtualCamera()
      e.sender.send('vcam:start', { width: vc.width, height: vc.height, fps: vc.fps })
    }
    return status
  })
  ipcMain.handle('virtual-camera-stop', async (e) => {
    if (!e.sender.isDestroyed()) e.sender.send('vcam:stop')
    return getVirtualCamera().stop()
  })
  ipcMain.handle('virtual-camera-restart', async (e) => {
    const status = await getVirtualCamera().restart()
    if (status.isRunning && !e.sender.isDestroyed()) {
      const vc = getVirtualCamera()
      e.sender.send('vcam:start', { width: vc.width, height: vc.height, fps: vc.fps })
    }
    return status
  })
  ipcMain.handle('virtual-camera-verify', async () => {
    await getVirtualCamera().verifyOutput()
    return getVirtualCamera().getStatus()
  })
  ipcMain.handle('virtual-camera-status', async () => getVirtualCamera().getStatus())
  ipcMain.handle('virtual-camera-open-log', async () => {
    const file = macLogPath()
    if (!file) return false
    return (await shell.openPath(file)) === ''
  })
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
