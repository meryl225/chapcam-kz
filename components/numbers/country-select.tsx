'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { CountryFlag } from '@/components/numbers/country-flag'
import { COUNTRIES, countryByCode } from '@/lib/numbers/catalog'

/**
 * Sélecteur de pays personnalisé affichant le drapeau (image) de chaque pays.
 * Remplace le <select> natif qui ne peut pas afficher d'images.
 */
export function CountrySelect({
  value,
  onChange,
}: {
  value: string
  onChange: (code: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = countryByCode(value)

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition-colors hover:border-white/20 focus:border-blue-500"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selected && <CountryFlag code={selected.code} size={22} />}
        <span className="flex-1 truncate text-left">
          {selected ? `${selected.name} (${selected.dial})` : 'Choisir un pays'}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-white/40 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1.5 max-h-72 w-full overflow-y-auto rounded-xl border border-white/10 bg-[#0b1220] p-1.5 shadow-2xl"
        >
          {COUNTRIES.map((c) => {
            const active = c.code === value
            return (
              <li key={c.code} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(c.code)
                    setOpen(false)
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                    active ? 'bg-blue-500/15 text-white' : 'text-white/80 hover:bg-white/5'
                  }`}
                >
                  <CountryFlag code={c.code} size={22} />
                  <span className="flex-1 truncate text-left">
                    {c.name} <span className="text-white/40">({c.dial})</span>
                  </span>
                  {active && <Check className="h-4 w-4 shrink-0 text-blue-400" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
