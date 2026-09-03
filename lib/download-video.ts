// Téléchargement d'une vidéo en 1 clic (iPhone Safari, Android, ordinateur).
//
// Le navigateur NAVIGUE vers /api/videos/download?id=… (ou ?pathname=…).
// Le serveur : session -> clé R2 permanente en base -> l'objet existe ? ->
// nouvelle URL signée R2 (Content-Type: video/mp4, Content-Disposition:
// attachment; filename=….mp4) -> redirection. Le fichier s'enregistre
// directement ; en cas de problème, une page d'erreur claire s'affiche.
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

function navigateToDownload(href: string) {
  const a = document.createElement("a")
  a.href = href
  a.rel = "noopener"
  // Pas d'attribut `download` : c'est l'en-tête serveur qui décide du nom et
  // force l'enregistrement.
  document.body.appendChild(a)
  a.click()
  a.remove()
}

/** Lance le téléchargement d'une vidéo de l'historique. */
export async function downloadHistoryVideo(target: DownloadTarget): Promise<DownloadResult> {
  const qs =
    "id" in target
      ? `id=${encodeURIComponent(target.id)}`
      : `pathname=${encodeURIComponent(target.pathname)}`
  navigateToDownload(`/api/videos/download?${qs}`)
  return { ok: true }
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
 * - URL de notre historique (/api/videos/file?pathname=...) : route R2.
 * - URL externe (fournisseur) : fetch+Blob, repli ouverture dans un onglet.
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
