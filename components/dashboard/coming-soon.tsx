import Link from 'next/link'
import { ArrowLeft, type LucideIcon } from 'lucide-react'

interface ComingSoonProps {
  icon: LucideIcon
  title: string
  description: string
  features: string[]
  accent?: string
  glow?: string
}

export function ComingSoon({
  icon: Icon,
  title,
  description,
  features,
  accent = '#00ff88',
  glow = 'rgba(0,255,136,0.18)',
}: ComingSoonProps) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8 md:py-12">
      <Link
        href="/dashboard"
        className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-gray-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour au dashboard
      </Link>

      <div className="rounded-2xl border border-white/10 bg-[#111] p-8 text-center md:p-12">
        <div
          className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{ backgroundColor: glow }}
        >
          <Icon className="h-8 w-8" style={{ color: accent }} />
        </div>

        <span
          className="mb-4 inline-block rounded-full px-3 py-1 text-xs font-bold uppercase"
          style={{ backgroundColor: glow, color: accent }}
        >
          Bientôt disponible
        </span>

        <h1 className="mb-3 text-2xl font-bold text-white md:text-3xl text-balance">{title}</h1>
        <p className="mx-auto mb-8 max-w-xl text-sm leading-relaxed text-gray-400 text-pretty">
          {description}
        </p>

        <ul className="mx-auto mb-8 grid max-w-md gap-3 text-left">
          {features.map((f) => (
            <li
              key={f}
              className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-gray-200"
            >
              <span
                className="flex h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: accent }}
              />
              {f}
            </li>
          ))}
        </ul>

        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10"
        >
          Explorer les autres outils
        </Link>
      </div>
    </div>
  )
}
