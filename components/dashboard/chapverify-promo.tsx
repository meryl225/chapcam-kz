import Link from 'next/link'
import { ArrowRight, ShieldCheck, ImageIcon, AudioLines, Video } from 'lucide-react'
import { T } from '@/components/i18n/t'

const MEDIA = [
  { icon: ImageIcon, label: 'Image' },
  { icon: AudioLines, label: 'Voix' },
  { icon: Video, label: 'Vidéo' },
]

export function ChapVerifyPromo() {
  return (
    <Link
      href="/dashboard/chapverify"
      aria-label="Ouvrir ChapVerify : détecte les deepfakes générés par IA"
      className="group relative mb-8 block overflow-hidden rounded-[24px] border border-red-600/40 bg-gradient-to-br from-[#1c0a0c] via-[#140809] to-[#0b0708] p-6 shadow-[0_16px_50px_-20px_rgba(220,38,38,0.55)] transition-all duration-300 hover:-translate-y-0.5 hover:border-red-500/70 hover:shadow-[0_26px_70px_-22px_rgba(220,38,38,0.85)] md:p-8"
    >
      {/* halos rouges */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full opacity-60 blur-3xl transition-opacity duration-500 group-hover:opacity-90"
        style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.45), transparent 70%)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full opacity-30 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.35), transparent 70%)' }}
      />
      {/* grille de scan discrète */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(239,68,68,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(239,68,68,0.6) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-5">
          {/* Bouclier radar animé */}
          <div className="relative hidden h-20 w-20 shrink-0 items-center justify-center sm:flex">
            <span
              aria-hidden
              className="absolute inset-0 rounded-2xl border border-red-500/40"
            />
            <span
              aria-hidden
              className="absolute inset-0 animate-ping rounded-2xl border border-red-500/30"
              style={{ animationDuration: '2.4s' }}
            />
            <span
              aria-hidden
              className="absolute inset-2 rounded-xl bg-red-600/15"
            />
            <ShieldCheck className="relative h-10 w-10 text-red-400" strokeWidth={2.4} />
          </div>

          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-300 ring-1 ring-red-500/40">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
              <T>Anti-deepfake</T>
            </span>

            <h3 className="mt-2 text-2xl font-extrabold tracking-tight text-white md:text-3xl">
              Chap<span className="text-red-500">Verify</span>
            </h3>

            <p className="mt-1.5 max-w-md text-sm leading-relaxed text-white/60 text-pretty">
              <T>Une image, une voix ou une vidéo te paraît suspecte ? Vérifie en un clic si c’est un deepfake généré par IA.</T>
            </p>

            {/* tags médias supportés */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {MEDIA.map((m) => (
                <span
                  key={m.label}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold text-white/75"
                >
                  <m.icon className="h-3 w-3 text-red-400" />
                  <T>{m.label}</T>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <span className="relative inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-2xl bg-gradient-to-r from-red-600 to-red-500 px-6 py-3.5 text-sm font-bold text-white shadow-[0_10px_30px_-10px_rgba(220,38,38,0.9)] transition-all group-hover:brightness-110 md:self-auto md:text-base">
          <ShieldCheck className="h-5 w-5" />
          <T>Vérifier un fichier</T>
          <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  )
}
