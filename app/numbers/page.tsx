import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteNav } from '@/components/numbers/site-nav'
import { InboxPreview } from '@/components/numbers/inbox-preview'
import { COUNTRIES, PROVIDERS } from '@/lib/numbers/data'
import {
  ArrowRight,
  Hash,
  Globe2,
  Zap,
  ShieldCheck,
  MessageSquareText,
  Layers,
  Clock,
  Code2,
  Check,
  Phone,
  Webhook,
  KeyRound,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'ChapCam Numbers — Virtual phone numbers for verification & messaging',
  description:
    'Buy temporary or long-term virtual phone numbers from 150+ countries, receive SMS instantly, and integrate with a single API. One dashboard for every telecom provider.',
}

const FEATURES = [
  {
    icon: Globe2,
    title: 'Global coverage',
    body: 'Provision numbers in 150+ countries and route across multiple carriers automatically for the best deliverability.',
  },
  {
    icon: Zap,
    title: 'Instant SMS',
    body: 'Inbound messages arrive in milliseconds with verification codes auto-extracted and pushed to your webhooks.',
  },
  {
    icon: Clock,
    title: 'Temporary or long-term',
    body: 'Spin up a disposable number for a one-time signup, or keep a dedicated line for production for years.',
  },
  {
    icon: ShieldCheck,
    title: 'Carrier-grade reliability',
    body: '99.99% uptime with intelligent failover between providers so a verification flow never breaks.',
  },
  {
    icon: Code2,
    title: 'Developer-first API',
    body: 'REST endpoints, webhooks and SDKs. Buy a number and start receiving messages in a few lines of code.',
  },
  {
    icon: Layers,
    title: 'Every provider, one bill',
    body: 'We aggregate dozens of telecom providers into a single dashboard, invoice and API surface.',
  },
]

const STEPS = [
  { n: '01', title: 'Pick a number', body: 'Filter by country, capability and provider, then buy in one click.' },
  { n: '02', title: 'Receive messages', body: 'SMS and OTP codes land in your inbox and webhooks instantly.' },
  { n: '03', title: 'Automate with the API', body: 'Provision, list and release numbers programmatically at scale.' },
]

const PLANS = [
  {
    name: 'Pay as you go',
    price: '$0',
    cadence: '/mo',
    desc: 'For testing and one-off verifications.',
    features: ['Temporary numbers from $0.50', 'SMS receive included', 'Community support', 'Basic API access'],
    cta: 'Start free',
    highlight: false,
  },
  {
    name: 'Growth',
    price: '$49',
    cadence: '/mo',
    desc: 'For teams shipping verification at scale.',
    features: [
      'Everything in Pay as you go',
      'Long-term dedicated numbers',
      'Webhooks + auto OTP extraction',
      'Priority routing & failover',
      '5 team members',
    ],
    cta: 'Start 14-day trial',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    cadence: '',
    desc: 'For high-volume messaging platforms.',
    features: ['Volume pricing', 'Dedicated carrier pools', 'SLA & SSO', 'Compliance support', 'Solutions engineer'],
    cta: 'Contact sales',
    highlight: false,
  },
]

const CODE = `import { ChapCam } from "@chapcam/numbers";

const cc = new ChapCam(process.env.CHAPCAM_API_KEY);

// Buy a temporary US number that can receive SMS
const number = await cc.numbers.buy({
  country: "US",
  type: "temporary",
  capabilities: ["sms"],
});

// Stream inbound messages (verification codes included)
cc.messages.on(number.id, (msg) => {
  console.log(msg.sender, msg.code); // "Stripe" "729104"
});`

export default function NumbersLandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />

      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              'radial-gradient(60% 60% at 80% -10%, rgba(0,255,136,0.12), transparent 60%), radial-gradient(50% 50% at 0% 0%, rgba(0,212,255,0.08), transparent 55%)',
          }}
        />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 md:px-8 md:py-24 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-hairline bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              150+ countries · 40+ carriers · one API
            </span>
            <h1 className="mt-5 text-balance text-4xl font-bold tracking-tight md:text-6xl">
              Virtual phone numbers for the modern stack
            </h1>
            <p className="mt-5 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
              Buy temporary or long-term numbers from telecom providers worldwide, receive SMS and verification
              codes instantly, and integrate everything with a single developer API.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/numbers/app"
                className="group inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-base font-semibold text-primary-foreground transition-all hover:bg-primary/90"
              >
                Open dashboard
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#developers"
                className="inline-flex items-center gap-2 rounded-xl border border-hairline bg-card px-6 py-3.5 text-base font-semibold text-foreground transition-colors hover:border-primary/40"
              >
                <Code2 className="h-5 w-5" />
                View the API
              </a>
            </div>
            <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                No setup fees
              </span>
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                Cancel anytime
              </span>
            </div>
          </div>

          <div className="relative">
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-6 rounded-3xl opacity-60 blur-2xl"
              style={{ background: 'radial-gradient(circle at 70% 30%, rgba(0,255,136,0.18), transparent 70%)' }}
            />
            <div className="relative">
              <InboxPreview />
            </div>
          </div>
        </div>
      </section>

      {/* ===== TRUST BAR ===== */}
      <section className="border-y border-hairline bg-card/40">
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
          <p className="text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Aggregating trusted carriers worldwide
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {PROVIDERS.map((p) => (
              <div key={p.id} className="flex items-center gap-2 text-base font-semibold text-foreground/70">
                <Phone className="h-4 w-4 text-primary" />
                {p.name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== STATS ===== */}
      <section className="mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-20">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-hairline bg-hairline lg:grid-cols-4">
          {[
            { value: '150+', label: 'Countries covered' },
            { value: '40+', label: 'Telecom providers' },
            { value: '120ms', label: 'Median SMS delivery' },
            { value: '99.99%', label: 'Platform uptime' },
          ].map((s) => (
            <div key={s.label} className="bg-card p-6 md:p-8">
              <p className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">{s.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section id="features" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-12 md:px-8 md:py-16">
        <div className="max-w-2xl">
          <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">
            One platform for every phone number you need
          </h2>
          <p className="mt-4 text-pretty text-lg text-muted-foreground">
            Stop juggling carrier contracts and dashboards. ChapCam Numbers unifies provisioning, messaging and
            billing behind a single premium interface.
          </p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-hairline bg-card p-6 transition-all hover:border-primary/30 hover:shadow-[0_16px_44px_-20px_rgba(0,0,0,0.6)]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== COVERAGE ===== */}
      <section id="coverage" className="scroll-mt-20 border-y border-hairline bg-card/40">
        <div className="mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-20">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
            <div className="max-w-xl">
              <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">
                Numbers wherever your users are
              </h2>
              <p className="mt-4 text-pretty text-lg text-muted-foreground">
                Local presence in the markets that matter, with new countries added every month.
              </p>
            </div>
            <Link
              href="/numbers/app/marketplace"
              className="inline-flex items-center gap-2 rounded-xl border border-hairline bg-background px-5 py-3 text-sm font-semibold transition-colors hover:border-primary/40"
            >
              Browse the marketplace
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {COUNTRIES.map((c) => (
              <div
                key={c.code}
                className="flex items-center gap-3 rounded-xl border border-hairline bg-card px-4 py-3"
              >
                <span className="text-2xl leading-none">{c.flag}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{c.dialCode}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-20">
        <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">Live in three steps</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-2xl border border-hairline bg-card p-6">
              <span className="font-mono text-sm font-semibold text-primary">{s.n}</span>
              <h3 className="mt-3 text-lg font-semibold text-foreground">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== DEVELOPERS ===== */}
      <section id="developers" className="scroll-mt-20 border-y border-hairline bg-card/40">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 md:px-8 md:py-20 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-hairline bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              <Code2 className="h-3.5 w-3.5 text-primary" />
              Developer API
            </span>
            <h2 className="mt-5 text-balance text-3xl font-bold tracking-tight md:text-4xl">
              Provision numbers in a few lines of code
            </h2>
            <p className="mt-4 text-pretty text-lg text-muted-foreground">
              A clean REST API with webhooks and typed SDKs. Buy numbers, list inventory, stream inbound SMS and
              release lines — all programmatically.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                { icon: KeyRound, t: 'Scoped API keys for every environment' },
                { icon: Webhook, t: 'Webhooks with automatic OTP extraction' },
                { icon: MessageSquareText, t: 'Realtime message streaming' },
              ].map((i) => (
                <li key={i.t} className="flex items-center gap-3 text-sm text-foreground">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <i.icon className="h-4 w-4" />
                  </span>
                  {i.t}
                </li>
              ))}
            </ul>
            <Link
              href="/numbers/app/developers"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Read the docs
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="overflow-hidden rounded-2xl border border-hairline bg-[#0c0c0c]">
            <div className="flex items-center gap-2 border-b border-hairline px-4 py-3">
              <span className="h-3 w-3 rounded-full bg-destructive/70" />
              <span className="h-3 w-3 rounded-full bg-yellow-500/70" />
              <span className="h-3 w-3 rounded-full bg-primary/70" />
              <span className="ml-2 font-mono text-xs text-muted-foreground">verify.ts</span>
            </div>
            <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-relaxed text-foreground/90">
              <code>{CODE}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <section id="pricing" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">Simple, usage-based pricing</h2>
          <p className="mt-4 text-pretty text-lg text-muted-foreground">
            Only pay for the numbers and messages you use. Upgrade for dedicated lines and automation.
          </p>
        </div>
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`relative flex flex-col rounded-2xl border bg-card p-7 ${
                p.highlight ? 'border-primary shadow-[0_0_0_1px_var(--primary)]' : 'border-hairline'
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-7 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  Most popular
                </span>
              )}
              <h3 className="text-lg font-semibold text-foreground">{p.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight text-foreground">{p.price}</span>
                <span className="text-sm text-muted-foreground">{p.cadence}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{p.desc}</p>
              <ul className="mt-6 flex-1 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/numbers/app"
                className={`mt-7 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-colors ${
                  p.highlight
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'border border-hairline text-foreground hover:border-primary/40'
                }`}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="mx-auto max-w-7xl px-4 pb-20 md:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-hairline bg-card p-10 text-center md:p-16">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-80"
            style={{
              background:
                'radial-gradient(80% 80% at 50% 0%, rgba(0,255,136,0.12), transparent 60%)',
            }}
          />
          <div className="relative">
            <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">
              Get your first number in under a minute
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-pretty text-lg text-muted-foreground">
              Join thousands of developers and businesses running verification, support and messaging on ChapCam
              Numbers.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/numbers/app"
                className="group inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-base font-semibold text-primary-foreground transition-all hover:bg-primary/90"
              >
                Open dashboard
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#pricing"
                className="inline-flex items-center gap-2 rounded-xl border border-hairline bg-background px-7 py-3.5 text-base font-semibold text-foreground transition-colors hover:border-primary/40"
              >
                See pricing
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-hairline">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 md:flex-row md:px-8">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Hash className="h-4 w-4" strokeWidth={2.5} />
            </span>
            <span className="text-sm font-semibold">ChapCam Numbers</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} ChapCam. Virtual numbers for communication services.
          </p>
          <nav className="flex items-center gap-5 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#pricing" className="hover:text-foreground">Pricing</a>
            <Link href="/numbers/app/developers" className="hover:text-foreground">API</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
