import { Phone, Check, Signal } from 'lucide-react'

const ROWS = [
  { sender: 'Stripe', code: '729104', body: 'Your Stripe verification code is 729104.', time: 'now', accent: true },
  { sender: 'WhatsApp', code: '481205', body: 'WhatsApp code 481-205. Tap to verify.', time: '38m' },
  { sender: 'Telegram', code: '53914', body: 'Telegram login code: 53914', time: '2h' },
  { sender: 'Coinbase', code: '094412', body: 'Coinbase auth code 094412. Never share it.', time: '1d' },
]

export function InboxPreview() {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#2563EB] text-white">
            <Phone className="h-3.5 w-3.5" />
          </span>
          <span className="font-mono text-sm font-medium text-white">+1 415 555 0192</span>
          <span className="flex items-center gap-1 rounded-full bg-[#2563EB]/15 px-2 py-0.5 text-[11px] font-semibold text-[#60a5fa]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#60a5fa]" />
            Live
          </span>
        </div>
        <span className="flex items-center gap-1 text-[11px] text-slate-400">
          <Signal className="h-3.5 w-3.5" />
          Nexa Telecom
        </span>
      </div>

      <ul className="divide-y divide-white/5">
        {ROWS.map((r) => (
          <li key={r.sender} className={`flex items-start gap-3 px-4 py-3.5 ${r.accent ? 'bg-[#2563EB]/[0.08]' : ''}`}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white">
              {r.sender.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold text-white">{r.sender}</span>
                <span className="shrink-0 text-[11px] text-slate-400">{r.time}</span>
              </div>
              <p className="mt-0.5 truncate text-[13px] text-slate-400">{r.body}</p>
            </div>
            <div className="shrink-0 self-center rounded-md border border-white/10 bg-[#0a0e1a] px-2 py-1 font-mono text-sm font-semibold tracking-widest text-[#60a5fa]">
              {r.code}
            </div>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between border-t border-white/10 bg-white/[0.03] px-4 py-2.5 text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <Check className="h-3.5 w-3.5 text-[#60a5fa]" />
          Auto-extracted codes
        </span>
        <span>Webhook delivered in 120ms</span>
      </div>
    </div>
  )
}
