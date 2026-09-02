// Téléchargement EN 1 CLIC d'une vidéo, fiable sur mobile ET ordinateur.
//
// Nos vidéos de l'historique sont servies par la route même-origine
// `/api/videos/file?pathname=...`. Avec `&download=1`, cette route redirige le
// navigateur vers une URL présignée du stockage qui répond
// `Content-Disposition: attachment` : le navigateur ENREGISTRE donc le fichier
// directement (boîte « Enregistrer sous » / dossier Téléchargements / feuille de
// partage iOS), sans le lire.
//
// Pourquoi une simple NAVIGATION plutôt qu'un `fetch()` + Blob :
//   - une navigation n'est soumise ni à la CSP `connect-src`, ni au CORS, ni
//     aux bloqueurs de pub/anti-pistage qui cassent les `fetch()` cross-origin
//     (c'était la cause des échecs signalés par les utilisateurs) ;
//   - aucune copie du fichier en mémoire (vidéos lourdes, mobiles) ;
//   - fonctionne partout : iOS Safari, Android Chrome, desktop.

/**
 * Déclenche l'enregistrement d'une vidéo en 1 clic.
 * @returns true si le téléchargement direct a été déclenché, false si on est
 *          passé par le repli (ouverture dans un nouvel onglet).
 */
export async function downloadVideo(url: string, filename: string): Promise<boolean> {
  const sameOrigin = url.startsWith("/api/videos/file")

  const navigateTo = (href: string) => {
    const a = document.createElement("a")
    a.href = href
    a.download = filename
    a.rel = "noopener"
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  if (sameOrigin) {
    // La route répond `attachment` -> enregistrement direct, 1 clic.
    navigateTo(`${url}${url.includes("?") ? "&" : "?"}download=1`)
    return true
  }

  // URL externe (fournisseur / blob public) : on tente un fetch + Blob pour
  // forcer l'enregistrement, avec repli sur l'ouverture dans un nouvel onglet.
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`download failed: ${res.status}`)
    const objectUrl = URL.createObjectURL(await res.blob())
    navigateTo(objectUrl)
    setTimeout(() => URL.revokeObjectURL(objectUrl), 4000)
    return true
  } catch {
    window.open(url, "_blank", "noopener")
    return false
  }
}
