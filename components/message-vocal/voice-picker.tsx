'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Play, Pause, Check, Search, Star, Globe, ChevronDown } from 'lucide-react'
import type { CatalogVoice, VoiceCategory, VoiceGroup } from '@/lib/message-vocal/voices'

interface VoicePickerProps {
  groups: VoiceGroup[]
  selectedId: string | null
  onSelect: (voice: CatalogVoice) => void
  accent?: string
}

export function VoicePicker({ groups, selectedId, onSelect, accent = '#00d4ff' }: VoicePickerProps) {
  const [query, setQuery] = useState('')
  const [previewId, setPreviewId] = useState<string | null>(null)
  // Categories depliees (accordion). Par defaut tout est replie : l'utilisateur
  // clique sur une categorie pour voir ses voix, ce qui allege fortement la page.
  const [openCats, setOpenCats] = useState<Set<VoiceCategory>>(new Set())
  const previewRef = useRef<HTMLAudioElement | null>(null)

  // Voix actuellement selectionnee (pour le bandeau recap + ouverture auto).
  const selectedVoice = useMemo(
    () => groups.flatMap((g) => g.voices).find((v) => v.id === selectedId) ?? null,
    [groups, selectedId],
  )

  // A la selection d'une voix, on ouvre sa categorie pour qu'elle reste visible.
  useEffect(() => {
    if (selectedVoice) setOpenCats((prev) => new Set(prev).add(selectedVoice.category))
  }, [selectedVoice])

  const isSearching = query.trim().length > 0

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return groups
    return groups
      .map((g) => ({
        ...g,
        voices: g.voices.filter(
          (v) =>
            v.name.toLowerCase().includes(q) ||
            v.languageLabel.toLowerCase().includes(q) ||
            (v.accentLabel || '').toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.voices.length > 0)
  }, [groups, query])

  const toggleCat = (category: VoiceCategory) => {
    setOpenCats((prev) => {
      const next = new Set(prev)
      if (next.has(category)) next.delete(category)
      else next.add(category)
      return next
    })
  }

  const togglePreview = (voice: CatalogVoice) => {
    const a = previewRef.current
    if (!a || !voice.previewUrl) return
    if (previewId === voice.id) {
      a.pause()
      setPreviewId(null)
      return
    }
    a.src = voice.previewUrl
    void a.play().then(
      () => setPreviewId(voice.id),
      () => setPreviewId(null),
    )
  }

  return (
    <div>
      {/* Recherche */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher une voix (nom, langue, accent)…"
          className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-white/20 focus:outline-none"
        />
      </div>

      {/* Bandeau : voix actuellement selectionnee */}
      {selectedVoice && !isSearching && (
        <div
          className="mb-3 flex items-center gap-3 rounded-xl border border-transparent bg-white/[0.04] p-3"
          style={{ boxShadow: `0 0 0 1.5px ${accent}` }}
        >
          <button
            onClick={() => togglePreview(selectedVoice)}
            disabled={!selectedVoice.previewUrl}
            aria-label={`Écouter un aperçu de ${selectedVoice.shortName}`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-foreground transition-colors hover:bg-white/[0.1] disabled:opacity-40"
          >
            {previewId === selectedVoice.id ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              <span className="text-muted-foreground">Voix choisie : </span>
              {selectedVoice.shortName}
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-muted-foreground">
              <span>{selectedVoice.genderLabel}</span>
              <span className="opacity-40">•</span>
              <span>{selectedVoice.languageLabel}</span>
              {selectedVoice.accentLabel && (
                <>
                  <span className="opacity-40">•</span>
                  <span>{selectedVoice.accentLabel}</span>
                </>
              )}
            </p>
          </div>
          <span className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold text-white" style={{ background: `linear-gradient(135deg, ${accent}, #8b5cf6)` }}>
            Choisie
          </span>
        </div>
      )}

      {filtered.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Aucune voix ne correspond à votre recherche.</p>}

      <div className="space-y-2.5">
        {filtered.map((group) => {
          const isFrench = group.category.startsWith('french')
          // En recherche : toutes les categories filtrees sont ouvertes.
          const isOpen = isSearching || openCats.has(group.category)
          const hasSelected = group.voices.some((v) => v.id === selectedId)
          return (
            <div key={group.category} className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
              {/* En-tete cliquable de la categorie */}
              <button
                onClick={() => toggleCat(group.category)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-2 px-3 py-3 text-left transition-colors hover:bg-white/[0.03]"
              >
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-md"
                  style={{ backgroundColor: isFrench ? 'rgba(0,212,255,0.15)' : 'rgba(139,92,246,0.15)' }}
                >
                  {isFrench ? <Star className="h-3 w-3" style={{ color: accent }} /> : <Globe className="h-3 w-3 text-[#8b5cf6]" />}
                </span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">{group.label}</h3>
                <span className="text-[11px] font-medium text-muted-foreground">({group.voices.length})</span>
                {hasSelected && !isOpen && (
                  <span className="ml-1 flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold" style={{ color: accent, backgroundColor: 'rgba(0,212,255,0.12)' }}>
                    <Check className="h-2.5 w-2.5" /> Choisie ici
                  </span>
                )}
                <ChevronDown className={`ml-auto h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>

              {isOpen && (
                <div className="grid grid-cols-1 gap-2 border-t border-white/5 p-2.5 sm:grid-cols-2">
                  {group.voices.map((voice) => {
                    const selected = selectedId === voice.id
                    const isPreviewing = previewId === voice.id
                    return (
                      <div
                        key={voice.id}
                        className={`group flex items-center gap-3 rounded-xl border p-3 transition-all ${
                          selected ? 'border-transparent bg-white/[0.06]' : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04]'
                        }`}
                        style={selected ? { boxShadow: `0 0 0 1.5px ${accent}, 0 8px 24px -12px ${accent}` } : undefined}
                      >
                        {/* Apercu */}
                        <button
                          onClick={() => togglePreview(voice)}
                          disabled={!voice.previewUrl}
                          aria-label={isPreviewing ? `Arrêter l'aperçu de ${voice.shortName}` : `Écouter un aperçu de ${voice.shortName}`}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-foreground transition-colors hover:bg-white/[0.1] disabled:opacity-40"
                        >
                          {isPreviewing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
                        </button>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">{voice.shortName}</p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-muted-foreground">
                            <span>{voice.genderLabel}</span>
                            <span className="opacity-40">•</span>
                            <span>{voice.languageLabel}</span>
                            {voice.accentLabel && (
                              <>
                                <span className="opacity-40">•</span>
                                <span>{voice.accentLabel}</span>
                              </>
                            )}
                          </p>
                        </div>

                        {/* Choisir */}
                        <button
                          onClick={() => onSelect(voice)}
                          className={`flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all ${
                            selected ? 'text-white' : 'border border-white/10 bg-white/[0.05] text-foreground hover:bg-white/[0.1]'
                          }`}
                          style={selected ? { background: `linear-gradient(135deg, ${accent}, #8b5cf6)` } : undefined}
                        >
                          {selected ? (
                            <>
                              <Check className="h-3.5 w-3.5" /> Choisie
                            </>
                          ) : (
                            'Choisir'
                          )}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <audio ref={previewRef} onEnded={() => setPreviewId(null)} onPause={() => setPreviewId(null)} className="hidden" />
    </div>
  )
}
