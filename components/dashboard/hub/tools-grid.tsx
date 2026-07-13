import Link from 'next/link'
import { Zap, Languages, ImageIcon, Film, Monitor, Smartphone, ArrowRight } from 'lucide-react'
import {
  LiveSwapPreview,
  VoiceTranslatorPreview,
  PhotoVideoPreview,
  VideoTranslationPreview,
  DesktopPCPreview,
  EsimPreview,
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
    href: '/numbers',
    icon: Smartphone,
    title: 'ESIM ChapCam',
    description: 'Achète des numéros virtuels dans 150+ pays et reçois tes SMS en ligne.',
    badge: 'NEW',
    accent: '#2563eb',
    gradient: 'linear-gradient(135deg, rgba(37,99,235,0.20), rgba(96,165,250,0.12) 55%, rgba(37,99,235,0.10))',
    Preview: EsimPreview,
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
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] backdrop-blur-md"
      style={{
        backgroundColor: `${accent}14`,
        borderColor: `${accent}33`,
        color: accent,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent, boxShadow: `0 0 8px ${accent}` }} />
      {label}
    </span>
  )
}

function OpenCta({ accent }: { accent: string }) {
  return (
    <span
      className="inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-semibold transition-all duration-300 group-hover:gap-3"
      style={{ color: accent, borderColor: `${accent}33`, backgroundColor: `${accent}12` }}
    >
      Ouvrir
      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
    </span>
  )
}

function PreviewTile({ tool, className }: { tool: Tool; className?: string }) {
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-[20px] border border-white/[0.06] ${className ?? ''}`}
      style={{ background: tool.gradient }}
    >
      {/* léger grain lumineux */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-70"
        style={{ background: 'radial-gradient(circle at 30% 15%, rgba(255,255,255,0.10), transparent 60%)' }}
      />
      {/* vignette basse pour la profondeur */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-16"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.35), transparent)' }}
      />
      <div className="relative w-full max-w-[260px] px-3 transition-transform duration-500 group-hover:scale-[1.03]">
        <tool.Preview />
      </div>
    </div>
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
          className={`group relative flex flex-col overflow-hidden rounded-[26px] border border-white/[0.08] p-px transition-all duration-500 hover:-translate-y-1.5 hover:border-[var(--accent)]/40 hover:shadow-[0_30px_80px_-30px_var(--accent)] ${
            tool.featured ? 'sm:col-span-2 lg:col-span-1' : ''
          }`}
        >
          {/* Fond dégradé sombre teinté par l'accent */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[26px]"
            style={{
              background: `radial-gradient(120% 90% at 50% -10%, ${tool.accent}1f, transparent 55%), linear-gradient(180deg, rgba(255,255,255,0.03), transparent 40%), var(--color-card, #0b0f19)`,
            }}
          />
          {/* Liseré supérieur lumineux */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-8 top-0 h-px opacity-40 transition-opacity duration-500 group-hover:opacity-100"
            style={{ background: `linear-gradient(90deg, transparent, ${tool.accent}, transparent)` }}
          />
          {/* Halo coloré au survol */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-70"
            style={{ background: `radial-gradient(circle, ${tool.accent}55, transparent 70%)` }}
          />

          {/* Pastille de statut (en ligne) */}
          <span
            aria-hidden
            className="absolute right-4 top-4 z-10 h-2.5 w-2.5 rounded-full bg-[#22c55e]"
            style={{ boxShadow: '0 0 10px #22c55e' }}
          />

          {tool.featured ? (
            /* ---------- Mise en page verticale (mise en avant) ---------- */
            <div className="relative flex flex-1 flex-col">
              <div className="relative p-3.5 pb-1">
                <PreviewTile tool={tool} className="h-40" />
                {tool.badge && (
                  <div className="absolute left-6 top-6">
                    <Badge kind={tool.badge} accent={tool.accent} />
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
                <div className="mb-2.5 flex items-center gap-3">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition-all duration-300 group-hover:scale-110"
                    style={{
                      backgroundColor: `${tool.accent}1a`,
                      borderColor: `${tool.accent}2e`,
                      boxShadow: `inset 0 1px 0 ${tool.accent}22`,
                    }}
                  >
                    <tool.icon className="h-[22px] w-[22px]" style={{ color: tool.accent }} strokeWidth={2.25} />
                  </div>
                  <h3 className="text-[17px] font-semibold tracking-tight text-foreground text-balance">{tool.title}</h3>
                </div>
                <p className="mb-5 flex-1 text-[13px] leading-relaxed text-muted-foreground text-pretty">
                  {tool.description}
                </p>
                <OpenCta accent={tool.accent} />
              </div>
            </div>
          ) : (
            /* ---------- Mise en page horizontale ---------- */
            <div className="relative flex flex-1 flex-col p-5 pr-8">
              <div className="flex items-start gap-4">
                <div className="w-[42%] max-w-[190px] shrink-0">
                  <PreviewTile tool={tool} className="aspect-square" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col pt-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h3 className="text-[17px] font-semibold tracking-tight text-foreground text-balance">
                      {tool.title}
                    </h3>
                    {tool.badge && <Badge kind={tool.badge} accent={tool.accent} />}
                  </div>
                  <p className="text-[13px] leading-relaxed text-muted-foreground text-pretty">
                    {tool.description}
                  </p>
                </div>
              </div>
              <div className="mt-5">
                <OpenCta accent={tool.accent} />
              </div>
            </div>
          )}
        </Link>
      ))}
    </div>
  )
}
