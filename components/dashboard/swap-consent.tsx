'use client'

import Link from 'next/link'
import { Check } from 'lucide-react'

/**
 * Case de certification discrete a afficher avant chaque face swap / voice swap.
 * Le bouton Generer/Demarrer doit rester desactive tant que `checked` est faux.
 */
export function SwapConsent({
  checked,
  onChange,
  className = '',
}: {
  checked: boolean
  onChange: (value: boolean) => void
  className?: string
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl border border-hairline bg-background/40 p-3 transition-colors hover:border-primary/30 ${className}`}
    >
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
          checked ? 'border-primary bg-primary text-primary-foreground' : 'border-hairline bg-transparent'
        }`}
      >
        {checked && <Check className="h-3.5 w-3.5" aria-hidden />}
      </span>
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-label="Je certifie disposer des autorisations necessaires"
      />
      <span className="text-xs leading-relaxed text-muted-foreground">
        Je certifie disposer des autorisations nécessaires et utiliser CHAPCAM conformément aux lois applicables.
      </span>
    </label>
  )
}

/** Petit texte discret a placer sous le bouton Generer/Demarrer. */
export function GenerateNotice({ className = '' }: { className?: string }) {
  return (
    <p className={`text-center text-[11px] leading-relaxed text-text-faint ${className}`}>
      En générant ce contenu, vous confirmez respecter les{' '}
      <Link href="/charte" className="text-muted-foreground underline-offset-2 hover:text-primary hover:underline">
        Conditions d’utilisation
      </Link>{' '}
      de CHAPCAM.
    </p>
  )
}
