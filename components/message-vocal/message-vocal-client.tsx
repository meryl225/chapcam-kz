'use client'

import { useState } from 'react'
import { Mic, Type, Sparkles } from 'lucide-react'
import type { CatalogVoice, VoiceCatalog } from '@/lib/message-vocal/voices'
import { VoiceChangerTab } from './voice-changer-tab'
import { TextToSpeechTab } from './text-to-speech-tab'

type Tab = 'changer' | 'tts'

export function MessageVocalClient({ catalog }: { catalog: VoiceCatalog }) {
  const [tab, setTab] = useState<Tab>('changer')
  const [selectedVoice, setSelectedVoice] = useState<CatalogVoice | null>(null)

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:py-10">
      {/* En-tete premium (fond sombre, cyan/violet, badge NOUVEAU) */}
      <div className="relative mb-6 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0d1424] to-[#070c18] p-6 md:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#00d4ff]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-[#8b5cf6]/20 blur-3xl" />

        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#8b5cf6]/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#c4b5fd]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#8b5cf6]" /> Nouveau
          </span>
          <div className="mt-4 flex items-center gap-3">
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white"
              style={{ background: 'linear-gradient(135deg, #00d4ff, #8b5cf6)', boxShadow: '0 10px 30px -8px #8b5cf6' }}
            >
              <Sparkles className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-white md:text-3xl">Message Vocal</h1>
            </div>
          </div>
          <p className="mt-3 max-w-lg text-pretty text-sm leading-relaxed text-slate-300">
            Transformez votre voix naturellement ou créez un message vocal à partir d&apos;un texte.
          </p>
        </div>
      </div>

      {/* Onglets */}
      <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-1.5">
        <TabButton active={tab === 'changer'} onClick={() => setTab('changer')} icon={Mic} label="Changer ma voix" />
        <TabButton active={tab === 'tts'} onClick={() => setTab('tts')} icon={Type} label="Texte vers voix" />
      </div>

      {catalog.fallback && (
        <p className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
          Catalogue de secours affiché. Pour la liste complète des voix (dont les voix françaises), donnez la permission de lecture des voix à la clé ElevenLabs.
        </p>
      )}

      {tab === 'changer' ? (
        <VoiceChangerTab groups={catalog.groups} selectedVoice={selectedVoice} onSelectVoice={setSelectedVoice} />
      ) : (
        <TextToSpeechTab groups={catalog.groups} selectedVoice={selectedVoice} onSelectVoice={setSelectedVoice} />
      )}
    </div>
  )
}

function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: React.ElementType; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all ${
        active ? 'text-white' : 'text-muted-foreground hover:text-foreground'
      }`}
      style={active ? { background: 'linear-gradient(135deg, #00d4ff, #8b5cf6)', boxShadow: '0 8px 24px -12px #8b5cf6' } : undefined}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )
}
