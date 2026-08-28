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
  const sameOrigin = url.startsWith("/api/videos/file")

  // Déclenche l'enregistrement d'un Blob déjà récupéré via un lien objet
  // (même-origine -> l'attribut `download` est TOUJOURS honoré, quelle que soit
  // la disposition renvoyée par le stockage).
  const saveBlob = (blob: Blob) => {
    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = objectUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(objectUrl), 4000)
  }

  try {
    if (sameOrigin) {
      // Étape 1 : requête MÊME-ORIGINE qui renvoie l'URL présignée en JSON.
      // (On ne laisse PAS `fetch` suivre une redirection 303 vers un domaine de
      // stockage tiers : les bloqueurs de pub/anti-pistage cassent cette chaîne
      // et provoquaient l'échec + la page « introuvable ».)
      const res = await fetch(`${url}&download=1`, { credentials: "same-origin" })
      if (!res.ok) throw new Error(`presign failed: ${res.status}`)
      const { url: presignedUrl } = (await res.json()) as { url?: string }
      if (!presignedUrl) throw new Error("presigned url manquante")
      // Étape 2 : on récupère les octets directement depuis l'URL présignée
      // (CORS *) puis on force l'enregistrement.
      const fileRes = await fetch(presignedUrl)
      if (!fileRes.ok) throw new Error(`fetch fichier: ${fileRes.status}`)
      saveBlob(await fileRes.blob())
      return true
    }

    // URL déjà directe (fournisseur / blob public) : on tente le fetch direct.
    const res = await fetch(url)
    if (!res.ok) throw new Error(`download failed: ${res.status}`)
    saveBlob(await res.blob())
    return true
  } catch {
    // Repli : ouvrir dans un nouvel onglet — l'utilisateur enregistre
    // manuellement (utile si un blocage réseau empêche le fetch). On ouvre
    // l'URL SANS `download=1` : la route redirige alors vers la vidéo (lisible
    // et enregistrable via le menu contextuel), au lieu de renvoyer du JSON.
    window.open(url, "_blank")
    return false
  }
}
