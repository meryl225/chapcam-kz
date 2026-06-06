import Link from 'next/link'
import { Zap, Video, Mic, Languages, ImageIcon, Film, Monitor, ArrowRight } from 'lucide-react'
import {
  LiveSwapPreview,
  LiveProPreview,
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
  glow: string
  buttonClass: string
  Preview: React.ComponentType
}

const tools: Tool[] = [
  {
    href: '/dashboard/live-swap',
    icon: Zap,
    title: 'Live Swap',
    description: 'Transformez votre apparence en temps réel avec l’IA.',
    badge: 'ACTIF',
    accent: '#00ff88',
    glow: 'rgba(0,255,136,0.18)',
    buttonClass: 'bg-primary text-black hover:bg-primary/90',
    Preview: LiveSwapPreview,
  },
  {
    href: '/live',
    icon: Video,
    title: 'Live Pro',
    description: 'Diffusez en haute qualité avec votre avatar en temps réel.',
    badge: 'PRO',
    accent: '#8b5cf6',
    glow: 'rgba(139,92,246,0.18)',
    buttonClass: 'bg-violet-600 text-white hover:bg-violet-700',
    Preview: LiveProPreview,
  },
  {
    href: '/dashboard/chapcam-pc',
    icon: Monitor,
    title: 'ChapCam PC — Logiciel a vie',
    description: 'Le logiciel ChapCam sur ton PC, sans abonnement ni cloud. Achat unique, licence à vie.',
    badge: 'NEW',
    accent: '#00ff88',
    glow: 'rgba(0,255,136,0.18)',
    buttonClass: 'bg-primary text-black hover:bg-primary/90',
    Preview: DesktopPCPreview,
  },
  {
    href: '/dashboard/voice-changer',
    icon: Mic,
    title: 'Voice Changer V1',
    description: 'Transformez votre voix en temps réel avec des voix humaines réelles.',
    badge: 'NEW',
    accent: '#22d3ee',
    glow: 'rgba(34,211,238,0.18)',
    buttonClass: 'bg-cyan-500 text-black hover:bg-cyan-400',
    Preview: VoiceChangerPreview,
  },
  {
    href: '/dashboard/voice-translator',
    icon: Languages,
    title: 'Voice Changer Traducteur',
    description: 'Traduisez et transformez votre voix en direct dans plusieurs langues.',
    badge: 'NEW',
    accent: '#2563eb',
    glow: 'rgba(37,99,235,0.18)',
    buttonClass: 'bg-[#2563eb] text-white hover:bg-[#1d4ed8]',
    Preview: VoiceTranslatorPreview,
  },
  {
    href: '/dashboard/photo-video',
    icon: ImageIcon,
    title: 'Modifications Photos en Vidéo',
    description: 'Animez vos photos avec l’IA et créez des vidéos réalistes.',
    badge: 'NEW',
    accent: '#f97316',
    glow: 'rgba(249,115,22,0.18)',
    buttonClass: 'bg-orange-500 text-white hover:bg-orange-600',
    Preview: PhotoVideoPreview,
  },
  {
    href: '/dashboard/video-translation',
    icon: Film,
    title: 'Traduction de Vidéo',
    description: 'Traduisez et doublez vos vidéos automatiquement dans toutes les langues.',
    badge: 'NEW',
    accent: '#2563eb',
    glow: 'rgba(37,99,235,0.18)',
    buttonClass: 'bg-[#2563eb] text-white hover:bg-[#1d4ed8]',
    Preview: VideoTranslationPreview,
  },
]

function Badge({ kind }: { kind: NonNullable<Tool['badge']> }) {
  const styles: Record<string, string> = {
    NEW: 'bg-primary/15 text-primary',
    PRO: 'bg-violet-500/20 text-violet-300',
    ACTIF: 'bg-primary/15 text-primary',
  }
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${styles[kind]}`}>
      {kind === 'NEW' ? 'Nouveau' : kind === 'ACTIF' ? 'Actif' : 'Pro'}
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
          className="group relative flex flex-col rounded-2xl border border-hairline bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:bg-card hover:shadow-[0_12px_40px_-12px_rgba(0,255,136,0.35)]"
        >
          {/* Header: icon tile + badge */}
          <div className="mb-4 flex items-start justify-between">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
              style={{ backgroundColor: tool.glow }}
            >
              <tool.icon className="h-6 w-6" style={{ color: tool.accent }} />
            </div>
            {tool.badge && <Badge kind={tool.badge} />}
          </div>

          {/* Title + description */}
          <h3 className="mb-1.5 text-lg font-bold text-foreground text-balance">{tool.title}</h3>
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground text-pretty">
            {tool.description}
          </p>

          {/* Aperçu visuel */}
          <div className="mb-5 flex-1">
            <tool.Preview />
          </div>

          {/* CTA */}
          <span
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${tool.buttonClass}`}
          >
            Ouvrir
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </span>
        </Link>
      ))}
    </div>
  )
}
