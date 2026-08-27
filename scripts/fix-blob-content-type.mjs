// Répare les métadonnées des vidéos stockées dans le Blob privé.
//
// Certaines vidéos ont été enregistrées avec un content-type générique
// (`binary/octet-stream`) et une disposition `attachment`, car le CDN source ne
// renvoyait pas de type vidéo. Résultat : Safari/iOS refuse de LIRE ces fichiers
// (il exige un type `video/*` servi en `inline`).
//
// `copy(path, path, { contentType, contentDisposition })` réécrit UNIQUEMENT les
// métadonnées côté serveur (aucun octet ne transite par nous, le fichier est
// préservé). On ne touche QUE les fichiers dont les métadonnées sont incorrectes.
//
// Lancement :
//   set -a && source /vercel/share/.env.project && set +a && node scripts/fix-blob-content-type.mjs

import { neon } from '@neondatabase/serverless'
import { head, copy } from '@vercel/blob'

const sql = neon(process.env.DATABASE_URL)

async function main() {
  const rows = await sql`
    SELECT blob_pathname
    FROM video_history
    WHERE blob_pathname IS NOT NULL AND status = 'completed'
    ORDER BY created_at DESC`

  console.log(`Vérification de ${rows.length} fichier(s)...`)
  let fixed = 0
  let alreadyOk = 0
  let failed = 0

  for (const row of rows) {
    const pathname = row.blob_pathname
    try {
      const h = await head(pathname, { access: 'private' })
      const ct = h.contentType || ''
      const disp = h.contentDisposition || ''
      const isWebm = /\.webm$/i.test(pathname) || ct.includes('webm')
      const wantedType = isWebm ? 'video/webm' : 'video/mp4'
      const typeOk = ct.startsWith('video/')
      const dispOk = disp.startsWith('inline')

      if (typeOk && dispOk) {
        alreadyOk++
        continue
      }

      // Réécrit les métadonnées en préservant le contenu.
      await copy(pathname, pathname, {
        access: 'private',
        contentType: wantedType,
        contentDisposition: 'inline',
      })
      fixed++
      console.log(`  réparé (${ct || 'vide'} -> ${wantedType}, inline): ${pathname.slice(0, 60)}`)
    } catch (e) {
      failed++
      console.error(`  ÉCHEC ${pathname.slice(0, 60)}: ${e?.name} ${e?.message}`)
    }
  }

  console.log(`\nTerminé. Réparés: ${fixed} | Déjà OK: ${alreadyOk} | Échecs: ${failed}`)
}

main().catch((e) => {
  console.error('Erreur fatale:', e)
  process.exit(1)
})
