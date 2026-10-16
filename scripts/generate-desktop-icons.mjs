// Generates every ChapCam Desktop icon from the official artwork only:
//   mobile/assets/icon.png          official app icon (shipped on the App Store)
//   mobile/assets/chapcam-symbol.png official transparent infinity symbol (tray)
// No redrawing: the artwork is only resized and clipped to each platform's
// standard icon shape. Run: node scripts/generate-desktop-icons.mjs
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const APP_ICON = path.join(root, 'mobile/assets/icon.png')
const SYMBOL = path.join(root, 'mobile/assets/chapcam-symbol.png')
const BUILD = path.join(root, 'electron/build')
const RUNTIME = path.join(root, 'electron/icons')
fs.mkdirSync(RUNTIME, { recursive: true })

// Shape on a 1024 canvas: macOS Big Sur grid (824 body, 100 margin), and a
// tighter Windows tile so small taskbar sizes stay legible.
async function shaped(canvas, body, radius) {
  const offset = Math.round((canvas - body) / 2)
  const mask = Buffer.from(
    `<svg width="${body}" height="${body}"><rect width="${body}" height="${body}" rx="${radius}" ry="${radius}"/></svg>`,
  )
  const art = await sharp(APP_ICON).resize(body, body, { kernel: 'lanczos3' }).ensureAlpha()
    .composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer()
  return sharp({ create: { width: canvas, height: canvas, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: art, left: offset, top: offset }]).png().toBuffer()
}

const png = (buf, size) => sharp(buf).resize(size, size, { kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toBuffer()

function icns(entries) {
  const chunks = entries.map(([type, data]) => {
    const head = Buffer.alloc(8)
    head.write(type, 0, 'ascii')
    head.writeUInt32BE(data.length + 8, 4)
    return Buffer.concat([head, data])
  })
  const body = Buffer.concat(chunks)
  const head = Buffer.alloc(8)
  head.write('icns', 0, 'ascii')
  head.writeUInt32BE(body.length + 8, 4)
  return Buffer.concat([head, body])
}

function ico(images) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)
  let offset = 6 + images.length * 16
  const dir = images.map(([size, data]) => {
    const e = Buffer.alloc(16)
    e.writeUInt8(size >= 256 ? 0 : size, 0)
    e.writeUInt8(size >= 256 ? 0 : size, 1)
    e.writeUInt16LE(1, 4)
    e.writeUInt16LE(32, 6)
    e.writeUInt32LE(data.length, 8)
    e.writeUInt32LE(offset, 12)
    offset += data.length
    return e
  })
  return Buffer.concat([header, ...dir, ...images.map(([, d]) => d)])
}

const mac = await shaped(1024, 824, 185)
const win = await shaped(1024, 960, 200)

const macSizes = { icp4: 16, icp5: 32, ic11: 32, ic12: 64, ic07: 128, ic13: 256, ic08: 256, ic14: 512, ic09: 512, ic10: 1024 }
const macEntries = []
for (const [type, size] of Object.entries(macSizes)) macEntries.push([type, await png(mac, size)])
fs.writeFileSync(path.join(BUILD, 'icon.icns'), icns(macEntries))
fs.writeFileSync(path.join(BUILD, 'icon.png'), await png(mac, 1024))

const winImages = []
for (const size of [16, 20, 24, 32, 40, 48, 64, 128, 256]) winImages.push([size, await png(win, size)])
const winIco = ico(winImages)
fs.writeFileSync(path.join(BUILD, 'icon.ico'), winIco)
fs.writeFileSync(path.join(RUNTIME, 'icon.ico'), winIco)
fs.writeFileSync(path.join(RUNTIME, 'icon.png'), await png(mac, 512))

const symbol = await sharp(SYMBOL).trim().png().toBuffer()
for (const [suffix, size] of [['', 16], ['@1.5x', 24], ['@2x', 32]]) {
  const out = await sharp(symbol)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' })
    .png().toBuffer()
  fs.writeFileSync(path.join(RUNTIME, `tray${suffix}.png`), out)
}

console.log('ChapCam desktop icons generated from', path.relative(root, APP_ICON), 'and', path.relative(root, SYMBOL))
