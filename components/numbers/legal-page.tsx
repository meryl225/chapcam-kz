import Link from 'next/link'
import { Phone, ArrowLeft } from 'lucide-react'

export type LegalSection = { heading: string; body: string[] }

export function LegalPage({ title, updated, intro, sections }: { title: string; updated: string; intro: string; sections: LegalSection[] }) {
  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      <header className="border-b border-white/10 bg-[#0a0e1a]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link href="/numbers" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2563EB]"><Phone className="h-4 w-4 text-white" /></span>
            <span className="text-base font-semibold text-white">ChapCam Numbers</span>
          </Link>
          <Link href="/numbers" className="inline-flex items-center gap-1.5 text-sm text-slate-300 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#60a5fa]">Legal</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">Last updated {updated}</p>
        <p className="mt-6 text-pretty leading-relaxed text-slate-300">{intro}</p>

        <div className="mt-10 flex flex-col gap-8">
          {sections.map((s, i) => (
            <section key={s.heading}>
              <h2 className="text-lg font-semibold text-white">{i + 1}. {s.heading}</h2>
              {s.body.map((p, j) => (
                <p key={j} className="mt-3 text-sm leading-relaxed text-slate-400">{p}</p>
              ))}
            </section>
          ))}
        </div>

        <div className="mt-12 rounded-xl border border-white/10 bg-white/5 p-5 text-sm text-slate-400">
          Questions about this document? Contact{' '}
          <a href="mailto:legal@chapcam.com" className="font-medium text-[#60a5fa] hover:text-[#93c5fd]">legal@chapcam.com</a>.
        </div>
      </main>
    </div>
  )
}
