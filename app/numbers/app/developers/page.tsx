'use client'

import { useState } from 'react'
import { useNumbers } from '@/components/numbers/numbers-provider'
import { formatDate, timeAgo } from '@/lib/numbers/data'
import { Copy, Check, Eye, EyeOff, Plus, Trash2, KeyRound, Webhook, Terminal, X } from 'lucide-react'

const card = 'rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl'

const ENDPOINTS = [
  { method: 'GET', path: '/v1/numbers', desc: 'Lister vos numéros actifs' },
  { method: 'POST', path: '/v1/numbers', desc: 'Acheter un nouveau numéro' },
  { method: 'GET', path: '/v1/numbers/{id}/messages', desc: 'Récupérer les SMS entrants d’un numéro' },
  { method: 'DELETE', path: '/v1/numbers/{id}', desc: 'Libérer un numéro' },
  { method: 'POST', path: '/v1/webhooks', desc: 'Enregistrer un webhook de message entrant' },
]

const SAMPLES: Record<string, string> = {
  cURL: `curl https://api.chapcam.io/v1/numbers \\
  -H "Authorization: Bearer cck_live_xxx"`,
  Node: `import { ChapCam } from "chapcam";

const cc = new ChapCam(process.env.CHAPCAM_API_KEY);
const numbers = await cc.numbers.list();
console.log(numbers);`,
  Python: `import chapcam

cc = chapcam.Client(api_key="cck_live_xxx")
numbers = cc.numbers.list()
print(numbers)`,
}

const methodColor: Record<string, string> = {
  GET: 'text-emerald-400',
  POST: 'text-blue-400',
  DELETE: 'text-red-400',
}

export default function DevelopersPage() {
  const { apiKeys, createApiKey, revokeApiKey } = useNumbers()
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})
  const [copied, setCopied] = useState<string | null>(null)
  const [lang, setLang] = useState<keyof typeof SAMPLES>('cURL')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [justCreated, setJustCreated] = useState<string | null>(null)

  function copy(text: string) {
    navigator.clipboard?.writeText(text)
    setCopied(text)
    setTimeout(() => setCopied(null), 1500)
  }

  function create() {
    if (!newName.trim()) return
    const key = createApiKey(newName.trim())
    setJustCreated(key.secret)
    setRevealed((r) => ({ ...r, [key.id]: true }))
    setNewName('')
    setCreating(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Accès API</h1>
          <p className="text-sm text-white/50">Gérez vos numéros et recevez des messages par programmation</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
        >
          <Plus className="h-4 w-4" /> Créer une clé
        </button>
      </div>

      {justCreated && (
        <div className="flex items-start gap-3 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
          <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-blue-300" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white">Copiez votre clé secrète maintenant</p>
            <p className="text-xs text-white/50">Pour votre sécurité, elle ne sera plus affichée en entier.</p>
            <code className="mt-2 block truncate rounded-md bg-black/40 px-3 py-2 font-mono text-xs text-blue-200">
              {justCreated}
            </code>
          </div>
          <button onClick={() => setJustCreated(null)} className="text-white/40 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* API keys */}
      <div className={`${card} overflow-hidden`}>
        <div className="border-b border-white/5 p-5">
          <h2 className="flex items-center gap-2 font-semibold text-white">
            <KeyRound className="h-4 w-4 text-blue-400" /> Clés API
          </h2>
        </div>
        <ul className="divide-y divide-white/5">
          {apiKeys.map((k) => (
            <li key={k.id} className="flex flex-wrap items-center gap-3 p-5">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-white">{k.name}</p>
                <div className="mt-1 flex items-center gap-2">
                  <code className="font-mono text-sm text-white/60">
                    {revealed[k.id] ? k.secret : `${k.prefix}${'•'.repeat(20)}`}
                  </code>
                  <button
                    onClick={() => setRevealed((r) => ({ ...r, [k.id]: !r[k.id] }))}
                    className="text-white/40 hover:text-white"
                    aria-label="Toggle visibility"
                  >
                    {revealed[k.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => copy(k.secret)}
                    className="text-white/40 hover:text-blue-400"
                    aria-label="Copy key"
                  >
                    {copied === k.secret ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
                <p className="mt-1 text-xs text-white/40">
                  Créée le {formatDate(k.createdAt)} · {k.lastUsedAt ? `dernière utilisation ${timeAgo(k.lastUsedAt)}` : 'jamais utilisée'}
                </p>
              </div>
              <button
                onClick={() => revokeApiKey(k.id)}
                className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-white/60 transition-colors hover:border-red-500/40 hover:text-red-400"
              >
                <Trash2 className="h-3.5 w-3.5" /> Révoquer
              </button>
            </li>
          ))}
          {apiKeys.length === 0 && (
            <li className="p-8 text-center text-sm text-white/50">Aucune clé API pour le moment. Créez-en une pour commencer.</li>
          )}
        </ul>
      </div>

      {/* Quickstart */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className={`${card} overflow-hidden`}>
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-2.5">
            <span className="flex items-center gap-2 text-sm font-medium text-white">
              <Terminal className="h-4 w-4 text-blue-400" /> Démarrage rapide
            </span>
            <div className="flex gap-1">
              {(Object.keys(SAMPLES) as (keyof typeof SAMPLES)[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                    lang === l ? 'bg-blue-500/20 text-blue-300' : 'text-white/50 hover:text-white'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="relative">
            <button
              onClick={() => copy(SAMPLES[lang])}
              className="absolute right-3 top-3 text-white/40 hover:text-blue-400"
              aria-label="Copy code"
            >
              {copied === SAMPLES[lang] ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            </button>
            <pre className="overflow-x-auto p-4 text-sm leading-relaxed">
              <code className="font-mono text-blue-100/90">{SAMPLES[lang]}</code>
            </pre>
          </div>
        </div>

        {/* Endpoints */}
        <div className={`${card} overflow-hidden`}>
          <div className="border-b border-white/5 px-4 py-2.5">
            <span className="flex items-center gap-2 text-sm font-medium text-white">
              <Webhook className="h-4 w-4 text-blue-400" /> Endpoints
            </span>
          </div>
          <ul className="divide-y divide-white/5">
            {ENDPOINTS.map((e) => (
              <li key={e.path} className="flex items-center gap-3 px-4 py-3">
                <span className={`w-14 shrink-0 font-mono text-xs font-semibold ${methodColor[e.method]}`}>
                  {e.method}
                </span>
                <div className="min-w-0">
                  <code className="font-mono text-sm text-white">{e.path}</code>
                  <p className="text-xs text-white/40">{e.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Create key modal */}
      {creating && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setCreating(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0b1220] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-white">Créer une clé API</h2>
            <label className="mb-1.5 mt-4 block text-xs font-medium uppercase tracking-wider text-white/40">
              Nom de la clé
            </label>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && create()}
              placeholder="ex. Serveur de production"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-blue-500"
            />
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setCreating(false)}
                className="flex-1 rounded-lg border border-white/10 py-2 text-sm text-white/70 hover:bg-white/5"
              >
                Annuler
              </button>
              <button
                onClick={create}
                className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-500"
              >
                Créer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
