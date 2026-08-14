'use client'

import { useT } from '@/lib/i18n/language-provider'

/**
 * Composant de traduction utilisable DANS un Server Component.
 *
 * `useT` est un hook client : on ne peut pas l'appeler dans un composant
 * serveur (async). Ce petit wrapper client resout ce probleme — il peut etre
 * rendu comme enfant d'un RSC et traduit son texte a l'execution cote client.
 *
 * La cle de traduction est le texte francais (source), comme pour `useT`.
 * On accepte aussi un modele `{n}` remplace par `values.n`.
 *
 * Exemple :
 *   <T>Recharger</T>
 *   <T values={{ n: 3 }}>{'{n} videos incluses'}</T>
 */
export function T({
  children,
  values,
}: {
  children: string
  values?: Record<string, string | number>
}) {
  const t = useT()
  let out = t(children)
  if (values) {
    for (const [key, val] of Object.entries(values)) {
      out = out.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val))
    }
  }
  return <>{out}</>
}
