import { type NextRequest, NextResponse } from 'next/server'
import { head, issueSignedToken, presignUrl } from '@vercel/blob'
import { createClient } from '@/lib/supabase/server'
import { getVideoHistoryItemByPath } from '@/lib/video-history'
import { headVideo, isVideoKey, signedPlaybackUrl } from '@/lib/r2'

// Sert une video de l'historique pour la LECTURE (<video src=...>).
//
// POURQUOI CETTE VERSION : le TELECHARGEMENT (/api/videos/download) marchait
// deja parfaitement -> il lit la cle PERMANENTE Cloudflare R2 (`r2_key`) en base
// et redirige vers une URL signee R2. La LECTURE, elle, passait par le store
// Blob (head + presignUrl) : un chemin DIFFERENT qui, en production, renvoyait
// un ECRAN NOIR (le clip se telechargeait mais ne se lisait pas).
//
// On aligne donc la lecture sur le telechargement : meme source R2, meme
// mecanique. Seule difference -> `Content-Disposition: inline` (via
// `signedPlaybackUrl`) pour que le navigateur LISE la video au lieu de la
// telecharger. R2 est le stockage permanent et fiable -> comportement identique
// en preview et en prod.
//
// Repli : les rares anciennes videos sans `r2_key` (pas encore migrees) sont
// encore servies via le store Blob.
export const dynamic = 'force-dynamic'

const PRESIGN_TTL_MS = 60 * 60 * 1000 // 1 heure

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const pathname = request.nextUrl.searchParams.get('pathname')
  if (!pathname) {
    return NextResponse.json({ error: 'pathname manquant' }, { status: 400 })
  }

  // Le chemin DOIT commencer par le prefixe de l'utilisateur courant : un compte
  // ne peut pas lire les videos d'un autre en devinant un chemin.
  if (!pathname.startsWith(`videos/${user.id}/`)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  // ANCIENS liens `?download=1` : on delegue a la route de telechargement.
  if (request.nextUrl.searchParams.get('download') === '1') {
    return NextResponse.redirect(
      new URL(`/api/videos/download?pathname=${encodeURIComponent(pathname)}`, request.nextUrl.origin),
      { status: 303, headers: { 'Cache-Control': 'private, no-store' } },
    )
  }

  try {
    // 1) SOURCE PRINCIPALE — Cloudflare R2 (comme le telechargement qui marche).
    //    On relit la cle R2 PERMANENTE en base (filtree par proprietaire) a
    //    partir du chemin de lecture, on verifie que l'objet existe vraiment,
    //    puis on redirige le <video> vers une URL signee R2 EN LECTURE (inline).
    const item = await getVideoHistoryItemByPath(user.id, pathname).catch(() => null)
    if (item && isVideoKey(item.r2_key)) {
      const meta = await headVideo(item.r2_key).catch(() => null)
      if (meta) {
        const url = await signedPlaybackUrl(item.r2_key, 3600)
        return NextResponse.redirect(url, {
          status: 302,
          headers: { 'Cache-Control': 'private, no-store' },
        })
      }
    }

    // 2) REPLI — anciennes videos encore uniquement dans le store Blob prive.
    let blobMeta = await head(pathname).catch(() => null)
    if (!blobMeta) blobMeta = await head(pathname).catch(() => null)
    if (!blobMeta) {
      return NextResponse.json(
        { error: 'Ce fichier n’existe plus dans le stockage.' },
        { status: 410, headers: { 'Cache-Control': 'private, no-store' } },
      )
    }

    const validUntil = Date.now() + PRESIGN_TTL_MS
    const token = await issueSignedToken({ pathname, operations: ['get'], validUntil })
    const { presignedUrl } = await presignUrl(token, {
      operation: 'get',
      pathname,
      access: 'private',
      validUntil,
      useCache: false,
    })
    return NextResponse.redirect(presignedUrl, {
      status: 302,
      headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch (error) {
    console.error('[videos/file] Erreur service video:', error)
    return NextResponse.json({ error: 'Échec du service de la vidéo' }, { status: 500 })
  }
}
