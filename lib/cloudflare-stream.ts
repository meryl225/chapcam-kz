import 'server-only'
import crypto from 'node:crypto'
import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

// ============================================================
// Cloudflare Stream : couche de LECTURE video (streaming adaptatif HLS).
//
// Pourquoi : servir des MP4 complets depuis un stockage de fichiers (Blob) est
// lent sur mobile/3G, sans adaptation de qualite, et se heurte aux limites de
// taille des fonctions serverless. Cloudflare Stream transcode chaque video en
// HLS multi-qualite, la sert depuis son CDN mondial, et gere nativement iOS.
//
// Confidentialite : chaque video est en `requireSignedURLs`, donc la lecture
// exige un jeton JWT signe (genere cote serveur, courte duree). Sans jeton, le
// CDN renvoie 403.
//
// Le master original reste dans le Blob prive (source de telechargement + filet
// de securite). Stream ne sert QUE la lecture.
// ============================================================

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN
const API_BASE = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/stream`

function authHeaders(): Record<string, string> {
  if (!ACCOUNT_ID || !API_TOKEN) {
    throw new Error('CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN manquants')
  }
  return { Authorization: `Bearer ${API_TOKEN}` }
}

// -------------------- Client Neon (partage) --------------------
let _client: NeonQueryFunction<false, false> | null = null
function getClient(): NeonQueryFunction<false, false> {
  if (!_client) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL is not set')
    _client = neon(url)
  }
  return _client
}
const sql: NeonQueryFunction<false, false> = ((...args: unknown[]) =>
  // @ts-expect-error — relais transparent vers le client Neon (tagged template).
  getClient()(...args)) as NeonQueryFunction<false, false>

// -------------------- Cle de signature (persistee) --------------------
interface SigningKey {
  id: string
  pem: string
}
let _keyCache: SigningKey | null = null

/**
 * Recupere la cle de signature RSA depuis app_secrets (creee au setup). En
 * dernier recours, en cree une nouvelle via l'API et la persiste. Mise en cache
 * en memoire pour eviter un aller-retour DB a chaque signature.
 */
async function getSigningKey(): Promise<SigningKey> {
  if (_keyCache) return _keyCache
  const rows = (await sql`
    SELECT value FROM app_secrets WHERE name = 'cf_stream_signing_key' LIMIT 1
  `) as { value: string }[]
  if (rows.length > 0) {
    _keyCache = JSON.parse(rows[0].value) as SigningKey
    return _keyCache
  }
  // Creation a la volee si absente.
  const res = await fetch(`${API_BASE}/keys`, { method: 'POST', headers: authHeaders() })
  const json = await res.json()
  if (!json.success) {
    throw new Error(`Creation cle Stream echouee: ${JSON.stringify(json.errors)}`)
  }
  const key: SigningKey = {
    id: json.result.id,
    // Cloudflare renvoie le PEM encode en base64.
    pem: Buffer.from(json.result.pem, 'base64').toString('utf8'),
  }
  await sql`
    INSERT INTO app_secrets (name, value) VALUES ('cf_stream_signing_key', ${JSON.stringify(key)})
    ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value
  `
  _keyCache = key
  return key
}

// -------------------- Code client (sous-domaine CDN) --------------------
let _customerCode: string | null = null
async function getCustomerCode(): Promise<string | null> {
  if (_customerCode) return _customerCode
  const rows = (await sql`
    SELECT value FROM app_secrets WHERE name = 'cf_stream_customer_code' LIMIT 1
  `) as { value: string }[]
  if (rows.length > 0) {
    _customerCode = rows[0].value
    return _customerCode
  }
  return null
}
async function saveCustomerCode(code: string): Promise<void> {
  if (!code || _customerCode === code) return
  _customerCode = code
  await sql`
    INSERT INTO app_secrets (name, value) VALUES ('cf_stream_customer_code', ${code})
    ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value
  `.catch(() => {})
}

// -------------------- Copie depuis une URL --------------------
export interface CopyResult {
  uid: string
  customerCode: string | null
}

/**
 * Demande a Cloudflare Stream d'ASPIRER une video depuis une URL publiquement
 * accessible (URL fournisseur signee, ou blob presigne). Cloudflare telecharge
 * et transcode en HLS de maniere asynchrone. `requireSignedURLs: true` protege
 * la lecture. Retourne l'uid Stream (a stocker) tout de suite, sans attendre la
 * fin du transcodage.
 */
export async function copyUrlToStream(url: string, name: string): Promise<CopyResult> {
  const res = await fetch(`${API_BASE}/copy`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      meta: { name: name.slice(0, 120) },
      requireSignedURLs: true,
    }),
  })
  const json = await res.json()
  if (!json.success) {
    throw new Error(`Stream copy echouee: ${JSON.stringify(json.errors)}`)
  }
  const uid: string = json.result.uid
  const hls: string = json.result.playback?.hls || ''
  const customerCode = (hls.match(/customer-([a-z0-9]+)\./) || [])[1] || null
  if (customerCode) await saveCustomerCode(customerCode)
  return { uid, customerCode }
}

// -------------------- Etat / suppression --------------------
export async function getStreamState(
  uid: string,
): Promise<{ ready: boolean; state: string }> {
  const res = await fetch(`${API_BASE}/${uid}`, { headers: authHeaders() })
  const json = await res.json()
  if (!json.success) return { ready: false, state: 'error' }
  return {
    ready: Boolean(json.result?.readyToStream),
    state: String(json.result?.status?.state || 'unknown'),
  }
}

export async function deleteStream(uid: string): Promise<void> {
  await fetch(`${API_BASE}/${uid}`, { method: 'DELETE', headers: authHeaders() }).catch(
    () => {},
  )
}

// -------------------- Signature de jeton (JWT RS256, local) --------------------
function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

/**
 * Genere un jeton signe court (par defaut 4h) autorisant la lecture d'UNE video
 * Stream donnee. Signature RS256 locale (aucun appel reseau) -> tres rapide,
 * adapte a une galerie de dizaines de videos.
 */
export async function signStreamToken(uid: string, ttlSeconds = 4 * 3600): Promise<string> {
  const key = await getSigningKey()
  const header = { alg: 'RS256', kid: key.id }
  const payload = {
    sub: uid,
    kid: key.id,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
    // Restreint le jeton a CETTE video (defense en profondeur).
  }
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`
  const privateKey = crypto.createPrivateKey({ key: key.pem, format: 'pem' })
  const signature = crypto.sign('RSA-SHA256', Buffer.from(signingInput), privateKey)
  return `${signingInput}.${b64url(signature)}`
}

// -------------------- Construction des URLs de lecture --------------------
export interface StreamUrls {
  /** Player HTML complet (HLS adaptatif, controles, iOS) a mettre dans une iframe. */
  iframe: string
  /** Manifest HLS (si on veut un <video> + hls.js). */
  hls: string | null
  /** Miniature (premiere image) signee. */
  thumbnail: string | null
}

/**
 * Construit les URLs de lecture pour une video Stream a partir d'un jeton signe.
 * L'iframe ne depend pas du code client ; HLS et thumbnail utilisent le
 * sous-domaine `customer-<code>`.
 */
export function buildStreamUrls(token: string, customerCode: string | null): StreamUrls {
  const iframe = `https://iframe.cloudflarestream.com/${token}?preload=metadata`
  if (!customerCode) return { iframe, hls: null, thumbnail: null }
  const cdn = `https://customer-${customerCode}.cloudflarestream.com/${token}`
  return {
    iframe,
    hls: `${cdn}/manifest/video.m3u8`,
    thumbnail: `${cdn}/thumbnails/thumbnail.jpg?height=640`,
  }
}

/**
 * Raccourci : signe un jeton et renvoie directement les URLs de lecture.
 * `customerCode` peut etre fourni (colonne stockee) ou lu depuis app_secrets.
 */
export async function getSignedStreamUrls(
  uid: string,
  customerCode?: string | null,
): Promise<StreamUrls> {
  const token = await signStreamToken(uid)
  const code = customerCode || (await getCustomerCode())
  return buildStreamUrls(token, code)
}
