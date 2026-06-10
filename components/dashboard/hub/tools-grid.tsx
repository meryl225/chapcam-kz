import Link from 'next/link'
import { Zap, Mic, Languages, ImageIcon, Film, Monitor, ArrowRight } from 'lucide-react'
import {
  LiveSwapPreview,
  VoiceChangerPreview,
  VoiceTranslatorPreview,
  PhotoVideoPreview,
  VideoTranslationPreview,
  DesktopPCPreview,
} from '@/components/dashboard/hub/tool-previews'

interface Tool {
  href: string
  icon: React.ElementType
  title: string
  description: string
  badge?: 'NEW' | 'PRO' | 'ACTIF'
  accent: string
  /* dégradé doux pour le fond de l'aperçu (purple-teal-cyan tasteful) */
  gradient: string
  Preview: React.ComponentType
  featured?: boolean
}

const tools: Tool[] = [
  {
    href: '/dashboard/live-swap',
    icon: Zap,
    title: 'Live Swap',
    description: 'Transforme ton apparence en temps réel avec l’IA, dans tous tes appels vidéo.',
    badge: 'ACTIF',
    accent: '#00ff88',
    gradient: 'linear-gradient(135deg, rgba(0,255,136,0.18), rgba(34,211,238,0.12) 55%, rgba(139,92,246,0.10))',
    Preview: LiveSwapPreview,
    featured: true,
  },
  {
    href: '/dashboard/chapcam-pc',
    icon: Monitor,
    title: 'ChapCam PC',
    description: 'Le logiciel ChapCam sur ton PC, sans cloud. Achat unique, licence à vie.',
    badge: 'NEW',
    accent: '#00ff88',
    gradient: 'linear-gradient(135deg, rgba(0,255,136,0.16), rgba(20,184,166,0.10))',
    Preview: DesktopPCPreview,
  },
  {
    href: '/dashboard/voice-changer',
    icon: Mic,
    title: 'Voice Changer',
    description: 'Change ta voix en direct avec des voix humaines réalistes.',
    badge: 'NEW',
    accent: '#22d3ee',
    gradient: 'linear-gradient(135deg, rgba(34,211,238,0.18), rgba(37,99,235,0.10))',
    Preview: VoiceChangerPreview,
  },
  {
    href: '/dashboard/voice-translator',
    icon: Languages,
    title: 'Voice Traducteur',
    description: 'Traduis et transforme ta voix en direct dans plusieurs langues.',
    badge: 'NEW',
    accent: '#2563eb',
    gradient: 'linear-gradient(135deg, rgba(37,99,235,0.18), rgba(139,92,246,0.12))',
    Preview: VoiceTranslatorPreview,
  },
  {
    href: '/dashboard/photo-video',
    icon: ImageIcon,
    title: 'Photos en Vidéo',
    description: 'Anime tes photos avec l’IA et crée des vidéos réalistes.',
    badge: 'NEW',
    accent: '#f97316',
    gradient: 'linear-gradient(135deg, rgba(249,115,22,0.16), rgba(233,30,140,0.10))',
    Preview: PhotoVideoPreview,
  },
  {
    href: '/dashboard/video-translation',
    icon: Film,
    title: 'Traduction de Vidéo',
    description: 'Traduis et double tes vidéos automatiquement dans toutes les langues.',
    badge: 'NEW',
    accent: '#8b5cf6',
    gradient: 'linear-gradient(135deg, rgba(139,92,246,0.18), rgba(34,211,238,0.10))',
    Preview: VideoTranslationPreview,
  },
]

function Badge({ kind, accent }: { kind: NonNullable<Tool['badge']>; accent: string }) {
  const label = kind === 'NEW' ? 'Nouveau' : kind === 'ACTIF' ? 'Actif' : 'Pro'
  return (
    <span
      className="rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide backdrop-blur"
      style={{ backgroundColor: `${accent}22`, color: accent }}
    >
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
          className={`group relative flex flex-col overflow-hidden rounded-3xl border border-hairline bg-card transition-all duration-300 hover:-translate-y-1.5 hover:border-white/20 hover:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.6)] ${
            tool.featured ? 'sm:col-span-2 lg:col-span-1' : ''
          }`}
        >
          {/* Halo coloré au survol */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-60"
            style={{ background: `radial-gradient(circle, ${tool.accent}40, transparent 70%)` }}
          />

          {/* Zone aperçu avec dégradé doux */}
          <div className="relative p-3">
            <div
              className="relative flex h-40 items-center justify-center overflow-hidden rounded-2xl border border-hairline"
              style={{ background: tool.gradient }}
            >
              {/* léger grain lumineux */}
              <div
                aria-hidden
                className="absolute inset-0 opacity-60"
                style={{ background: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.08), transparent 60%)' }}
              />
              <div className="relative w-full max-w-[260px] px-4">
                <tool.Preview />
              </div>
              {tool.badge && (
                <div className="absolute right-3 top-3">
                  <Badge kind={tool.badge} accent={tool.accent} />
                </div>
              )}
            </div>
          </div>

          {/* Contenu */}
          <div className="flex flex-1 flex-col px-5 pb-5 pt-1">
            <div className="mb-3 flex items-center gap-3">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
                style={{ backgroundColor: `${tool.accent}1f` }}
              >
                <tool.icon className="h-[22px] w-[22px]" style={{ color: tool.accent }} />
              </div>
              <h3 className="text-lg font-bold text-foreground text-balance">{tool.title}</h3>
            </div>

            <p className="mb-5 flex-1 text-sm leading-relaxed text-muted-foreground text-pretty">
              {tool.description}
            </p>

            {/* CTA */}
            <span
              className="inline-flex items-center gap-2 text-sm font-bold transition-colors"
              style={{ color: tool.accent }}
            >
              Ouvrir
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
            </span>
          </div>
        </Link>
      ))}
    </div>
  )
}
