'use client'

import { useState } from 'react'
import { useNumbers } from '@/components/numbers/numbers-provider'
import { formatDate, timeAgo, type ApiKey } from '@/lib/numbers/data'
import { cn } from '@/lib/utils'
import {
  Copy,
  Check,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  KeyRound,
  Webhook,
  X,
} from 'lucide-react'

const SAMPLES: Record<string, string> = {
  cURL: `curl https://api.chapcam.dev/v1/numbers \\
  -H "Authorization: Bearer $CHAPCAM_API_KEY" \\
  -d country=US \\
  -d type=temporary \\
  -d capabilities[]=sms`,
  Node: `import { ChapCam } from "@chapcam/numbers";

const cc = new ChapCam(process.env.CHAPCAM_API_KEY);

const number = await cc.numbers.buy({
  country: "US",
  type: "temporary",
  capabilities: ["sms"],
});

cc.messages.on(number.id, (msg) => {
  console.log(msg.sender, msg.code);
});`,
  Python: `from chapcam import ChapCam

cc = ChapCam(api_key=os.environ["CHAPCAM_API_KEY"])

number = cc.numbers.buy(
    country="US",
    type="temporary",
    capabilities=["sms"],
)

for msg in cc.messages.stream(number.id):
    print(msg.sender, msg.code)`,
}

const ENDPOINTS = [
  { method: 'GET', path: '/v1/numbers/available', desc: 'List purchasable numbers by country and capability.' },
  { method: 'POST', path: '/v1/numbers', desc: 'Buy a number and add it to your account.' },
  { method: 'GET', path: '/v1/numbers', desc: 'List your active numbers.' },
  { method: 'DELETE', path: '/v1/numbers/:id', desc: 'Release a number.' },
  { method: 'GET', path: '/v1/messages', desc: 'Retrieve inbound SMS, filterable by number.' },
  { method: 'POST', path: '/v1/webhooks', desc: 'Register a webhook for realtime message delivery.' },
]

const METHOD_COLOR: Record<string, string> = {
  GET: 'text-primary',
  POST: 'text-cyan-400',
  DELETE: 'text-destructive',
}

function KeyRow({ k }: { k: ApiKey }) {
  const { revokeApiKey } = useNumbers()
  const [show, setShow] = useState(false)
  const [copied, setCopied] = useState(false)

  const masked = `${k.token.slice(0, 12)}${'•'.repeat(12)}`

  function copy() {
    navigator.clipboard?.writeText(k.token)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <tr className="border-t border-hairline">
      <td className="px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{k.name}</span>
          <span
            className={cn(
              'rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase',
              k.live ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground',
            )}
          >
            {k.live ? 'Live' : 'Test'}
          </span>
        </div>
        <span className="text-xs capitalize text-muted-foreground">{k.scope}</span>
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-2">
          <code className="font-mono text-sm text-foreground">{show ? k.token : masked}</code>
          <button
            onClick={() => setShow((v) => !v)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label={show ? 'Hide token' : 'Show token'}
          >
            {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={copy}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Copy token"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      </td>
      <td className="hidden px-5 py-4 text-sm text-muted-foreground sm:table-cell">
        {k.lastUsedAt ? timeAgo(k.lastUsedAt) : 'Never'}
      </td>
      <td className="hidden px-5 py-4 text-sm text-muted-foreground md:table-cell">{formatDate(k.createdAt)}</td>
      <td className="px-5 py-4 text-right">
        <button
          onClick={() => revokeApiKey(k.id)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-hairline px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Revoke
        </button>
      </td>
    </tr>
  )
}

export default function DevelopersPage() {
  const { apiKeys, createApiKey } = useNumbers()
  const [tab, setTab] = useState<keyof typeof SAMPLES>('Node')
  const [copiedCode, setCopiedCode] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newScope, setNewScope] = useState<ApiKey['scope']>('read-write')
  const [newLive, setNewLive] = useState(false)

  function copyCode() {
    navigator.clipboard?.writeText(SAMPLES[tab])
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 1500)
  }

  function submitKey() {
    createApiKey(newName, newScope, newLive)
    setCreating(false)
    setNewName('')
    setNewScope('read-write')
    setNewLive(false)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Developers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Provision numbers and stream messages programmatically with the ChapCam Numbers API.
        </p>
      </div>

      {/* quick start */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-hairline bg-[#0c0c0c]">
          <div className="flex items-center justify-between border-b border-hairline px-4 py-2">
            <div className="flex items-center gap-1">
              {(Object.keys(SAMPLES) as (keyof typeof SAMPLES)[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                    tab === t ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
            <button
              onClick={copyCode}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="Copy code"
            >
              {copiedCode ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
          <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-relaxed text-foreground/90">
            <code>{SAMPLES[tab]}</code>
          </pre>
        </div>

        {/* endpoints */}
        <div className="rounded-2xl border border-hairline bg-card p-5">
          <h3 className="text-base font-semibold text-foreground">Core endpoints</h3>
          <ul className="mt-4 space-y-3">
            {ENDPOINTS.map((e) => (
              <li key={e.path} className="flex items-start gap-3">
                <span className={cn('mt-0.5 w-14 shrink-0 font-mono text-xs font-bold', METHOD_COLOR[e.method])}>
                  {e.method}
                </span>
                <div className="min-w-0">
                  <code className="font-mono text-sm text-foreground">{e.path}</code>
                  <p className="text-xs text-muted-foreground">{e.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* API keys */}
      <div className="mt-8 rounded-2xl border border-hairline bg-card">
        <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            <h3 className="text-base font-semibold text-foreground">API keys</h3>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Create key
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Token</th>
                <th className="hidden px-5 py-3 sm:table-cell">Last used</th>
                <th className="hidden px-5 py-3 md:table-cell">Created</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {apiKeys.map((k) => (
                <KeyRow key={k.id} k={k} />
              ))}
            </tbody>
          </table>
          {apiKeys.length === 0 && (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              No API keys yet. Create one to start integrating.
            </p>
          )}
        </div>
      </div>

      {/* webhooks note */}
      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-hairline bg-card/40 px-5 py-4">
        <Webhook className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div>
          <p className="text-sm font-medium text-foreground">Realtime webhooks</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Register an endpoint and we will POST every inbound message — with the verification code already
            extracted — within ~120ms of delivery.
          </p>
        </div>
      </div>

      {/* create key modal */}
      {creating && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCreating(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-hairline bg-card p-6 shadow-2xl">
            <button
              onClick={() => setCreating(false)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
            <h2 className="text-lg font-semibold text-foreground">Create API key</h2>
            <p className="mt-1 text-sm text-muted-foreground">Generate a new key for your integration.</p>

            <label className="mt-5 block">
              <span className="text-sm font-medium text-foreground">Name</span>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Production server"
                className="mt-1.5 w-full rounded-lg border border-hairline bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50"
              />
            </label>

            <div className="mt-4">
              <span className="text-sm font-medium text-foreground">Scope</span>
              <div className="mt-1.5 flex gap-2">
                {(['read', 'read-write', 'full'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setNewScope(s)}
                    className={cn(
                      'flex-1 rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors',
                      newScope === s
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-hairline text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <label className="mt-4 flex items-center gap-2.5">
              <button
                role="switch"
                aria-checked={newLive}
                onClick={() => setNewLive((v) => !v)}
                className={cn('relative h-5 w-9 rounded-full transition-colors', newLive ? 'bg-primary' : 'bg-secondary')}
              >
                <span
                  className={cn(
                    'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform',
                    newLive ? 'translate-x-4' : 'translate-x-0.5',
                  )}
                />
              </button>
              <span className="text-sm text-foreground">Live key (production traffic)</span>
            </label>

            <button
              onClick={submitKey}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <KeyRound className="h-4 w-4" />
              Generate key
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
