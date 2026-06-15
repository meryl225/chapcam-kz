'use client'

import { USAGE_7D } from '@/lib/numbers/data'

export function UsageChart() {
  const max = Math.max(...USAGE_7D.map((d) => d.received + d.sent))

  return (
    <div className="rounded-2xl border border-hairline bg-card p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">Message volume</h3>
          <p className="text-sm text-muted-foreground">Last 7 days</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
            Received
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-sm bg-foreground/25" />
            Sent
          </span>
        </div>
      </div>

      <div className="mt-6 flex h-44 items-end justify-between gap-2 md:gap-4">
        {USAGE_7D.map((d) => {
          const total = d.received + d.sent
          const h = (total / max) * 100
          const recvShare = (d.received / total) * 100
          return (
            <div key={d.day} className="group flex flex-1 flex-col items-center gap-2">
              <div className="relative flex w-full flex-1 items-end">
                <div
                  className="flex w-full flex-col overflow-hidden rounded-lg transition-all"
                  style={{ height: `${h}%` }}
                  title={`${d.received} received · ${d.sent} sent`}
                >
                  <div className="w-full bg-foreground/20" style={{ height: `${100 - recvShare}%` }} />
                  <div className="w-full bg-primary" style={{ height: `${recvShare}%` }} />
                </div>
              </div>
              <span className="text-xs text-muted-foreground">{d.day}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
