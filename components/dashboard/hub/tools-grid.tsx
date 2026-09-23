import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { T } from '@/components/i18n/t'

interface Tool {
  href: string
  title: string
  description: string
  badge?: 'NEW' | 'ACTIF'
  accent: string
  /* Média plein cadre : soit une vidéo (autoplay/loop/muted), soit un poster image. */
  media: { type: 'video'; src: string; poster?: string } | { type: 'image'; src: string }
}

const tools: Tool[] = [
  {
    href: '/dashboard/genjutsu',
    title: 'Genjutsu',
    description: 'Anime tes images avec un mouvement naturel',
    badge: 'NEW',
    accent: '#c6f542',
    media: { type: 'video', src: '/videos/genjutsu-demo.mov' },
  },
  {
    href: '/dashboard/motion',
    title: 'Motion',
    description: 'Anime ta photo en 3D',
    badge: 'NEW',
    accent: '#8b5cf6',
    media: { type: 'video', src: '/videos/motion-control-demo.mp4', poster: '/swap/poster-motion.png' },
  },
  {
    href: '/dashboard/live-swap',
    title: 'Live Swap',
    description: 'Change de visage en temps réel',
    badge: 'ACTIF',
    accent: '#00ff88',
    media: { type: 'video', src: '/swap/live-swap-demo.mp4' },
  },
  {
    href: '/dashboard/message-vocal',
    title: 'Message Vocal',
    description: 'Crée des voix réalistes depuis un texte',
    badge: 'NEW',
    accent: '#00d4ff',
    media: { type: 'image', src: '/swap/poster-message-vocal.png' },
  },
  {
    href: '/dashboard/photo-video',
    title: 'Photos en Vidéo',
    description: 'Anime ta photo en vidéo',
    badge: 'NEW',
    accent: '#f97316',
    media: { type: 'image', src: '/swap/poster-photo-video.png' },
  },
  {
    href: '/dashboard/video-translation',
    title: 'Traduction de Vidéo',
    description: 'Traduis ta vidéo en 190+ langues',
    badge: 'NEW',
    accent: '#22d3ee',
    media: { type: 'image', src: '/swap/poster-video-translation.png' },
  },
  {
    href: '/dashboard/chapverify',
    title: 'ChapVerify',
    description: 'Détecte les deepfakes',
    badge: 'NEW',
    accent: '#ef4444',
    media: { type: 'image', src: '/swap/poster-chapverify.png' },
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
      <T>{label}</T>
    </span>
  )
}

export function ToolsGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {tools.map((tool) => (
        <Link
          key={tool.href}
          href={tool.href}
          style={{ ['--accent' as string]: tool.accent }}
          className="group relative block aspect-[1.42/1] overflow-hidden rounded-[12px] border border-white/[0.1] bg-card transition-all duration-300 hover:-translate-y-1 hover:border-blue-300/45 hover:shadow-[0_20px_45px_-25px_rgba(37,99,235,0.55)]"
        >
          {/* Média plein cadre */}
          {tool.media.type === 'video' ? (
            <video
              src={tool.media.src}
              poster={tool.media.poster}
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

          <div className="absolute left-4 right-4 top-4 z-10 flex items-start justify-between gap-3">
            {tool.badge ? <Badge kind={tool.badge} accent={tool.accent} /> : <span />}
            <span
              aria-hidden
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20 bg-black/25 text-white/80 backdrop-blur-md transition-all duration-300 group-hover:border-white/50 group-hover:bg-white/15 group-hover:text-white"
            >
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </span>
          </div>

          <div className="absolute inset-x-4 bottom-4 z-10">
            <h3 className="max-w-[90%] text-xl font-bold leading-tight tracking-tight text-white text-balance drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)] md:text-[1.35rem]">
              <T>{tool.title}</T>
            </h3>
            <p className="mt-1 max-w-[92%] text-xs leading-relaxed text-white/70 text-pretty drop-shadow-[0_1px_5px_rgba(0,0,0,0.8)]">
              <T>{tool.description}</T>
            </p>
          </div>
        </Link>
      ))}
    </div>
  )
}
