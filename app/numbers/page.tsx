import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteNav } from '@/components/numbers/site-nav'
import { InboxPreview } from '@/components/numbers/inbox-preview'
import { COUNTRIES, PROVIDERS } from '@/lib/numbers/data'
import {
  ArrowRight, Phone, Globe2, Zap, ShieldCheck, MessageSquareText, Layers, Clock, Code2,
  Check, Headphones, Building2, FlaskConical, Repeat, Star,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'ChapCam Numbers — Global Virtual Numbers Instantly',
  description:
    'Purchase temporary or long-term virtual phone numbers from countries worldwide, receive SMS, and integrate via developer APIs — all from one dashboard.',
}

const SOLUTIONS = [
  { icon: ShieldCheck, title: 'Customer verification', desc: 'Receive OTP and verification codes reliably across 150+ countries with sub-second delivery.' },
  { icon: FlaskConical, title: 'Testing environments', desc: 'Spin up disposable numbers for QA and staging, then release them when you are done.' },
  { icon: Building2, title: 'Business messaging', desc: 'Run dedicated long-term lines for support, sales, and operations teams.' },
  { icon: Globe2, title: 'International operations', desc: 'Establish a local presence in every market without physical SIM cards.' },
  { icon: Code2, title: 'Software integrations', desc: 'Wire numbers into your stack with a clean REST API and real-time webhooks.' },
  { icon: Headphones, title: 'Customer support', desc: 'Centralize inbound messages from every region into a single shared inbox.' },
]

const STEPS = [
  { icon: Globe2, title: 'Choose a country', desc: 'Browse live inventory across providers and pick the number that fits your use case.' },
  { icon: Zap, title: 'Activate instantly', desc: 'Pay from your wallet and your number is provisioned and live in seconds.' },
  { icon: MessageSquareText, title: 'Receive messages', desc: 'Watch SMS arrive in real time in your inbox, or stream them to your webhook.' },
]

const PLANS = [
  { name: 'Starter', price: '$0', cadence: 'pay as you go', desc: 'For testing and small projects.', features: ['Temporary numbers from $0.40', 'Real-time SMS inbox', 'Single API key', 'Email support'], cta: 'Get Started', highlight: false },
  { name: 'Growth', price: '$49', cadence: 'per month', desc: 'For growing products and teams.', features: ['Everything in Starter', 'Long-term numbers', '10 API keys + webhooks', 'Priority routing', 'Live chat support'], cta: 'Start Growth', highlight: true },
  { name: 'Scale', price: 'Custom', cadence: 'annual', desc: 'For enterprises at high volume.', features: ['Volume pricing', 'Dedicated providers', 'SLA & 99.99% uptime', 'SSO & audit logs', 'Dedicated manager'], cta: 'Contact Sales', highlight: false },
]

const TESTIMONIALS = [
  { quote: 'We replaced three separate SMS vendors with ChapCam Numbers. One dashboard, better delivery, lower cost.', name: 'Aïcha Koné', role: 'CTO, Acme Pay' },
  { quote: 'Provisioning test numbers used to take days. Now our QA team does it in seconds, in any country.', name: 'James Carter', role: 'Eng Lead, Northwind' },
  { quote: 'The API is genuinely Stripe-quality. We integrated verification in an afternoon.', name: 'Priya Nair', role: 'Founder, Finlytics' },
]

const FAQS = [
  { q: 'How fast are numbers activated?', a: 'Numbers are provisioned instantly. As soon as your wallet payment clears, the number is live and ready to receive messages.' },
  { q: 'Which countries are supported?', a: 'We aggregate inventory across multiple providers in 150+ countries, including North America, Europe, Africa, and Asia-Pacific.' },
  { q: 'Can I use the numbers via API?', a: 'Yes. Every number is fully programmable through our REST API, with webhooks for real-time inbound message delivery.' },
  { q: 'What payment methods do you accept?', a: 'We support mobile money (Orange, MTN, Moov, Wave), Visa and Mastercard, and USDT for crypto deposits.' },
  { q: 'What is the difference between temporary and long-term numbers?', a: 'Temporary numbers are ideal for one-off verifications and expire quickly. Long-term numbers stay assigned to you and can auto-renew.' },
]

export default function NumbersLanding() {
  const flags = COUNTRIES

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white antialiased">
      <SiteNav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-[-10%] h-[480px] w-[820px] -translate-x-1/2 rounded-full bg-[#2563EB]/20 blur-[140px]" />
        </div>
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8 lg:py-28">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-[#60a5fa]" />
              Global Virtual Numbers Instantly
            </span>
            <h1 className="mt-6 text-balance text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Access Virtual Phone Numbers Worldwide
            </h1>
            <p className="mt-6 max-w-lg text-pretty text-lg leading-relaxed text-slate-300">
              Manage virtual phone numbers from multiple countries through a single platform. Receive SMS, manage
              active numbers, and integrate with developer APIs.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/numbers/app" className="group inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#2563EB]/25 transition-colors hover:bg-[#1d4ed8]">
                Get Started
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a href="#pricing" className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/10">
                View Pricing
              </a>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-slate-400">
              <span className="flex items-center gap-2"><Check className="h-4 w-4 text-[#60a5fa]" /> 150+ countries</span>
              <span className="flex items-center gap-2"><Check className="h-4 w-4 text-[#60a5fa]" /> 99.99% uptime</span>
              <span className="flex items-center gap-2"><Check className="h-4 w-4 text-[#60a5fa]" /> Sub-second delivery</span>
            </div>
          </div>
          <div className="relative">
            <InboxPreview />
          </div>
        </div>
      </section>

      {/* Trust / providers */}
      <section className="border-y border-white/5 bg-white/[0.02]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-medium uppercase tracking-wider text-slate-500">
            Aggregating trusted carriers worldwide
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {PROVIDERS.map((p) => (
              <span key={p.id} className="text-lg font-semibold text-slate-400">{p.name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Countries */}
      <section id="countries" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Supported Countries" title="Local numbers in every major market" desc="Pick from live inventory across 150+ countries, all aggregated into one catalog." />
        <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {flags.map((c) => (
            <div key={c.code} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 backdrop-blur transition-colors hover:border-[#2563EB]/40 hover:bg-white/[0.07]">
              <span className="text-2xl" aria-hidden>{c.flag}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{c.name}</p>
                <p className="font-mono text-xs text-slate-400">{c.dial}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Solutions */}
      <section id="solutions" className="border-t border-white/5 bg-white/[0.02]">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Communication Solutions" title="Built for every communication workflow" desc="From customer verification to enterprise messaging, one platform covers it all." />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SOLUTIONS.map((s) => (
              <div key={s.title} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur transition-colors hover:border-[#2563EB]/40">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2563EB]/15 text-[#60a5fa]">
                  <s.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-white">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="How It Works" title="Live in three simple steps" desc="No contracts, no SIM cards. Get a working number in under a minute." />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.title} className="relative rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <span className="absolute right-5 top-5 text-5xl font-bold text-white/5">{i + 1}</span>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2563EB] text-white">
                <s.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-base font-semibold text-white">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Developer strip */}
      <section className="border-y border-white/5 bg-white/[0.02]">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
              <Layers className="h-3.5 w-3.5 text-[#60a5fa]" /> Developer-first
            </span>
            <h2 className="mt-5 text-balance text-3xl font-bold tracking-tight sm:text-4xl">A REST API your team will love</h2>
            <p className="mt-4 max-w-md text-pretty text-slate-300">
              Provision numbers, list messages, and subscribe to webhooks with a few lines of code. Idempotent
              requests, clear errors, and SDKs for every language.
            </p>
            <Link href="/numbers/app/developers" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#60a5fa] hover:text-[#93c5fd]">
              Explore the API <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#070b14] shadow-2xl">
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
              <span className="h-3 w-3 rounded-full bg-red-500/70" />
              <span className="h-3 w-3 rounded-full bg-yellow-500/70" />
              <span className="h-3 w-3 rounded-full bg-green-500/70" />
              <span className="ml-2 font-mono text-xs text-slate-500">buy-number.ts</span>
            </div>
            <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-relaxed text-slate-300">
{`import { ChapCam } from "@chapcam/numbers"

const cc = new ChapCam(process.env.CCK_API_KEY)

// Purchase a US number that can receive SMS
const number = await cc.numbers.create({
  country: "US",
  type: "temporary",
  capabilities: ["sms"],
})

// Stream inbound messages in real time
cc.messages.on(number.id, (msg) => {
  console.log(msg.sender, msg.body)
})`}
            </pre>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Pricing" title="Simple, usage-based pricing" desc="Start free and pay only for what you use. Upgrade as you scale." />
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {PLANS.map((p) => (
            <div key={p.name} className={`relative flex flex-col rounded-2xl border p-7 backdrop-blur ${p.highlight ? 'border-[#2563EB] bg-[#2563EB]/[0.08]' : 'border-white/10 bg-white/5'}`}>
              {p.highlight && (
                <span className="absolute -top-3 left-7 rounded-full bg-[#2563EB] px-3 py-1 text-[11px] font-semibold text-white">Most popular</span>
              )}
              <h3 className="text-lg font-semibold text-white">{p.name}</h3>
              <p className="mt-1 text-sm text-slate-400">{p.desc}</p>
              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="text-4xl font-bold text-white">{p.price}</span>
                <span className="text-sm text-slate-400">{p.cadence}</span>
              </div>
              <ul className="mt-6 flex flex-1 flex-col gap-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#60a5fa]" /> {f}
                  </li>
                ))}
              </ul>
              <Link href="/numbers/app" className={`mt-7 inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition-colors ${p.highlight ? 'bg-[#2563EB] text-white hover:bg-[#1d4ed8]' : 'border border-white/15 bg-white/5 text-white hover:bg-white/10'}`}>
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-t border-white/5 bg-white/[0.02]">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Testimonials" title="Trusted by modern teams" desc="Teams ship faster when communication infrastructure just works." />
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <figure key={t.name} className="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                <div className="flex gap-0.5 text-[#60a5fa]">
                  {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                </div>
                <blockquote className="mt-4 flex-1 text-pretty text-sm leading-relaxed text-slate-200">"{t.quote}"</blockquote>
                <figcaption className="mt-5">
                  <p className="text-sm font-semibold text-white">{t.name}</p>
                  <p className="text-xs text-slate-400">{t.role}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="FAQ" title="Frequently asked questions" desc="Everything you need to know about ChapCam Numbers." />
        <div className="mt-10 divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
          {FAQS.map((f) => (
            <details key={f.q} className="group px-6 py-5">
              <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-white">
                {f.q}
                <span className="ml-4 text-[#60a5fa] transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Contact CTA */}
      <section id="contact" className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#2563EB]/20 to-[#1e3a8a]/10 px-6 py-14 text-center backdrop-blur">
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">Start receiving messages worldwide today</h2>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-slate-300">
            Create your account, top up your wallet, and provision your first number in under a minute.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/numbers/app" className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#2563EB]/25 transition-colors hover:bg-[#1d4ed8]">
              Get Started <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="mailto:sales@chapcam.com" className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10">
              Contact Sales
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#070b14]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-8 md:flex-row">
            <div className="max-w-xs">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2563EB]"><Phone className="h-4 w-4 text-white" /></span>
                <span className="text-base font-semibold text-white">ChapCam Numbers</span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-400">Global virtual numbers instantly. Aggregating trusted carriers into one developer-friendly platform.</p>
            </div>
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
              <FooterCol title="Product" links={[['Marketplace', '/numbers/app/marketplace'], ['Dashboard', '/numbers/app'], ['API Access', '/numbers/app/developers'], ['Pricing', '#pricing']]} />
              <FooterCol title="Company" links={[['About', '#'], ['Contact', '#contact'], ['Blog', '#']]} />
              <FooterCol title="Legal" links={[['Terms of Service', '/numbers/legal/terms'], ['Privacy Policy', '/numbers/legal/privacy'], ['Acceptable Use', '/numbers/legal/acceptable-use']]} />
            </div>
          </div>
          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-slate-500 sm:flex-row">
            <p>© {new Date().getFullYear()} ChapCam Numbers. All rights reserved.</p>
            <p className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> Status: all systems operational</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function SectionHeading({ eyebrow, title, desc }: { eyebrow: string; title: string; desc: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <span className="text-xs font-semibold uppercase tracking-wider text-[#60a5fa]">{eyebrow}</span>
      <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      <p className="mt-4 text-pretty text-slate-400">{desc}</p>
    </div>
  )
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-white">{title}</h4>
      <ul className="mt-4 flex flex-col gap-2.5">
        {links.map(([label, href]) => (
          <li key={label}>
            <Link href={href} className="text-sm text-slate-400 transition-colors hover:text-white">{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
