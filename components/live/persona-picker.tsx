'use client'

import { Check, Plus, ImageIcon } from 'lucide-react'
import Link from 'next/link'

export interface PersonaAvatar {
  id: string
  name: string
  url: string
}

interface Props {
  avatars: PersonaAvatar[]
  selected: string[] // ids selectionnes (1 a 4)
  max: number
  onToggle: (id: string) => void
  disabled?: boolean
}

export function PersonaPicker({ avatars, selected, max, onToggle, disabled }: Props) {
  if (avatars.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-card px-6 py-10 text-center">
        <ImageIcon className="mb-3 h-10 w-10 text-primary/40" />
        <p className="text-sm text-muted-foreground">
          Aucune photo persona. Ajoute d&apos;abord une ou plusieurs photos de la personne en qui te
          transformer.
        </p>
        <Link
          href="/dashboard/avatars"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Ajouter une photo
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">
          Photos de reference{' '}
          <span className="text-text-faint">
            ({selected.length}/{max})
          </span>
        </p>
        <Link
          href="/dashboard/avatars"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary transition-opacity hover:opacity-80"
        >
          <Plus className="h-3.5 w-3.5" /> Gerer
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
        {avatars.map((a) => {
          const isSelected = selected.includes(a.id)
          const limitReached = !isSelected && selected.length >= max
          return (
            <button
              key={a.id}
              type="button"
              disabled={disabled || limitReached}
              onClick={() => onToggle(a.id)}
              className={`group relative aspect-[3/4] overflow-hidden rounded-xl border-2 transition-all ${
                isSelected
                  ? 'border-primary shadow-[0_0_16px_rgba(0,255,136,0.3)]'
                  : 'border-hairline hover:border-white/30'
              } ${limitReached || disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
            >
              <img src={a.url || '/placeholder.svg'} alt={a.name} className="h-full w-full object-cover" />
              {isSelected && (
                <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-black">
                  <Check className="h-3.5 w-3.5" />
                </span>
              )}
              <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/90 to-transparent px-2 py-1.5 text-left text-xs font-medium text-foreground">
                {a.name}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
