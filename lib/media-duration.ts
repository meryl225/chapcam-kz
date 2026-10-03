import 'server-only'

// Lit la duree (secondes) d'un fichier MP4 / MOV / M4A (ISO BMFF) depuis l'atome
// moov/mvhd. Renvoie null pour les autres formats ou un fichier illisible :
// l'appelant facture alors la duree maximale autorisee.
export function readMediaDurationSeconds(bytes: Uint8Array): number | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)

  const findBox = (start: number, end: number, type: string): { body: number; end: number } | null => {
    let offset = start
    while (offset + 8 <= end) {
      let size = view.getUint32(offset)
      const name = String.fromCharCode(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7])
      let header = 8
      if (size === 1) {
        if (offset + 16 > end) return null
        size = Number(view.getBigUint64(offset + 8))
        header = 16
      } else if (size === 0) {
        size = end - offset
      }
      if (size < header || offset + size > end) return null
      if (name === type) return { body: offset + header, end: offset + size }
      offset += size
    }
    return null
  }

  try {
    const moov = findBox(0, bytes.byteLength, 'moov')
    if (!moov) return null
    const mvhd = findBox(moov.body, moov.end, 'mvhd')
    if (!mvhd) return null
    const version = bytes[mvhd.body]
    const timescale = version === 1 ? view.getUint32(mvhd.body + 20) : view.getUint32(mvhd.body + 12)
    const duration = version === 1 ? Number(view.getBigUint64(mvhd.body + 24)) : view.getUint32(mvhd.body + 16)
    if (!timescale || !Number.isFinite(duration) || duration <= 0) return null
    return duration / timescale
  } catch {
    return null
  }
}
