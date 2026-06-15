'use client'

import { useState } from 'react'
import { useNumbers } from '@/components/numbers/numbers-provider'
import { timeAgo, type SupportTicket } from '@/lib/numbers/data'
import { LifeBuoy, Plus, X, MessageCircle, BookOpen, Mail, ChevronRight } from 'lucide-react'

const card = 'rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl'

const statusStyle: Record<SupportTicket['status'], string> = {
  open: 'bg-blue-500/15 text-blue-300',
  pending: 'bg-amber-500/15 text-amber-400',
  resolved: 'bg-emerald-500/15 text-emerald-400',
}

const priorityStyle: Record<SupportTicket['priority'], string> = {
  low: 'text-white/40',
  normal: 'text-white/60',
  high: 'text-red-400',
}

const STATUS_FR: Record<SupportTicket['status'], string> = {
  open: 'Ouvert',
  pending: 'En attente',
  resolved: 'Résolu',
}

const PRIORITY_FR: Record<SupportTicket['priority'], string> = {
  low: 'faible',
  normal: 'normale',
  high: 'haute',
}

const CATEGORIES = ['Facturation', 'Numéros', 'Réception SMS', 'API', 'Compte', 'Autre']

const FAQS = [
  { q: 'En combien de temps arrivent les messages ?', a: 'Les SMS entrants arrivent généralement en 2 à 6 secondes selon l’opérateur et le pays de destination.' },
  { q: 'Puis-je être remboursé pour un numéro ?', a: 'Les numéros temporaires ne sont pas remboursables une fois un message reçu. Les numéros longue durée peuvent être annulés avant leur renouvellement.' },
  { q: 'Quels pays sont pris en charge ?', a: 'Nous agrégeons des opérateurs dans plus de 150 pays. La disponibilité et les tarifs varient selon la région et le fournisseur.' },
]

export default function SupportPage() {
  const { tickets, createTicket } = useNumbers()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<SupportTicket | null>(null)
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [priority, setPriority] = useState<SupportTicket['priority']>('normal')
  const [body, setBody] = useState('')

  function submit() {
    if (!subject.trim() || !body.trim()) return
    createTicket(subject.trim(), category, priority, body.trim())
    setSubject('')
    setBody('')
    setOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Assistance</h1>
          <p className="text-sm text-white/50">Obtenez de l&apos;aide et suivez vos demandes</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
        >
          <Plus className="h-4 w-4" /> Nouvelle demande
        </button>
      </div>

      {/* Quick channels */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { icon: MessageCircle, title: 'Chat en direct', desc: 'Réponse moyenne en moins de 5 min' },
          { icon: Mail, title: 'E-mail', desc: 'support@chapcam.io' },
          { icon: BookOpen, title: 'Documentation', desc: 'Guides et référence API' },
        ].map((c) => (
          <div key={c.title} className={`${card} flex items-center gap-3 p-4`}>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
              <c.icon className="h-5 w-5" />
            </span>
            <div>
              <p className="font-medium text-white">{c.title}</p>
              <p className="text-sm text-white/50">{c.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* Tickets */}
        <div className={`${card} overflow-hidden`}>
          <div className="border-b border-white/5 p-5">
            <h2 className="flex items-center gap-2 font-semibold text-white">
              <LifeBuoy className="h-4 w-4 text-blue-400" /> Vos demandes
            </h2>
          </div>
          <ul className="divide-y divide-white/5">
            {tickets.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => setSelected(t)}
                  className="flex w-full items-center gap-3 p-5 text-left transition-colors hover:bg-white/[0.03]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium text-white">{t.subject}</p>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${statusStyle[t.status]}`}>
                        {STATUS_FR[t.status]}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-white/40">
                      {t.category} · <span className={priorityStyle[t.priority]}>priorité {PRIORITY_FR[t.priority]}</span> · mis à jour{' '}
                      {timeAgo(t.lastReplyAt)}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-white/30" />
                </button>
              </li>
            ))}
            {tickets.length === 0 && (
              <li className="p-8 text-center text-sm text-white/50">Aucune demande pour le moment.</li>
            )}
          </ul>
        </div>

        {/* FAQ */}
        <div className={`${card} p-5`}>
          <h2 className="mb-3 font-semibold text-white">Questions fréquentes</h2>
          <div className="space-y-3">
            {FAQS.map((f) => (
              <details key={f.q} className="group rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <summary className="cursor-pointer list-none text-sm font-medium text-white/90">{f.q}</summary>
                <p className="mt-2 text-sm leading-relaxed text-white/55">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>

      {/* New ticket modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0b1220] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-semibold text-white">Nouvelle demande d&apos;assistance</h2>
              <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <label className="mb-1.5 mt-4 block text-xs font-medium uppercase tracking-wider text-white/40">
              Objet
            </label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Bref résumé de votre problème"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-blue-500"
            />

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/40">
                  Catégorie
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c} className="bg-[#0b1220]">
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/40">
                  Priorité
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as SupportTicket['priority'])}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                >
                  {(['low', 'normal', 'high'] as const).map((p) => (
                    <option key={p} value={p} className="bg-[#0b1220]">
                      {PRIORITY_FR[p]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label className="mb-1.5 mt-4 block text-xs font-medium uppercase tracking-wider text-white/40">
              Description
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder="Décrivez votre problème en détail..."
              className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-blue-500"
            />

            <button
              onClick={submit}
              className="mt-5 w-full rounded-lg bg-blue-600 py-2.5 font-medium text-white transition-colors hover:bg-blue-500"
            >
              Envoyer la demande
            </button>
          </div>
        </div>
      )}

      {/* Ticket detail modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0b1220] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">{selected.subject}</h2>
                <p className="mt-0.5 text-xs text-white/40">
                  {selected.category} ·{' '}
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusStyle[selected.status]}`}>
                    {STATUS_FR[selected.status]}
                  </span>
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="text-white/40 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 max-h-72 space-y-3 overflow-y-auto">
              {selected.messages.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[85%] rounded-2xl p-3 text-sm ${
                    m.from === 'user'
                      ? 'ml-auto bg-blue-600 text-white'
                      : 'bg-white/5 text-white/80'
                  }`}
                >
                  <p className="leading-relaxed">{m.body}</p>
                  <p className={`mt-1 text-[11px] ${m.from === 'user' ? 'text-blue-100/70' : 'text-white/40'}`}>
                    {m.from === 'user' ? 'Vous' : 'Assistance'} · {timeAgo(m.at)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
