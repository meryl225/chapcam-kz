// Embeds the pre-signed Core Media IO camera extension into
// ChapCam.app/Contents/Library/SystemExtensions before electron-builder signs
// the app. `mac.signIgnore` keeps electron-builder from re-signing it with the
// app entitlements.
const fs = require('fs')
const path = require('path')

const EXTENSION = 'com.chapcam.desktop.camera-extension.systemextension'

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return

  const source = path.join(context.packager.projectDir, 'resources', 'vcam', 'mac-extension', EXTENSION)
  if (!fs.existsSync(source)) {
    throw new Error(`Camera extension missing: ${source}. Run native/macos/build.sh first.`)
  }

  const appBundle = `${context.packager.appInfo.productFilename}.app`
  const destination = path.join(context.appOutDir, appBundle, 'Contents', 'Library', 'SystemExtensions', EXTENSION)
  fs.rmSync(destination, { recursive: true, force: true })
  fs.mkdirSync(path.dirname(destination), { recursive: true })
  fs.cpSync(source, destination, { recursive: true, verbatimSymlinks: true })
  console.log(`  • embedded camera extension  ${destination}`)
}
