import Link from 'next/link'
import {
  Zap,
  Video,
  Mic,
  Languages,
  ImageIcon,
  Film,
  ArrowRight,
} from 'lucide-react'

interface Tool {
  href: string
  icon: React.ElementType
  title: string
  description: string
  badge?: 'NEW' | 'PRO' | 'ACTIF'
  accent: string // tailwind color base e.g. "#00ff88"
  glow: string // rgba glow
  buttonClass: string
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
    buttonClass: 'bg-[#00ff88] text-black hover:bg-[#00dd77]',
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
  },
]

function Badge({ kind }: { kind: NonNullable<Tool['badge']> }) {
  const styles: Record<string, string> = {
    NEW: 'bg-[#00ff88]/15 text-[#00ff88]',
    PRO: 'bg-violet-500/20 text-violet-300',
    ACTIF: 'bg-[#00ff88]/15 text-[#00ff88]',
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
        <div
          key={tool.href}
          className="group relative flex flex-col rounded-2xl border border-white/10 bg-[#111] p-5 transition-all duration-200 hover:border-white/20 hover:bg-[#141414]"
        >
          {/* Header: icon tile + badge */}
          <div className="mb-4 flex items-start justify-between">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl"
              style={{ backgroundColor: tool.glow }}
            >
              <tool.icon className="h-6 w-6" style={{ color: tool.accent }} />
            </div>
            {tool.badge && <Badge kind={tool.badge} />}
          </div>

          {/* Title + description */}
          <h3 className="mb-1.5 text-lg font-bold text-white text-balance">{tool.title}</h3>
          <p className="mb-5 flex-1 text-sm leading-relaxed text-gray-400 text-pretty">
            {tool.description}
          </p>

          {/* CTA */}
          <Link
            href={tool.href}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${tool.buttonClass}`}
          >
            Ouvrir
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ))}
    </div>
  )
}
