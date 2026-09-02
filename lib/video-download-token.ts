import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'

// ============================================================
// Jeton de telechargement SIGNE (HMAC-SHA256), courte duree.
//
// Pourquoi : sur iPhone/Android, le clic "Telecharger" est souvent pris en
// charge par le GESTIONNAIRE DE TELECHARGEMENT du systeme, qui refait la
// requete lui-meme, parfois SANS les cookies de session. Une route protegee
// uniquement par cookie repond alors 401/404 et le gestionnaire enregistre le
// corps de l'erreur ("Introuvable") sous le nom du fichier .mp4 -> c'est
// exactement le bug constate sur iOS Safari.
//
// Solution : l'autorisation est portee PAR L'URL (jeton signe, 10 min), pas
// par le cookie. Le jeton n'autorise qu'UN fichier precis pour UN utilisateur
// precis, et ne contient que le CHEMIN PERMANENT du blob (jamais une URL
// signee). La signed URL du storage est regeneree au moment du telechargement.
// ============================================================

export const DOWNLOAD_TOKEN_TTL_MS = 10 * 60 * 1000 // 10 minutes

export interface DownloadTokenPayload {
  /** Chemin PERMANENT du blob (videos/<user>/<tool>/<ref>-<ts>.mp4) */
  p: string
  /** Id utilisateur proprietaire */
  u: string
  /** Nom de fichier final propose au navigateur (termine par .mp4) */
  f: string
  /** Expiration (ms epoch) */
  e: number
}

function secret(): string {
  // Cle HMAC : on reutilise un secret serveur deja present dans le projet.
  // (Jamais expose au client ; sert uniquement a signer/verifier le jeton.)
  const s =
    process.env.VIDEO_DOWNLOAD_SECRET ||
    process.env.JWT ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.BLOB_READ_WRITE_TOKEN
  if (!s) throw new Error('Aucun secret disponible pour signer les jetons de telechargement')
  return s
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url')
}

function sign(data: string): string {
  return createHmac('sha256', secret()).update(data).digest('base64url')
}

/** Cree un jeton signe pour telecharger `pathname` au nom de `userId`. */
export function createDownloadToken(input: {
  pathname: string
  userId: string
  filename: string
  ttlMs?: number
}): string {
  const payload: DownloadTokenPayload = {
    p: input.pathname,
    u: input.userId,
    f: input.filename,
    e: Date.now() + (input.ttlMs ?? DOWNLOAD_TOKEN_TTL_MS),
  }
  const data = b64url(JSON.stringify(payload))
  return `${data}.${sign(data)}`
}

export type VerifyResult =
  | { ok: true; payload: DownloadTokenPayload }
  | { ok: false; reason: 'malformed' | 'bad_signature' | 'expired' }

/** Verifie un jeton (signature + expiration) et renvoie sa charge utile. */
export function verifyDownloadToken(token: string): VerifyResult {
  const parts = token.split('.')
  if (parts.length !== 2 || !parts[0] || !parts[1]) return { ok: false, reason: 'malformed' }
  const [data, sig] = parts

  const expected = sign(data)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, reason: 'bad_signature' }

  let payload: DownloadTokenPayload
  try {
    payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'))
  } catch {
    return { ok: false, reason: 'malformed' }
  }
  if (
    typeof payload?.p !== 'string' ||
    typeof payload?.u !== 'string' ||
    typeof payload?.f !== 'string' ||
    typeof payload?.e !== 'number'
  ) {
    return { ok: false, reason: 'malformed' }
  }
  if (Date.now() > payload.e) return { ok: false, reason: 'expired' }
  return { ok: true, payload }
}

/**
 * Nom de fichier de telechargement : ASCII sur, unique, TOUJOURS termine par
 * l'extension reelle du fichier (.mp4 ou .webm).
 * Ex : chapcam-photo_video-20260902-82b58b1d.mp4
 */
export function buildDownloadFilename(input: {
  tool: string
  id: string
  createdAt?: string | Date | null
  pathname: string
}): string {
  const ext = /\.webm$/i.test(input.pathname) ? 'webm' : 'mp4'
  const d = input.createdAt ? new Date(input.createdAt) : new Date()
  const ymd = Number.isNaN(d.getTime())
    ? ''
    : `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  const tool = input.tool.replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'video'
  const short = input.id.replace(/[^a-z0-9]/gi, '').slice(0, 8) || 'video'
  return `chapcam-${tool}${ymd ? `-${ymd}` : ''}-${short}.${ext}`
}
