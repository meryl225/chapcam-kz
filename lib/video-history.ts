import 'server-only'
import { neon, type NeonQueryFunction } from '@neondatabase/serverless'
import { put, del } from '@vercel/blob'

// ============================================================
// Historique PERMANENT des videos generees par les outils IA
// (Studio Photo en Video, Motion, Traduction Video).
//
// PROBLEME resolu : les URLs renvoyees par HeyGen/fal EXPIRENT (souvent ~7
// jours). Stocker seulement l'URL fournisseur donne un historique qui casse.
// On RE-HEBERGE donc chaque video terminee dans Vercel Blob (store prive), et
// on conserve le pathname Blob durable dans Neon. Les videos restent alors
// accessibles indefiniment via une route authentifiee.
// ============================================================

export type VideoTool = 'photo_video' | 'motion' | 'translation'

export interface VideoHistoryItem {
  id: string
  tool: VideoTool
  // Reference fournisseur (video_id HeyGen / translation id) : sert a re-heberger
  // a la demande une video dont le blob manque mais encore valide chez HeyGen.
  provider_ref: string | null
  // Chemin du blob prive (a servir via /api/videos/file?pathname=...).
  blob_pathname: string | null
  // Miniature optionnelle (URL directe fournisseur, non critique si elle expire).
  thumbnail_url: string | null
  // UID Cloudflare Stream (lecture HLS adaptative) + sous-domaine CDN du compte.
  // Present des que la video a ete aspiree dans Stream ; le master Blob reste la
  // source de telechargement.
  stream_uid: string | null
  stream_customer_code: string | null
  title: string
  status: 'processing' | 'completed' | 'failed'
  created_at: string
}

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
  // @ts-expect-error — relais transparent vers le client Neon (tagged template + appels).
  getClient()(...args)) as NeonQueryFunction<false, false>

let _ensured = false
async function ensureTable(): Promise<void> {
  if (_ensured) return
  await sql`
    CREATE TABLE IF NOT EXISTS video_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL,
      tool TEXT NOT NULL,
      -- Reference cote fournisseur (video_id HeyGen, translation id, request_id fal)
      -- pour eviter les doublons si la meme generation est enregistree 2x.
      provider_ref TEXT,
      blob_pathname TEXT,
      thumbnail_url TEXT,
      title TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'completed',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `
  // Cout en credits de la generation (1 = Rapide, 2 = Precision pour la
  // traduction). Sert a rembourser le MONTANT EXACT si la generation echoue
  // apres deduction. Ajoute a la volee pour les tables deja existantes.
  await sql`ALTER TABLE video_history ADD COLUMN IF NOT EXISTS credits_cost INTEGER`
  // Verrou anti-concurrence du re-hebergement : quand le client poll toutes les
  // 5s, plusieurs requetes pourraient telecharger la MEME video en parallele.
  // `rehost_claimed_at` = derniere reservation ; `rehost_attempts` = nombre de
  // tentatives (borne le fallback "URL fournisseur" en dernier recours).
  await sql`ALTER TABLE video_history ADD COLUMN IF NOT EXISTS rehost_claimed_at TIMESTAMPTZ`
  await sql`ALTER TABLE video_history ADD COLUMN IF NOT EXISTS rehost_attempts INTEGER NOT NULL DEFAULT 0`
  await sql`CREATE INDEX IF NOT EXISTS video_history_user_idx ON video_history (user_id, created_at DESC)`
  // Un provider_ref donne n'est enregistre qu'une fois par utilisateur.
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS video_history_ref_idx ON video_history (user_id, tool, provider_ref)`
  _ensured = true
}

/**
 * Telecharge une video depuis une URL fournisseur (HeyGen/fal) et la re-heberge
 * dans le store Blob PRIVE. Retourne le pathname durable, ou null en cas d'echec.
 * Non bloquant pour l'appelant : en cas d'erreur, on renvoie null et on garde
 * quand meme une entree d'historique (statut completed sans blob).
 */
export async function rehostToBlob(
  remoteUrl: string,
  userId: string,
  tool: VideoTool,
  ref: string,
): Promise<string | null> {
  // Jusqu'a 3 tentatives : les echecs sont le plus souvent TRANSITOIRES
  // (coupure reseau, lenteur HeyGen, timeout Blob). Sans retry, un simple hoquet
  // laissait une ligne "completed" SANS fichier -> "Video expiree" definitive.
  // On telecharge en memoire (buffer) pour pouvoir re-tenter l'upload sans
  // re-telecharger inutilement quand seule l'etape "put" a echoue.
  const MAX_ATTEMPTS = 3
  let lastError: unknown = null

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(remoteUrl)
      if (!res.ok) {
        // 404/410 = la source n'existe plus : inutile de reessayer.
        if (res.status === 404 || res.status === 410) {
          console.error('[video-history] Source introuvable (definitif):', res.status)
          return null
        }
        throw new Error(`Telechargement source HTTP ${res.status}`)
      }
      // CONTENT-TYPE NORMALISE : le CDN source renvoie parfois un type generique
      // (`binary/octet-stream`) ou vide. On ne le stocke JAMAIS tel quel car
      // Safari iOS refuse alors de lire la video (ecran noir). On force un type
      // `video/*` fiable deduit du type source ou de l'URL.
      const rawType = res.headers.get('content-type') || ''
      const isWebm = rawType.includes('webm') || /\.webm(\?|$)/i.test(remoteUrl)
      const contentType = isWebm ? 'video/webm' : 'video/mp4'
      const ext = isWebm ? 'webm' : 'mp4'
      // Buffer complet : garantit un upload fiable (taille connue) et evite les
      // flux interrompus a mi-chemin.
      const buffer = Buffer.from(await res.arrayBuffer())
      if (buffer.byteLength === 0) throw new Error('Corps de la video vide')

      // Chemin lisible et unique : videos/<user>/<tool>/<ref>-<ts>.<ext>
      const safeRef = ref.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'video'
      const pathname = `videos/${userId}/${tool}/${safeRef}-${Date.now()}.${ext}`
      const blob = await put(pathname, buffer, {
        access: 'private',
        contentType,
      })
      return blob.pathname
    } catch (err) {
      lastError = err
      console.error(
        `[video-history] Re-hebergement Blob echoue (tentative ${attempt}/${MAX_ATTEMPTS}):`,
        err,
      )
      // Backoff progressif entre les tentatives (0.5s, 1s), sauf apres la derniere.
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 500 * attempt))
      }
    }
  }

  console.error('[video-history] Re-hebergement Blob abandonne apres retries:', lastError)
  return null
}

/**
 * Enregistre (ou met a jour) une generation terminee dans l'historique.
 * Idempotent par (user, tool, provider_ref) : re-appeler ne cree pas de doublon.
 */
export async function saveVideoHistory(input: {
  userId: string
  tool: VideoTool
  providerRef: string
  blobPathname: string | null
  thumbnailUrl?: string | null
  title?: string
  status?: 'processing' | 'completed' | 'failed'
  // Cout en credits deduit pour cette generation (permet un remboursement exact
  // en cas d'echec ulterieur). Conserve tel quel si non fourni lors d'un update.
  creditsCost?: number | null
}): Promise<void> {
  await ensureTable()
  await sql`
    INSERT INTO video_history (user_id, tool, provider_ref, blob_pathname, thumbnail_url, title, status, credits_cost)
    VALUES (
      ${input.userId}, ${input.tool}, ${input.providerRef},
      ${input.blobPathname}, ${input.thumbnailUrl ?? null},
      ${input.title ?? ''}, ${input.status ?? 'completed'}, ${input.creditsCost ?? null}
    )
    ON CONFLICT (user_id, tool, provider_ref)
    DO UPDATE SET
      blob_pathname = COALESCE(EXCLUDED.blob_pathname, video_history.blob_pathname),
      thumbnail_url = COALESCE(EXCLUDED.thumbnail_url, video_history.thumbnail_url),
      title = COALESCE(NULLIF(EXCLUDED.title, ''), video_history.title),
      credits_cost = COALESCE(video_history.credits_cost, EXCLUDED.credits_cost),
      status = EXCLUDED.status
  `
}

// Construit l'URL de service privee a partir d'un pathname Blob.
function fileUrl(pathname: string): string {
  return `/api/videos/file?pathname=${encodeURIComponent(pathname)}`
}

// Nombre max de tentatives de re-hebergement avant de servir, EN DERNIER
// RECOURS, l'URL fournisseur (encore valide un temps) pour ne pas laisser
// l'utilisateur bloque sur un spinner si le Blob refuse obstinement.
const MAX_REHOST_ATTEMPTS = 6

/**
 * Resultat de finalisation d'une video terminee cote fournisseur :
 *  - ready    : copie Blob PERMANENTE prete -> `url` = route de service privee.
 *  - pending  : pas encore de copie permanente -> le client doit continuer a
 *               interroger le statut (on reessaiera au prochain poll).
 *  - fallback : le re-hebergement a echoue trop de fois -> on sert `url` =
 *               l'URL fournisseur (temporaire) pour ne pas bloquer l'utilisateur.
 */
export type FinalizeResult =
  | { state: 'ready'; url: string }
  | { state: 'pending' }
  | { state: 'fallback'; url: string }

/**
 * "Reserve" le re-hebergement d'une generation pour eviter que plusieurs polls
 * simultanes telechargent la meme video en parallele. Cree la ligne
 * d'historique (statut processing) si elle n'existe pas encore, puis tente une
 * reservation ATOMIQUE : succes si aucun blob et si aucune reservation recente.
 * Retourne le verrou obtenu + le nombre de tentatives deja effectuees.
 */
async function claimRehostSlot(
  userId: string,
  tool: VideoTool,
  providerRef: string,
  title: string,
  staleSeconds = 45,
): Promise<{ claimed: boolean; attempts: number }> {
  await ensureTable()
  // Garantir qu'une ligne existe (sans jamais ecraser un etat existant).
  await sql`
    INSERT INTO video_history (user_id, tool, provider_ref, blob_pathname, title, status)
    VALUES (${userId}, ${tool}, ${providerRef}, NULL, ${title}, 'processing')
    ON CONFLICT (user_id, tool, provider_ref) DO NOTHING
  `
  // Reservation atomique : un seul poll passe a la fois (verrou expirant).
  const rows = (await sql`
    UPDATE video_history
    SET rehost_claimed_at = now(), rehost_attempts = COALESCE(rehost_attempts, 0) + 1
    WHERE user_id = ${userId} AND tool = ${tool} AND provider_ref = ${providerRef}
      AND blob_pathname IS NULL
      AND (rehost_claimed_at IS NULL OR rehost_claimed_at < now() - make_interval(secs => ${staleSeconds}))
    RETURNING COALESCE(rehost_attempts, 0) AS attempts
  `) as { attempts: number }[]
  if (rows.length > 0) return { claimed: true, attempts: Number(rows[0].attempts) }
  // Pas de verrou : soit un autre poll s'en occupe, soit trop recent. On
  // renvoie le compteur courant pour la logique de dernier recours.
  const cur = (await sql`
    SELECT COALESCE(rehost_attempts, 0) AS attempts FROM video_history
    WHERE user_id = ${userId} AND tool = ${tool} AND provider_ref = ${providerRef}
    LIMIT 1
  `) as { attempts: number }[]
  return { claimed: false, attempts: cur.length ? Number(cur[0].attempts) : 0 }
}

// Libere le verrou apres un echec pour permettre une nouvelle tentative rapide.
async function clearRehostClaim(userId: string, tool: VideoTool, providerRef: string): Promise<void> {
  await ensureTable()
  await sql`
    UPDATE video_history SET rehost_claimed_at = NULL
    WHERE user_id = ${userId} AND tool = ${tool} AND provider_ref = ${providerRef}
      AND blob_pathname IS NULL
  `
}

/**
 * Finalise une generation terminee cote fournisseur en GARANTISSANT une copie
 * permanente dans le Blob avant de declarer "completed" au client. C'est le
 * coeur du correctif : on ne renvoie plus jamais une URL fournisseur ephemere
 * comme resultat "definitif" (ce qui donnait des videos "expirees" illisibles).
 *
 * Concurrence : protege par un verrou (claimRehostSlot) pour ne pas telecharger
 * la meme video en parallele a chaque poll (5s). Best-effort : ne jette jamais.
 */
export async function finalizeCompletedVideo(input: {
  userId: string
  tool: VideoTool
  providerRef: string
  providerUrl: string
  title: string
  thumbnailUrl?: string | null
  creditsCost?: number | null
}): Promise<FinalizeResult> {
  await ensureTable()
  const { userId, tool, providerRef, providerUrl, title, thumbnailUrl, creditsCost } = input

  // 1) Copie permanente deja presente ? (idempotent : polls suivants / webhook)
  const existing = (await sql`
    SELECT blob_pathname FROM video_history
    WHERE user_id = ${userId} AND tool = ${tool} AND provider_ref = ${providerRef}
      AND blob_pathname IS NOT NULL
    LIMIT 1
  `) as { blob_pathname: string }[]
  if (existing.length > 0) return { state: 'ready', url: fileUrl(existing[0].blob_pathname) }

  // 2) Verrou anti-concurrence.
  const claim = await claimRehostSlot(userId, tool, providerRef, title)
  if (!claim.claimed) {
    // Un autre poll re-heberge deja, OU tentatives epuisees -> dernier recours.
    if (claim.attempts >= MAX_REHOST_ATTEMPTS) return { state: 'fallback', url: providerUrl }
    return { state: 'pending' }
  }

  // 3) Re-hebergement (telechargement + upload Blob, avec retries internes).
  const pathname = await rehostToBlob(providerUrl, userId, tool, providerRef)
  if (!pathname) {
    await clearRehostClaim(userId, tool, providerRef).catch(() => {})
    if (claim.attempts >= MAX_REHOST_ATTEMPTS) return { state: 'fallback', url: providerUrl }
    return { state: 'pending' }
  }

  // 4) Copie permanente OK -> enregistrer "completed" (idempotent).
  await saveVideoHistory({
    userId,
    tool,
    providerRef,
    blobPathname: pathname,
    thumbnailUrl: thumbnailUrl ?? null,
    title,
    status: 'completed',
    creditsCost: creditsCost ?? null,
  })
  return { state: 'ready', url: fileUrl(pathname) }
}

/**
 * Marque une generation comme "failed" de maniere ATOMIQUE et IDEMPOTENTE, et
 * renvoie le cout en credits a rembourser (0 si deja traitee ou introuvable).
 *
 * Pourquoi : le handler de statut est appele en boucle par le client. On veut
 * rembourser le credit EXACTEMENT UNE FOIS quand une traduction bascule en
 * echec. La clause `status = 'processing'` garantit qu'un seul poll effectue la
 * transition -> les polls suivants voient deja 'failed' et ne remboursent pas.
 * On ne touche jamais une generation 'completed'.
 */
export async function failGenerationAndGetRefund(
  userId: string,
  tool: VideoTool,
  providerRef: string,
): Promise<number> {
  await ensureTable()
  const rows = (await sql`
    UPDATE video_history
    SET status = 'failed'
    WHERE user_id = ${userId} AND tool = ${tool}
      AND provider_ref = ${providerRef} AND status = 'processing'
    RETURNING COALESCE(credits_cost, 0) AS credits_cost
  `) as { credits_cost: number }[]
  return rows.length > 0 ? Number(rows[0].credits_cost) : 0
}

/**
 * Retrouve l'utilisateur proprietaire d'une generation a partir de sa reference
 * fournisseur (video_id HeyGen / translation id). INDISPENSABLE pour les
 * webhooks HeyGen : la notification serveur-a-serveur n'a AUCUNE session, on ne
 * peut donc pas utiliser supabase.auth.getUser(). Comme une ligne "processing"
 * est enregistree a la creation (avec le user_id), on remonte au proprietaire.
 * provider_ref est unique cote HeyGen -> au plus un utilisateur.
 */
export async function findUserByProviderRef(
  tool: VideoTool,
  providerRef: string,
): Promise<string | null> {
  await ensureTable()
  const rows = (await sql`
    SELECT user_id FROM video_history
    WHERE tool = ${tool} AND provider_ref = ${providerRef}
    LIMIT 1
  `) as { user_id: string }[]
  return rows.length > 0 ? String(rows[0].user_id) : null
}

/**
 * Verifie qu'un provider_ref est deja enregistre AVEC un blob pour cet
 * utilisateur (permet d'eviter de re-heberger la meme video a chaque poll).
 */
export async function isAlreadyRehosted(
  userId: string,
  tool: VideoTool,
  providerRef: string,
): Promise<boolean> {
  await ensureTable()
  const rows = (await sql`
    SELECT 1 FROM video_history
    WHERE user_id = ${userId} AND tool = ${tool}
      AND provider_ref = ${providerRef} AND blob_pathname IS NOT NULL
    LIMIT 1
  `) as unknown[]
  return rows.length > 0
}

/**
 * Supprime une entree d'historique appartenant a l'utilisateur : on efface la
 * video du store Blob prive PUIS la ligne Neon. La verification user_id garantit
 * qu'on ne peut pas supprimer la video d'un autre compte. Retourne true si une
 * ligne a bien ete supprimee.
 */
export async function deleteVideoHistory(
  userId: string,
  id: string,
): Promise<boolean> {
  await ensureTable()
  // 1) Recuperer le blob a supprimer, en s'assurant qu'il appartient a l'utilisateur.
  const rows = (await sql`
    SELECT blob_pathname FROM video_history
    WHERE id = ${id} AND user_id = ${userId}
    LIMIT 1
  `) as { blob_pathname: string | null }[]
  if (rows.length === 0) return false

  // 2) Effacer le fichier Blob (non bloquant : on continue meme si echec).
  const pathname = rows[0].blob_pathname
  if (pathname) {
    try {
      await del(pathname)
    } catch (err) {
      console.error('[video-history] Suppression Blob echouee:', err)
    }
  }

  // 3) Supprimer la ligne Neon.
  await sql`DELETE FROM video_history WHERE id = ${id} AND user_id = ${userId}`
  return true
}

/**
 * Retourne une map { provider_ref -> blob_pathname } pour un utilisateur et un
 * outil donnes. Sert a "durcir" les galeries existantes (ex: Motion) en
 * remplacant les URLs fournisseur (qui expirent) par la copie Blob permanente.
 */
export async function getBlobPathnamesByRef(
  userId: string,
  tool: VideoTool,
): Promise<Record<string, string>> {
  await ensureTable()
  const rows = (await sql`
    SELECT provider_ref, blob_pathname
    FROM video_history
    WHERE user_id = ${userId} AND tool = ${tool}
      AND provider_ref IS NOT NULL AND blob_pathname IS NOT NULL
  `) as { provider_ref: string; blob_pathname: string }[]
  const map: Record<string, string> = {}
  for (const r of rows) map[r.provider_ref] = r.blob_pathname
  return map
}

/**
 * Met a jour le blob_pathname d'une ligne existante (auto-reparation) : quand on
 * a reussi a re-heberger a posteriori une video dont le blob manquait.
 */
export async function setBlobPathname(
  userId: string,
  id: string,
  pathname: string,
): Promise<void> {
  await ensureTable()
  await sql`
    UPDATE video_history
    SET blob_pathname = ${pathname}, status = 'completed'
    WHERE id = ${id} AND user_id = ${userId}
  `
}

/** Liste l'historique d'un utilisateur, tous outils ou filtre par outil. */
export async function listVideoHistory(
  userId: string,
  tool?: VideoTool,
  limit = 50,
): Promise<VideoHistoryItem[]> {
  await ensureTable()
  const rows = tool
    ? ((await sql`
        SELECT id, tool, provider_ref, blob_pathname, thumbnail_url, stream_uid, stream_customer_code, title, status, created_at
        FROM video_history
        WHERE user_id = ${userId} AND tool = ${tool}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `) as VideoHistoryItem[])
    : ((await sql`
        SELECT id, tool, provider_ref, blob_pathname, thumbnail_url, stream_uid, stream_customer_code, title, status, created_at
        FROM video_history
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `) as VideoHistoryItem[])
  return rows.map((r) => ({ ...r, id: String(r.id) }))
}
