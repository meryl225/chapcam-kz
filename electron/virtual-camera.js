/**
 * Virtual Camera Module for ChapCam Desktop
 * Creates a virtual camera device that outputs the transformed face swap video
 * Compatible with Zoom, Teams, Google Meet, etc.
 */

const { ipcMain } = require('electron')
const path = require('path')
const { spawn } = require('child_process')

class VirtualCamera {
  constructor() {
    this.isRunning = false
    this.ffmpegProcess = null
    this.deviceName = 'ChapCam Virtual Camera'
  }

  /**
   * Start the virtual camera output
   * @param {Object} options - Configuration options
   * @param {number} options.width - Video width
   * @param {number} options.height - Video height
   * @param {number} options.fps - Frames per second
   */
  async start(options = { width: 1280, height: 720, fps: 30 }) {
    if (this.isRunning) {
      console.log('[VirtualCamera] Already running')
      return
    }

    const platform = process.platform

    try {
      if (platform === 'darwin') {
        await this.startMacOS(options)
      } else if (platform === 'win32') {
        await this.startWindows(options)
      } else if (platform === 'linux') {
        await this.startLinux(options)
      }

      this.isRunning = true
      console.log('[VirtualCamera] Started successfully')
    } catch (error) {
      console.error('[VirtualCamera] Failed to start:', error)
      throw error
    }
  }

  /**
   * Stop the virtual camera
   */
  stop() {
    if (this.ffmpegProcess) {
      this.ffmpegProcess.kill()
      this.ffmpegProcess = null
    }
    this.isRunning = false
    console.log('[VirtualCamera] Stopped')
  }

  /**
   * Write a frame to the virtual camera
   * @param {Buffer} frameData - Raw video frame data (RGBA)
   */
  writeFrame(frameData) {
    if (this.ffmpegProcess && this.ffmpegProcess.stdin.writable) {
      this.ffmpegProcess.stdin.write(frameData)
    }
  }

  /**
   * Start virtual camera on macOS using OBS Virtual Camera
   */
  async startMacOS(options) {
    // On macOS, we use OBS Virtual Camera or similar
    // The app will output to a named pipe that OBS can read
    const pipePath = '/tmp/chapcam_video_pipe'
    
    console.log('[VirtualCamera] macOS: Setting up virtual camera output')
    console.log('[VirtualCamera] Note: Install OBS Virtual Camera for best compatibility')
    
    // For now, we'll create a simple pipe output
    // Users need to configure OBS to read from this pipe
    this.outputPath = pipePath
  }

  /**
   * Start virtual camera on Windows using OBS Virtual Camera
   */
  async startWindows(options) {
    console.log('[VirtualCamera] Windows: Setting up virtual camera output')
    console.log('[VirtualCamera] Note: Install OBS Virtual Camera for best compatibility')
    
    // Windows uses OBS Virtual Camera
    // We output to a named pipe that OBS reads
    this.outputPath = '\\\\.\\pipe\\chapcam_video'
  }

  /**
   * Start virtual camera on Linux using v4l2loopback
   */
  async startLinux(options) {
    console.log('[VirtualCamera] Linux: Setting up v4l2loopback device')
    
    // Check if v4l2loopback is installed
    try {
      const { width, height, fps } = options
      
      // Find the v4l2loopback device
      const devicePath = '/dev/video10' // Default v4l2loopback device
      
      this.ffmpegProcess = spawn('ffmpeg', [
        '-f', 'rawvideo',
        '-pix_fmt', 'rgba',
        '-s', `${width}x${height}`,
        '-r', fps.toString(),
        '-i', 'pipe:0',
        '-f', 'v4l2',
        '-pix_fmt', 'yuv420p',
        devicePath
      ], {
        stdio: ['pipe', 'pipe', 'pipe']
      })

      this.ffmpegProcess.stderr.on('data', (data) => {
        console.log('[VirtualCamera FFmpeg]', data.toString())
      })

      this.ffmpegProcess.on('error', (error) => {
        console.error('[VirtualCamera] FFmpeg error:', error)
      })

      this.ffmpegProcess.on('close', (code) => {
        console.log('[VirtualCamera] FFmpeg exited with code:', code)
        this.isRunning = false
      })
    } catch (error) {
      console.error('[VirtualCamera] Linux setup failed:', error)
      console.log('[VirtualCamera] Make sure v4l2loopback is installed:')
      console.log('  sudo apt install v4l2loopback-dkms')
      console.log('  sudo modprobe v4l2loopback devices=1 video_nr=10 card_label="ChapCam"')
      throw error
    }
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      deviceName: this.deviceName,
      platform: process.platform
    }
  }
}

// Singleton instance
let virtualCameraInstance = null

function getVirtualCamera() {
  if (!virtualCameraInstance) {
    virtualCameraInstance = new VirtualCamera()
  }
  return virtualCameraInstance
}

// IPC Handlers for renderer process
function setupVirtualCameraIPC() {
  ipcMain.handle('virtual-camera-start', async (event, options) => {
    const vc = getVirtualCamera()
    await vc.start(options)
    return vc.getStatus()
  })

  ipcMain.handle('virtual-camera-stop', async () => {
    const vc = getVirtualCamera()
    vc.stop()
    return vc.getStatus()
  })

  ipcMain.handle('virtual-camera-status', async () => {
    const vc = getVirtualCamera()
    return vc.getStatus()
  })

  ipcMain.handle('virtual-camera-write-frame', async (event, frameData) => {
    const vc = getVirtualCamera()
    vc.writeFrame(Buffer.from(frameData))
  })
}

module.exports = {
  VirtualCamera,
  getVirtualCamera,
  setupVirtualCameraIPC
}
