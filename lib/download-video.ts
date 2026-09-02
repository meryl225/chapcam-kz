// Téléchargement d'une vidéo en 1 clic, fiable sur iPhone Safari, Android et
// ordinateur.
//
// FLUX (2 étapes, toutes deux même-origine) :
//   1) POST /api/videos/download-link { id | pathname }  -> XHR avec cookies.
//      Le serveur relit le CHEMIN PERMANENT en base, vérifie que le fichier
//      existe vraiment dans le stockage, et renvoie un lien signé (10 min) +
//      le nom de fichier final (.mp4). S'il n'existe plus : erreur JSON claire
//      que l'on remonte à l'UI (aucune navigation vers une page « Introuvable »).
//   2) Navigation vers /api/videos/download?t=<jeton> : le serveur régénère une
//      signed URL du stockage à l'instant et streame le MP4 avec
//      `Content-Disposition: attachment; filename="chapcam-….mp4"` et
//      `Content-Type: video/mp4`. L'autorisation est dans l'URL, donc le
//      gestionnaire de téléchargement du téléphone (qui peut refaire la
//      requête sans cookies) obtient bien le fichier — plus jamais le texte
//      d'une erreur enregistré sous un faux « .mp4 ».
//
// Pourquoi une navigation et non un fetch()+Blob : pas de CSP connect-src, pas
// de CORS, pas de bloqueurs, aucune copie en mémoire (vidéos lourdes, mobiles),
// et sur iOS c'est ce qui ouvre la feuille « Télécharger / Enregistrer ».

export interface DownloadResult {
  ok: boolean
  /** Message d'erreur lisible (à afficher à l'utilisateur) si ok === false */
  error?: string
  filename?: string
}

type DownloadTarget = { id: string } | { pathname: string }

// Navigation "top-level" vers une URL qui répond `attachment`.
// - iOS Safari : `location.assign` sur une réponse attachment ne quitte pas la
//   page et ouvre la feuille de téléchargement (le PDF/viewer n'est pas utilisé
//   pour les fichiers video/mp4 en attachment).
// - Android / desktop : le navigateur enregistre le fichier, la page reste.
function navigateToDownload(href: string) {
  const a = document.createElement("a")
  a.href = href
  a.rel = "noopener"
  // Pas d'attribut `download` : c'est l'en-tête serveur qui décide du nom et
  // force l'enregistrement. (Avec `download`, iOS pouvait enregistrer le corps
  // d'une erreur sous le nom du fichier.)
  document.body.appendChild(a)
  a.click()
  a.remove()
}

/**
 * Prépare puis lance le téléchargement d'une vidéo de l'historique.
 * Toute erreur est renvoyée sous forme de message clair, jamais levée.
 */
export async function downloadHistoryVideo(target: DownloadTarget): Promise<DownloadResult> {
  try {
    const res = await fetch("/api/videos/download-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(target),
      cache: "no-store",
    })
    const json = (await res.json().catch(() => ({}))) as { url?: string; filename?: string; error?: string }
    if (!res.ok || !json.url) {
      return { ok: false, error: json.error || "Impossible de préparer le téléchargement. Réessaie." }
    }
    navigateToDownload(json.url)
    return { ok: true, filename: json.filename }
  } catch {
    return { ok: false, error: "Connexion impossible. Vérifie ton réseau puis réessaie." }
  }
}

// Extrait le chemin permanent d'une URL de lecture même-origine
// `/api/videos/file?pathname=...` (utilisée par les galeries des studios).
function pathnameFromFileUrl(url: string): string | null {
  if (!url.startsWith("/api/videos/file")) return null
  try {
    const u = new URL(url, window.location.origin)
    return u.searchParams.get("pathname")
  } catch {
    return null
  }
}

/**
 * Compatibilité avec les appels existants (studios Photo→Vidéo, Motion,
 * Traduction) : `downloadVideo(url, filename)`.
 * - URL de notre historique (/api/videos/file?pathname=...) : flux sécurisé
 *   ci-dessus (chemin permanent -> vérification -> lien signé -> MP4).
 * - URL externe (fournisseur) : ouverture directe, repli fetch+Blob.
 * @returns true si le téléchargement a été déclenché.
 */
export async function downloadVideo(
  url: string,
  filename: string,
  onError?: (message: string) => void,
): Promise<boolean> {
  const pathname = pathnameFromFileUrl(url)
  if (pathname) {
    const r = await downloadHistoryVideo({ pathname })
    if (!r.ok && onError) onError(r.error || "Téléchargement impossible.")
    return r.ok
  }

  // URL externe (fournisseur / blob public) : fetch + Blob pour forcer
  // l'enregistrement avec le bon nom, repli sur l'ouverture dans un onglet.
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`download failed: ${res.status}`)
    const objectUrl = URL.createObjectURL(await res.blob())
    const a = document.createElement("a")
    a.href = objectUrl
    a.download = filename.endsWith(".mp4") ? filename : `${filename}.mp4`
    a.rel = "noopener"
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(objectUrl), 4000)
    return true
  } catch {
    window.open(url, "_blank", "noopener")
    return false
  }
}
