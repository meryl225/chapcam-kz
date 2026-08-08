import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

interface Tool {
  href: string
  title: string
  badge?: 'NEW' | 'ACTIF'
  accent: string
  /* Média plein cadre : soit une vidéo (autoplay/loop/muted), soit un poster image. */
  media: { type: 'video'; src: string; poster?: string } | { type: 'image'; src: string }
}

const tools: Tool[] = [
  {
    href: '/dashboard/live-swap',
    title: 'Live Swap',
    badge: 'ACTIF',
    accent: '#00ff88',
    media: { type: 'video', src: '/swap/live-swap-demo.mp4' },
  },
  {
    href: '/dashboard/motion',
    title: 'Motion',
    badge: 'NEW',
    accent: '#8b5cf6',
    media: { type: 'image', src: '/swap/poster-motion.png' },
  },
  {
    href: '/dashboard/photo-video',
    title: 'Photos en Vidéo',
    badge: 'NEW',
    accent: '#f97316',
    media: { type: 'image', src: '/swap/poster-photo-video.png' },
  },
  {
    href: '/dashboard/video-translation',
    title: 'Traduction de Vidéo',
    badge: 'NEW',
    accent: '#22d3ee',
    media: { type: 'image', src: '/swap/poster-video-translation.png' },
  },
]

function Badge({ kind, accent }: { kind: NonNullable<Tool['badge']>; accent: string }) {
  const label = kind === 'ACTIF' ? 'Actif' : 'Nouveau'
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] backdrop-blur-md"
      style={{ backgroundColor: `${accent}22`, borderColor: `${accent}55`, color: accent }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent, boxShadow: `0 0 8px ${accent}` }} />
      {label}
    </span>
  )
}

export function ToolsGrid() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {tools.map((tool) => (
        <Link
          key={tool.href}
          href={tool.href}
          style={{ ['--accent' as string]: tool.accent }}
          className="group relative block aspect-[4/3] overflow-hidden rounded-[22px] border border-white/[0.08] transition-all duration-500 hover:-translate-y-1.5 hover:border-[var(--accent)]/50 hover:shadow-[0_30px_80px_-30px_var(--accent)]"
        >
          {/* Média plein cadre */}
          {tool.media.type === 'video' ? (
            <video
              src={tool.media.src}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-hidden
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={tool.media.src || '/placeholder.svg'}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          )}

          {/* Dégradés sombres pour la lisibilité du texte (haut + bas) */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.05) 32%, rgba(0,0,0,0.15) 60%, rgba(0,0,0,0.75) 100%)',
            }}
          />
          {/* Teinte d'accent au survol */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            style={{ background: `radial-gradient(120% 80% at 50% 120%, ${tool.accent}33, transparent 60%)` }}
          />

          {/* Pastille de statut (en ligne) */}
          <span
            aria-hidden
            className="absolute right-3.5 top-3.5 z-10 h-2.5 w-2.5 rounded-full bg-[#22c55e]"
            style={{ boxShadow: '0 0 10px #22c55e' }}
          />

          {/* Titre + badge en haut à gauche */}
          <div className="absolute left-5 right-5 top-4 z-10 flex flex-col gap-2">
            {tool.badge && (
              <div className="w-fit">
                <Badge kind={tool.badge} accent={tool.accent} />
              </div>
            )}
            <h3 className="max-w-[85%] text-2xl font-bold leading-tight tracking-tight text-white text-balance drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
              {tool.title}
            </h3>
          </div>

          {/* CTA « Ouvrir » en bas à gauche */}
          <div className="absolute bottom-4 left-5 z-10">
            <span className="inline-flex items-center gap-2 text-[15px] font-semibold text-white transition-all duration-300 group-hover:gap-3">
              Ouvrir
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" style={{ color: tool.accent }} />
            </span>
          </div>
        </Link>
      ))}
    </div>
  )
}
