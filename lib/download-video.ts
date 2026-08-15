// Enregistrement FIABLE d'une vidéo sur mobile ET ordinateur.
//
// Pourquoi ce helper : l'attribut HTML `download` sur un <a> est IGNORÉ par la
// plupart des navigateurs mobiles (iOS Safari, Android Chrome) et pour toute URL
// cross-origin. Résultat : taper « Télécharger » ouvre/joue la vidéo au lieu de
// l'enregistrer — c'est exactement la plainte des utilisateurs.
//
// Méthode robuste : on récupère la vidéo en blob puis on déclenche un lien objet
// temporaire. Nos vidéos sont servies par la route même-origine
// `/api/videos/file` qui renvoie `Content-Disposition: attachment` avec
// `?download=1`, ce qui force bien l'enregistrement.

/**
 * Télécharge une vidéo de façon fiable (mobile + ordinateur).
 * @returns true si le téléchargement blob a réussi, false si on a dû se rabattre
 *          sur l'ouverture dans un nouvel onglet.
 */
export async function downloadVideo(url: string, filename: string): Promise<boolean> {
  // Notre route privée sert le fichier en pièce jointe avec ?download=1.
  const sameOrigin = url.startsWith("/api/videos/file")
  const fetchUrl = sameOrigin ? `${url}&download=1` : url
  try {
    const res = await fetch(fetchUrl)
    if (!res.ok) throw new Error(`download failed: ${res.status}`)
    const blob = await res.blob()
    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = objectUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    // Laisser le temps au navigateur de démarrer le téléchargement.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 4000)
    return true
  } catch {
    // Repli : ouvrir dans un nouvel onglet (utile si l'URL fournisseur est
    // cross-origin et bloquée par CORS) — l'utilisateur enregistre manuellement.
    window.open(fetchUrl, "_blank")
    return false
  }
}
