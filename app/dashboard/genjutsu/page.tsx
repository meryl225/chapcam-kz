'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Check, Clapperboard, Film, ImagePlus, Loader2, Sparkles, Upload, Video, WandSparkles } from 'lucide-react'
import { GENJUTSU_MAX_DURATION_SECONDS, GENJUTSU_PROVIDER_COST_PER_SECOND_USD } from '@/lib/tool-costs'

const EXAMPLES = [
  'Un mouvement de caméra lent vers le visage, sourire naturel et cheveux animés par une légère brise.',
  'La personne marche vers la caméra avec une énergie cinématique, mouvement fluide et regard assuré.',
  'Zoom arrière doux avec un léger mouvement de tête et une lumière de studio qui scintille.',
]

export default function GenjutsuPage() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [prompt, setPrompt] = useState(EXAMPLES[0])
  const [reference, setReference] = useState<File | null>(null)
  const [referencePreview, setReferencePreview] = useState<string | null>(null)
  const [quality, setQuality] = useState<'720p' | '1080p'>('720p')
  const [durationSeconds, setDurationSeconds] = useState(10)
  const [enhance, setEnhance] = useState(true)
  const [motions, setMotions] = useState<Array<{ id: string; name: string; description?: string }>>([])
  const [selectedMotions, setSelectedMotions] = useState<string[]>([])
  const [showMotions, setShowMotions] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [uploadingReference, setUploadingReference] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/motion?info=motions')
      .then((response) => response.ok ? response.json() : { motions: [] })
      .then((result) => {
        if (!cancelled && Array.isArray(result.motions)) setMotions(result.motions.filter((motion: unknown): motion is { id: string; name: string; description?: string } => {
          if (!motion || typeof motion !== 'object') return false
          const item = motion as { id?: unknown; name?: unknown }
          return typeof item.id === 'string' && typeof item.name === 'string'
        }))
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview)
    if (referencePreview) URL.revokeObjectURL(referencePreview)
  }, [preview, referencePreview])

  const chooseFile = (next: File | null, isReference = false) => {
    if (!next) return
    const url = URL.createObjectURL(next)
    if (isReference) {
      if (referencePreview) URL.revokeObjectURL(referencePreview)
      setReference(next)
      setReferencePreview(url)
    } else {
      if (preview) URL.revokeObjectURL(preview)
      setFile(next)
      setPreview(url)
    }
  }

  const generate = async () => {
    if (!file || !prompt.trim()) {
      setMessage('Ajoute une image et décris le mouvement souhaité.')
      return
    }
    setLoading(true)
    setMessage('Genjutsu prépare votre animation…')
    const body = new FormData()
    body.append('file', file)
    body.append('prompt', prompt.trim())
    body.append('model', 'genjutsu')
    body.append('quality', quality)
    body.append('durationSeconds', String(durationSeconds))
    body.append('enhance', String(enhance))
    if (selectedMotions.length > 0) body.append('motions', JSON.stringify(selectedMotions))
  try {
      if (reference) {
        setUploadingReference(true)
        const uploadResponse = await fetch('/api/motion/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contentType: reference.type }) })
        const upload = await uploadResponse.json().catch(() => ({}))
        if (!uploadResponse.ok || typeof upload.signedUrl !== 'string') throw new Error(upload.error || 'Impossible de préparer la vidéo.')
        const putResponse = await fetch(upload.signedUrl, { method: 'PUT', headers: { 'Content-Type': reference.type }, body: reference })
        if (!putResponse.ok) throw new Error('Échec de l’upload de la vidéo de référence.')
        body.append('referenceVideoUrl', typeof upload.publicUrl === 'string' ? upload.publicUrl : '')
      }
      const response = await fetch('/api/motion', { method: 'POST', body })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        const detail = [result.error, result.detail].filter((value): value is string => typeof value === 'string' && Boolean(value.trim())).join(' — ')
        throw new Error(detail || `La génération a échoué (HTTP ${response.status}).`)
      }
      setMessage('Génération lancée. Retrouvez le résultat dans votre historique Motion.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Une erreur est survenue.')
    } finally {
      setUploadingReference(false)
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground md:px-8 lg:px-10 dark:bg-[#08090d] dark:text-white">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-5 border-b border-white/10 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#c6f542]"><Sparkles className="h-4 w-4" /> ChapCam Studio</div>
            <h1 className="text-balance text-4xl font-black tracking-tight md:text-6xl">Genjutsu <span className="text-[#c6f542]">Motion Transfer</span></h1>
            <p className="mt-3 max-w-2xl text-base leading-6 text-white/55">Anime une image avec un mouvement naturel et cinématique grâce au moteur vidéo ChapCam.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-white/55"><span className="rounded-full border border-[#c6f542]/30 bg-[#c6f542]/10 px-3 py-1.5 text-[#c6f542]">Genjutsu v1.0</span><span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">{Math.ceil(GENJUTSU_PROVIDER_COST_PER_SECOND_USD * 2 * 60 * durationSeconds)} Jetons · {durationSeconds}s</span></div>
        </header>

        <section className="mb-5 overflow-hidden rounded-3xl border border-[#c6f542]/20 bg-[#c6f542]/[0.05] p-4 md:p-5" aria-labelledby="genjutsu-demo-title">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-[#c6f542]"><Film className="h-4 w-4" /><h2 id="genjutsu-demo-title">Découvrez Genjutsu</h2></div>
          <video className="max-h-[420px] w-full rounded-2xl bg-black object-contain" controls muted loop playsInline preload="metadata">
            <source src="/videos/genjutsu-demo.mov" type="video/mp4" />
            Votre navigateur ne prend pas en charge la vidéo Genjutsu.
          </video>
        </section>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-4 shadow-2xl shadow-black/20 md:p-6">
            <div className="mb-5 flex items-center justify-between"><div><h2 className="text-xl font-bold">Créer une animation</h2><p className="mt-1 text-sm text-white/45">Donnez vie à votre image en quelques secondes.</p></div><WandSparkles className="h-6 w-6 text-[#c6f542]" /></div>
            <div className="grid gap-4 md:grid-cols-2">
              <button type="button" onClick={() => inputRef.current?.click()} className="group flex min-h-72 flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/25 bg-white/[0.03] p-5 text-center transition duration-200 hover:-translate-y-0.5 hover:border-[#c6f542]/80 hover:bg-[#c6f542]/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c6f542]">
                {preview ? <img src={preview} alt="Image sujet sélectionnée" className="h-full max-h-72 w-full object-cover" /> : <><ImagePlus className="mb-3 h-10 w-10 text-[#c6f542]" /><strong>Image sujet</strong><span className="mt-2 text-xs text-white/40">JPG, PNG ou WebP · requis</span><span className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition group-hover:border-[#c6f542]/40 group-hover:bg-[#c6f542]/15"><Upload className="h-3.5 w-3.5" /> Importer une image</span></>}
              </button>
              <button type="button" onClick={() => document.getElementById('reference-video')?.click()} className="group flex min-h-72 flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/25 bg-white/[0.03] p-5 text-center transition duration-200 hover:-translate-y-0.5 hover:border-[#c6f542]/80 hover:bg-[#c6f542]/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c6f542]">
                {referencePreview ? <video src={referencePreview} controls className="h-full max-h-72 w-full object-cover" /> : <><Video className="mb-3 h-10 w-10 text-white/50" /><strong>Vidéo de mouvement</strong><span className="mt-2 text-center text-xs text-white/40">Optionnelle · jusqu'à 30 secondes</span><span className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition group-hover:border-[#c6f542]/40 group-hover:bg-[#c6f542]/15"><Upload className="h-3.5 w-3.5" /> Importer une vidéo</span></>}
              </button>
            </div>
            <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} />
            <input id="reference-video" type="file" accept="video/mp4,video/webm" className="hidden" onChange={(event) => chooseFile(event.target.files?.[0] ?? null, true)} />
            <label className="mt-5 block text-sm font-semibold text-white/80">Décris le mouvement <span className="text-[#c6f542]">*</span><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} maxLength={500} rows={4} className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-black/25 p-4 text-sm leading-6 text-white outline-none transition placeholder:text-white/25 focus:border-[#c6f542]/60" placeholder="Ex. La caméra avance lentement…" /><span className="mt-1 block text-right text-xs text-white/35">{prompt.length}/500</span></label>
            <div className="mt-5 space-y-4 border-t border-white/10 pt-5">
              <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-semibold">Amélioration intelligente</p><p className="mt-1 text-xs text-white/40">Optimise automatiquement la description du mouvement.</p></div><button type="button" role="switch" aria-checked={enhance} onClick={() => setEnhance((value) => !value)} className={`relative h-6 w-11 rounded-full transition ${enhance ? 'bg-[#c6f542]' : 'bg-white/15'}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-black transition ${enhance ? 'left-6' : 'left-1'}`} /></button></div>
              {motions.length > 0 && <div><div className="flex items-center justify-between gap-4"><div><p className="text-sm font-semibold">Presets de mouvement</p><p className="mt-1 text-xs text-white/40">Sélectionne jusqu’à 3 mouvements caméra.</p></div><button type="button" aria-expanded={showMotions} onClick={() => setShowMotions((value) => !value)} className="shrink-0 rounded-xl border border-[#c6f542]/35 bg-[#c6f542]/10 px-4 py-2.5 text-xs font-bold text-[#e4f9a1] shadow-sm transition hover:border-[#c6f542] hover:bg-[#c6f542]/20 hover:text-[#c6f542] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c6f542]">{showMotions ? 'Masquer' : 'Voir les presets'}</button></div>{showMotions && <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-black/15 p-3"><div className="flex flex-wrap gap-2">{motions.map((motion) => { const selected = selectedMotions.includes(motion.id); return <button key={motion.id} type="button" title={motion.description} onClick={() => setSelectedMotions((current) => selected ? current.filter((id) => id !== motion.id) : current.length < 3 ? [...current, motion.id] : current)} className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${selected ? 'border-[#c6f542] bg-[#c6f542]/15 text-[#c6f542]' : 'border-white/10 bg-white/5 text-white/55 hover:border-[#c6f542]/40'}`}>{motion.name}</button> })}</div></div>}</div>}
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5"><div><span className="text-sm font-semibold">Qualité de sortie</span><p className="mt-1 text-xs text-white/40">Tarif : {Math.ceil(GENJUTSU_PROVIDER_COST_PER_SECOND_USD * 2 * 60 * durationSeconds)} Jetons · {Math.ceil(GENJUTSU_PROVIDER_COST_PER_SECOND_USD * 2 * 60 * durationSeconds) * 10} FCFA pour {durationSeconds}s</p><div className="mt-2 flex flex-wrap gap-2">{(['720p', '1080p'] as const).map((value) => <button key={value} type="button" onClick={() => setQuality(value)} className={`rounded-lg border px-4 py-2 text-xs font-bold transition ${quality === value ? 'border-[#c6f542] bg-[#c6f542]/20 text-[#e4f9a1] shadow-[0_0_16px_rgba(198,245,66,0.15)]' : 'border-white/20 bg-white/[0.06] text-white/75 hover:border-white/40 hover:bg-white/10'}`}>{value}</button>)}</div><label className="mt-3 block text-xs font-semibold text-white/65">Durée de la vidéo <select value={durationSeconds} onChange={(event) => setDurationSeconds(Math.min(GENJUTSU_MAX_DURATION_SECONDS, Math.max(1, Number(event.target.value))))} className="ml-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white outline-none"><option value={5}>5 secondes</option><option value={10}>10 secondes</option><option value={15}>15 secondes</option><option value={20}>20 secondes</option><option value={25}>25 secondes</option><option value={30}>30 secondes (maximum)</option></select></label></div><button type="button" onClick={generate} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-[#dfff78] bg-[#c6f542] px-6 py-3.5 font-black text-[#10140a] shadow-[0_8px_24px_rgba(198,245,66,0.2)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#d8ff68] hover:shadow-[0_12px_30px_rgba(198,245,66,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c6f542] focus-visible:ring-offset-2 focus-visible:ring-offset-[#101114] disabled:cursor-wait disabled:opacity-60">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clapperboard className="h-4 w-4" />}{loading ? 'Génération…' : 'Générer avec Genjutsu'}<ArrowUpRight className="h-4 w-4" /></button></div>
            {message && <p role="status" className="mt-4 rounded-xl border border-[#c6f542]/20 bg-[#c6f542]/10 p-3 text-sm text-[#e4f9a1]">{message}</p>}
          </section>

          <aside className="space-y-5"><section className="rounded-3xl border border-[#c6f542]/20 bg-[#c6f542]/[0.06] p-5"><div className="mb-4 flex items-center gap-3"><div className="rounded-xl bg-[#c6f542] p-2 text-black"><Film className="h-5 w-5" /></div><div><h2 className="font-bold">Genjutsu</h2><p className="text-xs text-white/45">Motion transfer intelligent</p></div></div><ul className="space-y-3 text-sm text-white/65"><li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-[#c6f542]" /> Mouvement naturel et fluide</li><li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-[#c6f542]" /> Image sujet jusqu'à 720p</li><li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-[#c6f542]" /> Vidéo de référence optionnelle</li><li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-[#c6f542]" /> Historique sauvegardé automatiquement</li></ul></section><section className="rounded-3xl border border-white/10 bg-white/[0.035] p-5"><h2 className="font-bold">Conseils pour un bon résultat</h2><p className="mt-3 text-sm leading-6 text-white/50">Décris la caméra, le sujet et la vitesse du mouvement. Une vidéo de référence courte aide Genjutsu à reproduire précisément la gestuelle.</p><div className="mt-4 space-y-2">{EXAMPLES.map((example) => <button key={example} type="button" onClick={() => setPrompt(example)} className="w-full rounded-xl border border-white/10 bg-black/20 p-3 text-left text-xs leading-5 text-white/55 transition hover:border-[#c6f542]/40 hover:text-white/80">{example}</button>)}</div></section></aside>
        </div>
      </div>
    </main>
  )
}
