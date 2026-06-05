'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'

/**
 * Toggle compact (sidebar) : un interrupteur clair/sombre.
 */
export function ThemeToggleCompact({ collapsed = false }: { collapsed?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const isDark = resolvedTheme === 'dark'

  if (!mounted) {
    return <div className="h-9 w-full rounded-lg" aria-hidden />
  }

  if (collapsed) {
    return (
      <button
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        aria-label={isDark ? 'Activer le mode clair' : 'Activer le mode sombre'}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-secondary text-foreground transition-colors hover:bg-muted"
      >
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
    )
  }

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Activer le mode clair' : 'Activer le mode sombre'}
      className="flex w-full items-center justify-between rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
    >
      <span className="flex items-center gap-2">
        {isDark ? <Moon className="h-4 w-4 text-primary" /> : <Sun className="h-4 w-4 text-primary" />}
        {isDark ? 'Mode sombre' : 'Mode clair'}
      </span>
      <span className="relative inline-flex h-5 w-9 items-center rounded-full bg-muted transition-colors">
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-primary shadow transition-transform ${
            isDark ? 'translate-x-0.5' : 'translate-x-[18px]'
          }`}
        />
      </span>
    </button>
  )
}

/**
 * Toggle segmente (page Parametres) : Clair / Sombre / Systeme.
 */
export function ThemeToggleSegmented() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const options = [
    { value: 'light', label: 'Clair', icon: Sun },
    { value: 'dark', label: 'Sombre', icon: Moon },
  ]

  if (!mounted) {
    return <div className="h-10 w-full max-w-xs rounded-lg border border-border bg-secondary" aria-hidden />
  }

  return (
    <div className="inline-flex rounded-lg border border-border bg-secondary p-1">
      {options.map((opt) => {
        const active = theme === opt.value
        return (
          <button
            key={opt.value}
            onClick={() => setTheme(opt.value)}
            className={`flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <opt.icon className="h-4 w-4" />
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
