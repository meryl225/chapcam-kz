// Jetons de telechargement signes (HMAC) et a courte duree pour ChapCam PC.
//
// Objectif : ne JAMAIS exposer le lien de telechargement reel (Google Drive /
// Blob) au client. A la place, apres validation serveur de la cle de licence,
// on remet un lien vers /api/desktop/download?token=... ou le jeton :
//   - est signe cote serveur (impossible a forger sans le secret),
//   - expire vite (5 min) -> un lien partage devient vite inutilisable,
//   - est lie a la cle de licence -> revocable, et re-verifiable au download.
//
// A utiliser UNIQUEMENT cote serveur (le secret ne doit jamais fuiter au client).

import crypto from 'crypto'

// Duree de vie d'un jeton : volontairement courte pour limiter le repartage.
const TOKEN_TTL_MS = 5 * 60 * 1000 // 5 minutes

export type DownloadPlatform = 'win' | 'mac'

interface TokenPayload {
  p: DownloadPlatform
  k: string // cle de licence normalisee
  exp: number // expiration (epoch ms)
}

// Secret de signature. On privilegie une variable dediee, avec repli sur des
// secrets serveur deja presents (jamais exposes au client) pour fonctionner
// sans configuration supplementaire.
function getSecret(): string {
  const secret =
    process.env.DOWNLOAD_SIGNING_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.PAYDUNYA_MASTER_KEY ||
    ''
  if (!secret) {
    // Ne devrait pas arriver en prod (SERVICE_ROLE_KEY est toujours present).
    throw new Error('download-token: aucun secret de signature disponible')
  }
  return secret
}

function sign(body: string): string {
  return crypto.createHmac('sha256', getSecret()).update(body).digest('base64url')
}

// Fabrique un jeton signe pour une plateforme + une cle de licence donnee.
export function createDownloadToken(platform: DownloadPlatform, licenseKey: string): string {
  const payload: TokenPayload = {
    p: platform,
    k: licenseKey,
    exp: Date.now() + TOKEN_TTL_MS,
  }
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${body}.${sign(body)}`
}

// Verifie et decode un jeton. Retourne null si signature invalide ou expire.
export function verifyDownloadToken(token: string): TokenPayload | null {
  const parts = String(token || '').split('.')
  if (parts.length !== 2) return null
  const [body, sig] = parts

  // Comparaison a temps constant pour eviter les attaques par timing.
  const expected = sign(body)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as TokenPayload
    if (!payload || (payload.p !== 'win' && payload.p !== 'mac')) return null
    if (typeof payload.k !== 'string' || !payload.k) return null
    if (typeof payload.exp !== 'number' || Date.now() > payload.exp) return null
    return payload
  } catch {
    return null
  }
}
