// Genere un favicon.ico multi-tailles (16/32/48) a partir du logo ChapCam.
// L'ICO encapsule des PNG (supporte par tous les navigateurs modernes + Google).
import sharp from 'sharp'
import { writeFileSync } from 'node:fs'

const SRC = 'public/chapcam-icon.png'
const sizes = [16, 32, 48]

const pngs = []
for (const size of sizes) {
  const buf = await sharp(SRC)
    .resize(size, size, { fit: 'contain', background: { r: 10, g: 10, b: 10, alpha: 1 } })
    .png()
    .toBuffer()
  pngs.push({ size, buf })
}

// En-tete ICONDIR (6 octets)
const header = Buffer.alloc(6)
header.writeUInt16LE(0, 0) // reserved
header.writeUInt16LE(1, 2) // type = 1 (icone)
header.writeUInt16LE(pngs.length, 4) // nombre d'images

// Entrees ICONDIRENTRY (16 octets chacune)
const entries = []
let offset = 6 + pngs.length * 16
for (const { size, buf } of pngs) {
  const entry = Buffer.alloc(16)
  entry.writeUInt8(size >= 256 ? 0 : size, 0) // largeur
  entry.writeUInt8(size >= 256 ? 0 : size, 1) // hauteur
  entry.writeUInt8(0, 2) // palette
  entry.writeUInt8(0, 3) // reserved
  entry.writeUInt16LE(1, 4) // plans
  entry.writeUInt16LE(32, 6) // bits par pixel
  entry.writeUInt32LE(buf.length, 8) // taille des donnees
  entry.writeUInt32LE(offset, 12) // offset des donnees
  offset += buf.length
  entries.push(entry)
}

const ico = Buffer.concat([header, ...entries, ...pngs.map((p) => p.buf)])
writeFileSync('app/favicon.ico', ico)
console.log('[v0] app/favicon.ico genere:', ico.length, 'octets, tailles:', sizes.join('/'))
