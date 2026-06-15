'use client'

import { useState } from 'react'
import { useNumbers } from '@/components/numbers/numbers-provider'
import { PROVIDERS } from '@/lib/numbers/data'
import {
  User,
  CreditCard,
  Bell,
  Shield,
  Check,
  Zap,
  Server,
} from 'lucide-react'

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 0,
    blurb: 'For testing and small projects.',
    features: ['1 active number', '100 inbound SMS / mo', 'Test API keys', 'Community support'],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 29,
    blurb: 'For growing products and teams.',
    features: ['25 active numbers', '10,000 inbound SMS / mo', 'Live API keys', 'Webhooks', 'Priority support'],
  },
  {
    id: 'scale',
    name: 'Scale',
    price: 99,
    blurb: 'For high-volume messaging.',
    features: ['Unlimited numbers', '100,000 inbound SMS / mo', 'Dedicated provider routing', 'SLA 99.99%', 'Dedicated support'],
  },
]

export default function SettingsPage() {
  const { ownedNumbers, messages, apiKeys } = useNumbers()
  const [currentPlan, setCurrentPlan] = useState('growth')
  const [notifs, setNotifs] = useState({ inboundSms: true, renewal: true, productNews: false })

  const monthlySpend = ownedNumbers
    .filter((n) => n.status !== 'released')
    .reduce((sum, n) => sum + n.monthlyPrice, 0)

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your profile, billing, plan, and notification preferences.
        </p>
      </header>

      {/* Profile */}
      <section className="mb-6 rounded-2xl border border-hairline bg-card p-6">
        <div className="mb-5 flex items-center gap-2">
          <User className="h-[18px] w-[18px] text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Profile</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Full name</span>
            <input
              defaultValue="Ada Dev"
              className="rounded-lg border border-hairline bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Email</span>
            <input
              defaultValue="ada@chapcam.dev"
              className="rounded-lg border border-hairline bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Company</span>
            <input
              defaultValue="ChapCam Labs"
              className="rounded-lg border border-hairline bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Default region</span>
            <select className="rounded-lg border border-hairline bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary">
              <option>United States</option>
              <option>United Kingdom</option>
              <option>France</option>
              <option>Germany</option>
            </select>
          </label>
        </div>
        <div className="mt-5 flex justify-end">
          <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
            Save changes
          </button>
        </div>
      </section>

      {/* Billing summary */}
      <section className="mb-6 rounded-2xl border border-hairline bg-card p-6">
        <div className="mb-5 flex items-center gap-2">
          <CreditCard className="h-[18px] w-[18px] text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Billing</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-hairline bg-background p-4">
            <p className="text-xs text-muted-foreground">Numbers cost / mo</p>
            <p className="mt-1 text-xl font-semibold text-foreground">${monthlySpend.toFixed(2)}</p>
          </div>
          <div className="rounded-xl border border-hairline bg-background p-4">
            <p className="text-xs text-muted-foreground">Active numbers</p>
            <p className="mt-1 text-xl font-semibold text-foreground">
              {ownedNumbers.filter((n) => n.status !== 'released').length}
            </p>
          </div>
          <div className="rounded-xl border border-hairline bg-background p-4">
            <p className="text-xs text-muted-foreground">Messages received</p>
            <p className="mt-1 text-xl font-semibold text-foreground">{messages.length}</p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between rounded-xl border border-hairline bg-background p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-12 items-center justify-center rounded-md bg-secondary text-xs font-bold text-foreground">
              VISA
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">•••• •••• •••• 4242</p>
              <p className="text-xs text-muted-foreground">Expires 09 / 27</p>
            </div>
          </div>
          <button className="rounded-lg border border-hairline px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary">
            Update
          </button>
        </div>
      </section>

      {/* Plan */}
      <section className="mb-6 rounded-2xl border border-hairline bg-card p-6">
        <div className="mb-5 flex items-center gap-2">
          <Zap className="h-[18px] w-[18px] text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Plan</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {PLANS.map((plan) => {
            const active = plan.id === currentPlan
            return (
              <div
                key={plan.id}
                className={`flex flex-col rounded-xl border p-5 transition-colors ${
                  active ? 'border-primary bg-primary/5' : 'border-hairline bg-background'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">{plan.name}</h3>
                  {active && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">
                      Current
                    </span>
                  )}
                </div>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  ${plan.price}
                  <span className="text-sm font-normal text-muted-foreground"> / mo</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{plan.blurb}</p>
                <ul className="mt-4 flex flex-1 flex-col gap-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => setCurrentPlan(plan.id)}
                  disabled={active}
                  className={`mt-5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                    active
                      ? 'cursor-default border border-hairline text-muted-foreground'
                      : 'bg-primary text-primary-foreground hover:opacity-90'
                  }`}
                >
                  {active ? 'Active plan' : `Switch to ${plan.name}`}
                </button>
              </div>
            )
          })}
        </div>
      </section>

      {/* Notifications */}
      <section className="mb-6 rounded-2xl border border-hairline bg-card p-6">
        <div className="mb-5 flex items-center gap-2">
          <Bell className="h-[18px] w-[18px] text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Notifications</h2>
        </div>
        <div className="flex flex-col divide-y divide-hairline">
          {[
            { key: 'inboundSms' as const, label: 'Inbound SMS alerts', desc: 'Email me when a number receives a message.' },
            { key: 'renewal' as const, label: 'Renewal reminders', desc: 'Notify me before a number renews or expires.' },
            { key: 'productNews' as const, label: 'Product news', desc: 'Occasional updates about new features and coverage.' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <button
                role="switch"
                aria-checked={notifs[item.key]}
                aria-label={item.label}
                onClick={() => setNotifs((p) => ({ ...p, [item.key]: !p[item.key] }))}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                  notifs[item.key] ? 'bg-primary' : 'bg-secondary'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                    notifs[item.key] ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Provider routing */}
      <section className="mb-6 rounded-2xl border border-hairline bg-card p-6">
        <div className="mb-5 flex items-center gap-2">
          <Server className="h-[18px] w-[18px] text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Provider routing</h2>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          ChapCam Numbers aggregates these carriers. Numbers are routed to the most reliable provider available in each region.
        </p>
        <div className="flex flex-col divide-y divide-hairline">
          {PROVIDERS.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-xs font-bold text-foreground">
                  {p.name.slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground">~{p.latencyMs}ms median delivery</p>
                </div>
              </div>
              <span className="flex items-center gap-1.5 text-xs font-medium text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {p.reliability}% uptime
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Danger zone */}
      <section className="rounded-2xl border border-destructive/30 bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Shield className="h-[18px] w-[18px] text-destructive" />
          <h2 className="text-sm font-semibold text-foreground">Security</h2>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {apiKeys.length} active API key{apiKeys.length === 1 ? '' : 's'}. Rotate keys regularly and revoke unused ones.
          </p>
          <button className="rounded-lg border border-destructive/40 px-3 py-2 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10">
            Sign out of all sessions
          </button>
        </div>
      </section>
    </div>
  )
}
