"use client"

import Image from "next/image"
import Link from "next/link"
import { Bell, ChevronRight, Home, Image as ImageIcon, Menu, Plus, Search, Sparkles, UserRound } from "lucide-react"
import { useState } from "react"
import { CreatorVideoStrip } from "@/components/creator-video-strip"
import { HomeCommunityShowcase } from "@/components/home-community-showcase"
import { HomepageFaq } from "@/components/homepage-faq"
import { HomepageAbout } from "@/components/homepage-about"
import { HomepageFooter } from "@/components/homepage-footer"
import { PlansTopupModal } from "@/components/plans-topup-modal"

const streamingPlatforms = [
  ["WhatsApp", "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/whatsapp/default.svg"],
  ["TikTok", "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/tiktok/default.svg"],
  ["YouTube", "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/youtube/default.svg"],
  ["Signal", "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/signal/default.svg"],
  ["Telegram", "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/telegram/default.svg"],
  ["Twitch", "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/twitch/default.svg"],
  ["Discord", "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/discord/default.svg"],
] as const

const tools = [
  { title: "Live Swap", description: "Change de visage en temps réel.", media: { type: "video", src: "/videos/live-swap-1476.mp4" }, icon: Sparkles, color: "#2563eb", href: "/dashboard/live-swap" },
  { title: "Genjutsu", description: "Anime tes images avec un mouvement naturel.", media: { type: "video", src: "/videos/genjutsu-demo.mov" }, icon: Sparkles, color: "#22c55e", href: "/dashboard/genjutsu" },
  { title: "Motion Control", description: "Anime ta photo en 3D.", media: { type: "video", src: "/videos/motion-control-demo.mp4", poster: "/swap/poster-motion.png" }, icon: Sparkles, color: "#6366f1", href: "/dashboard/motion" },
  { title: "Message Vocal", description: "Crée des voix réalistes depuis un texte.", media: { type: "image", src: "/swap/poster-message-vocal.png" }, icon: Menu, color: "#ec4899", href: "/dashboard/message-vocal" },
  { title: "Traduction vidéo", description: "Traduis ta vidéo en 190+ langues.", media: { type: "image", src: "/swap/poster-video-translation.png" }, icon: Sparkles, color: "#14b8a6", href: "/dashboard/video-translation" },
  { title: "ChapVerify", description: "Détecte les deepfakes.", media: { type: "image", src: "/swap/poster-chapverify.png" }, icon: Bell, color: "#ef4444", href: "/chapverify" },
  { title: "ChapSim", description: "Numéros virtuels, SMS OTP et proxies premium.", media: { type: "image", src: "/chapsim/presentation.jpg" }, icon: ImageIcon, color: "#f59e0b", href: "/chapsim" },
]

export function ReferenceHomepage() {
  const [plansOpen, setPlansOpen] = useState(false)

  return (
    <div className="min-h-screen overflow-hidden bg-[#f4f9ff] text-[#071a42]">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden bg-[radial-gradient(circle_at_50%_0%,rgba(125,211,252,0.38),transparent_38%),linear-gradient(180deg,#f8fbff_0%,#e8f4ff_65%,#f8fbff_100%)]">
          <div className="absolute inset-0 opacity-75 [background-image:radial-gradient(circle,rgba(14,165,233,.22)_1px,transparent_1.5px)] [background-size:42px_42px] [mask-image:linear-gradient(to_bottom,transparent,black_8%,black_92%,transparent)]" />
          <span className="absolute left-[5%] top-[12%] text-4xl font-light text-[#0ea5e9]/20">∞</span>
          <span className="absolute right-[8%] top-[22%] text-3xl font-light text-[#7c3aed]/20">∞</span>
          <span className="absolute left-[10%] top-[48%] text-5xl font-light text-[#2563eb]/15">∞</span>
          <span className="absolute right-[14%] top-[58%] text-4xl font-light text-[#0ea5e9]/20">∞</span>
          <span className="absolute left-[42%] top-[76%] text-3xl font-light text-[#7c3aed]/15">∞</span>
          <div className="absolute left-[7%] top-[30%] size-3 rounded-full bg-[#38bdf8]/35 shadow-[0_0_18px_5px_rgba(56,189,248,.22)]" />
          <div className="absolute right-[18%] top-[42%] size-4 rounded-full border border-[#7c3aed]/25 bg-white/30" />
          <div className="absolute left-[18%] top-[70%] size-2 rounded-full bg-[#7c3aed]/35 shadow-[0_0_14px_4px_rgba(124,58,237,.2)]" />
          <div className="absolute right-[6%] top-[78%] size-3 rounded-full bg-[#38bdf8]/30" />
        </div>
      <main className="relative mx-auto max-w-[760px] px-4 pb-28 sm:px-6 lg:max-w-7xl lg:max-w-[1440px] lg:pb-12">
        <header className="flex h-[76px] items-center justify-between gap-4 border-b border-[#d8e8f6]/80">
          <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="ChapCam accueil">
            <Image src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo%20chapcam-Zg2rUUnOrSECjteElTxoU1rcYfwF3i.jpg" alt="ChapCam" width={38} height={38} className="h-9 w-9 rounded-xl object-contain shadow-sm" />
            <span className="text-[21px] font-bold tracking-[-0.04em] text-[#10234d]">Chap<span className="text-[#159fea]">Cam</span></span>
          </Link>
          <nav className="hidden items-center gap-7 text-[13px] font-semibold text-[#536783] lg:flex" aria-label="Navigation principale">
            <Link href="#outils" className="transition-colors hover:text-[#10234d]">Fonctionnalités</Link>
            <Link href="#a-propos" className="transition-colors hover:text-[#10234d]">Founder</Link>
            <Link href="#a-propos" className="transition-colors hover:text-[#10234d]">À propos</Link>
            <Link href="#faq" className="transition-colors hover:text-[#10234d]">FAQ</Link>
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <Link href="https://www.tiktok.com/@multivoix.ci" target="_blank" rel="noreferrer" aria-label="TikTok ChapCam" className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#d5e4f1] bg-white/65 text-[#10234d] transition hover:-translate-y-0.5 hover:border-[#9bbce0] hover:shadow-sm">
              <Image src="/images/tiktok-logo.png" alt="TikTok" width={19} height={19} className="h-[19px] w-[19px] object-contain" />
            </Link>
            <button type="button" onClick={() => setPlansOpen(true)} style={{ backgroundColor: "#075985", color: "#ffffff" }} className="rounded-xl border border-[#075985] px-3 py-2 text-[12px] font-bold shadow-[0_6px_18px_-10px_rgba(7,89,133,.9)] transition hover:-translate-y-0.5 hover:bg-[#0369a1] sm:px-3 sm:text-[13px]">Tarifs</button>
            <Link href="/auth/login" className="hidden whitespace-nowrap rounded-xl px-3 py-2 text-[13px] font-semibold text-[#53637c] transition hover:bg-white/70 hover:text-[#10234d] sm:block">Se connecter</Link>
            <Link href="/auth/sign-up" className="whitespace-nowrap rounded-xl bg-gradient-to-r from-[#10a8ec] to-[#7c3aed] px-4 py-2.5 text-[13px] font-bold text-white shadow-[0_8px_24px_-8px_rgba(59,130,246,.7)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-8px_rgba(59,130,246,.75)]">S’inscrire</Link>
          </div>
        </header>

        <CreatorVideoStrip />

        <div className="mb-5 flex h-14 items-center gap-3 rounded-2xl border border-white/80 bg-white/65 px-4 shadow-[0_12px_30px_-20px_rgba(28,77,130,.55)] backdrop-blur"><Search className="h-5 w-5 text-[#6480a4]" /><span className="text-sm text-[#7487a1]">Rechercher un outil, un effet, une idée...</span></div>

        <section className="relative overflow-hidden rounded-[1.7rem] border border-white/90 bg-[#dceeff] shadow-[0_24px_60px_-28px_rgba(37,99,235,.55)] lg:min-h-[500px]">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_28%,rgba(255,255,255,.8),transparent_22%),radial-gradient(circle_at_72%_20%,rgba(56,189,248,.42),transparent_30%),radial-gradient(circle_at_92%_90%,rgba(124,58,237,.3),transparent_34%),radial-gradient(circle_at_8%_82%,rgba(14,165,233,.22)_0_2px,transparent_3px),radial-gradient(circle_at_18%_68%,rgba(124,58,237,.24)_0_3px,transparent_4px),radial-gradient(circle_at_28%_88%,rgba(56,189,248,.28)_0_2px,transparent_3px),radial-gradient(circle_at_44%_18%,rgba(255,255,255,.8)_0_3px,transparent_4px),radial-gradient(circle_at_54%_82%,rgba(124,58,237,.24)_0_3px,transparent_4px),radial-gradient(circle_at_66%_62%,rgba(14,165,233,.24)_0_2px,transparent_3px),radial-gradient(circle_at_78%_88%,rgba(255,255,255,.7)_0_3px,transparent_4px),radial-gradient(circle_at_88%_38%,rgba(124,58,237,.2)_0_2px,transparent_3px)]" />
            <div className="absolute inset-0 opacity-80 [background-image:radial-gradient(circle,rgba(14,165,233,.22)_1px,transparent_1.5px)] [background-size:34px_34px] [mask-image:linear-gradient(to_bottom,transparent,black_18%,black_82%,transparent)]" />
            <span className="absolute left-[7%] top-[16%] text-2xl font-light text-[#0ea5e9]/25">∞</span>
            <span className="absolute left-[22%] top-[74%] text-3xl font-light text-[#7c3aed]/25">∞</span>
            <span className="absolute left-[38%] top-[12%] text-xl font-light text-white/70">∞</span>
            <span className="absolute left-[49%] top-[68%] text-2xl font-light text-[#2563eb]/25">∞</span>
            <span className="absolute right-[31%] top-[18%] text-3xl font-light text-[#7c3aed]/25">∞</span>
            <span className="absolute right-[19%] top-[72%] text-xl font-light text-[#0ea5e9]/25">∞</span>
            <span className="absolute right-[5%] top-[48%] text-2xl font-light text-white/60">∞</span>
            <span className="absolute -left-10 top-12 text-[11rem] font-light leading-none tracking-[-.18em] text-[#38bdf8]/25 blur-[.3px] sm:-left-5 sm:text-[15rem] lg:-left-16 lg:top-20 lg:text-[21rem]">∞</span>
            <span className="absolute right-[34%] top-[-4rem] text-[9rem] font-light leading-none tracking-[-.18em] text-[#7c3aed]/20 sm:text-[13rem] lg:right-[38%] lg:top-[-7rem] lg:text-[18rem]">∞</span>
            <span className="absolute -bottom-16 left-[30%] hidden text-[14rem] font-light leading-none tracking-[-.18em] text-[#0ea5e9]/20 lg:block">∞</span>
            <span className="absolute -bottom-10 right-[-2rem] text-[9rem] font-light leading-none tracking-[-.18em] text-[#2563eb]/25 sm:text-[13rem] lg:-right-10 lg:text-[19rem]">∞</span>
            <div className="absolute left-[4%] top-[20%] h-px w-36 bg-gradient-to-r from-transparent via-[#0ea5e9]/60 to-transparent sm:w-56 lg:left-[14%] lg:w-80" />
            <div className="absolute bottom-[17%] right-[28%] h-px w-28 rotate-[-18deg] bg-gradient-to-r from-transparent via-[#7c3aed]/50 to-transparent sm:w-48 lg:w-72" />
            <div className="absolute left-[13%] top-[24%] size-1.5 rounded-full bg-[#0ea5e9] shadow-[0_0_14px_5px_rgba(14,165,233,.45)] sm:left-[24%]" />
            <div className="absolute bottom-[24%] left-[42%] size-1.5 rounded-full bg-[#7c3aed] shadow-[0_0_14px_5px_rgba(124,58,237,.35)]" />
            <div className="absolute right-[31%] top-[33%] size-1.5 rounded-full bg-[#38bdf8] shadow-[0_0_12px_4px_rgba(56,189,248,.45)]" />
            <div className="absolute left-[5%] top-[38%] hidden h-16 w-24 border-l border-t border-[#0ea5e9]/30 sm:block lg:left-[12%]" />
            <div className="absolute bottom-[12%] right-[8%] hidden h-16 w-28 border-b border-r border-[#7c3aed]/30 sm:block lg:right-[20%]" />
            <div className="absolute left-[3%] top-[58%] flex items-end gap-1 opacity-70"><i className="size-2 rounded-full bg-[#38bdf8] shadow-[0_0_12px_3px_rgba(56,189,248,.5)]" /><i className="mb-3 size-3 rounded-full border border-[#0ea5e9]/50 bg-white/30" /><i className="mb-1 size-1.5 rounded-full bg-[#7c3aed]" /><i className="mb-5 size-2 rounded-full bg-[#38bdf8]/60" /></div>
            <div className="absolute left-[34%] top-[32%] flex items-center gap-2 opacity-60"><i className="size-2 rounded-full bg-white shadow-[0_0_12px_3px_rgba(255,255,255,.7)]" /><i className="size-4 rounded-full border border-[#38bdf8]/50 bg-[#38bdf8]/10" /><i className="size-1.5 rounded-full bg-[#7c3aed]" /></div>
            <div className="absolute bottom-[9%] left-[59%] flex items-end gap-1 opacity-65"><i className="mb-2 size-1.5 rounded-full bg-[#7c3aed]" /><i className="size-3 rounded-full border border-[#7c3aed]/50 bg-white/20" /><i className="mb-4 size-2 rounded-full bg-[#38bdf8] shadow-[0_0_10px_3px_rgba(56,189,248,.4)]" /></div>
            <div className="absolute right-[4%] top-[24%] flex flex-col items-center gap-1 opacity-65"><i className="size-2 rounded-full bg-[#38bdf8]" /><i className="size-3 rounded-full border border-white/60 bg-white/20" /><i className="size-1.5 rounded-full bg-[#7c3aed]" /></div>
          </div>
          <div className="relative z-20 max-w-xl px-5 pb-7 pt-8 sm:px-10 sm:pb-10 sm:pt-12 lg:max-w-[42%] lg:px-10 lg:py-24 xl:px-12"><span className="inline-flex items-center gap-2 rounded-full border border-[#4ec7f1]/40 bg-white/55 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#087bad]"><Sparkles className="h-3.5 w-3.5" />L&apos;IA au service de ta créativité</span><h1 className="mt-5 text-[2.75rem] font-black leading-[.96] tracking-[-.06em] text-[#071a42] sm:text-6xl lg:text-[4.25rem]">Crée <span className="bg-gradient-to-r from-[#079ded] to-[#7654e8] bg-clip-text text-transparent">sans limites.</span></h1><p className="mt-5 max-w-xs text-sm leading-6 text-[#405675]">Première plateforme d’IA dédiée aux transformations en temps réel et à la génération de vidéos full body Swap.</p><Link href="/auth/sign-up" className="mt-6 inline-flex items-center gap-3 rounded-xl bg-gradient-to-r from-[#0ea5e9] to-[#7c3aed] px-6 py-3.5 text-sm font-bold text-white shadow-[0_14px_28px_-12px_rgba(37,99,235,.75)]">Commencer gratuitement <ChevronRight className="h-4 w-4" /></Link><div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-medium text-[#526986]"><span>Accès immédiat</span><span>Outils IA créatifs</span></div></div><div className="relative h-[17rem] border-t border-white/60 bg-[#07111f] sm:h-[25rem] lg:absolute lg:inset-y-0 lg:right-0 lg:h-full lg:w-[58%] lg:border-t-0 lg:border-l lg:border-white/50"><div className="pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-1/4 bg-gradient-to-r from-[#dceeff]/70 to-transparent lg:block" /><video src="/videos/img-1467.mp4" autoPlay muted loop playsInline preload="metadata" className="h-full w-full object-contain object-center" aria-label="Démonstration ChapCam" /></div></section>

        <section id="outils" className="pt-16 lg:pt-24">
          <div className="mb-7 flex items-end justify-between gap-6">
            <div><h2 className="text-3xl font-bold tracking-[-.04em] text-[#071a42] sm:text-4xl">Explore ChapCam</h2><p className="mt-2 text-sm text-[#607493]">Tous tes outils créatifs, dans un seul espace.</p></div>
            <Link href="/dashboard" className="hidden items-center gap-1 text-sm font-semibold text-[#148ee0] sm:flex">Voir tous les outils <ChevronRight className="h-4 w-4" /></Link>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-12 lg:grid-rows-[170px_170px_150px]">
            {tools.map((tool, index) => { const featured = index === 0; return <Link key={tool.title} href={tool.href} className={`group relative overflow-hidden rounded-[18px] border border-[#dbe9f4] bg-white shadow-[0_14px_32px_-24px_rgba(28,77,130,.6)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_38px_-22px_rgba(28,77,130,.55)] ${featured ? "col-span-2 min-h-[430px] bg-[#dceeff] lg:col-span-5 lg:row-span-2 lg:min-h-0" : "min-h-[170px] lg:col-span-4"}`}><div className="absolute inset-0">{tool.media.type === "video" ? <video src={tool.media.src} poster={"poster" in tool.media ? tool.media.poster : undefined} autoPlay muted loop playsInline preload="metadata" aria-label={tool.title} className={`h-full w-full transition duration-500 ${featured ? "bg-[#dceeff] object-contain object-center" : "object-cover group-hover:scale-105"}`} /> : <Image src={tool.media.src} alt={tool.title} fill className="object-cover transition duration-500 group-hover:scale-105" />}</div><div className={`absolute inset-0 ${featured ? "bg-gradient-to-t from-[#071a42]/75 via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-white/20 lg:to-white" : "bg-gradient-to-t from-[#071a42]/85 via-transparent to-transparent"}`} />{featured && <div className="absolute inset-y-0 right-3 z-10 flex w-12 flex-col items-center justify-center gap-2 lg:right-5 lg:w-[36%] lg:flex-row lg:flex-wrap lg:content-center"><span className="mb-1 hidden text-center text-[9px] font-bold uppercase tracking-[.12em] text-[#607493] lg:block">Compatible streaming</span>{streamingPlatforms.map(([name, src]) => <span key={name} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/80 bg-white/85 p-2 shadow-[0_8px_18px_-10px_rgba(7,26,66,.55)]" title={name}><img src={src} alt={name} className="h-full w-full object-contain" /></span>)}</div>}<div className={`absolute z-10 ${featured ? "bottom-0 left-0 max-w-[58%] p-5 text-[#071a42]" : "inset-x-0 bottom-0 p-4 text-white"}`}><h3 className="text-sm font-bold sm:text-base">{tool.title}</h3><p className={`mt-1 text-xs leading-5 ${featured ? "text-[#607493]" : "text-white/80"}`}>{tool.description}</p><span className={`mt-3 inline-flex items-center gap-1 text-xs font-semibold ${featured ? "text-[#148ee0]" : "text-white/90"}`}>Découvrir <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" /></span></div></Link>})}
          </div>
          <Link href="/dashboard" className="mt-5 flex items-center justify-center gap-1 text-sm font-semibold text-[#148ee0] sm:hidden">Voir tous les outils <ChevronRight className="h-4 w-4" /></Link>
        </section>

        <HomeCommunityShowcase />

        <HomepageAbout />

        <HomepageFaq />

      </main>
      <HomepageFooter />
      <nav className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-w-[760px] items-center justify-around rounded-t-[1.7rem] border border-white/80 bg-white/85 px-3 py-3 shadow-[0_-12px_35px_-18px_rgba(28,77,130,.55)] backdrop-blur-xl lg:hidden"><Link href="/" className="flex flex-col items-center gap-1 text-xs font-semibold text-[#148ee0]"><Home className="h-5 w-5" />Accueil</Link><Link href="/dashboard" className="flex flex-col items-center gap-1 text-xs text-[#71839e]"><Search className="h-5 w-5" />Explorer</Link><Link href="/auth/sign-up" className="-mt-7 flex h-14 w-14 flex-col items-center justify-center rounded-full bg-gradient-to-br from-[#0ea5e9] to-[#7c3aed] text-white shadow-[0_10px_24px_-6px_rgba(37,99,235,.75)]"><Plus className="h-7 w-7" /><span className="sr-only">Créer</span></Link><Link href="/dashboard" className="flex flex-col items-center gap-1 text-xs text-[#71839e]"><ImageIcon className="h-5 w-5" />Mes créations</Link><Link href="/dashboard/settings" className="flex flex-col items-center gap-1 text-xs text-[#71839e]"><UserRound className="h-5 w-5" />Profil</Link></nav>
      <PlansTopupModal open={plansOpen} onClose={() => setPlansOpen(false)} />
    </div>
  )
}
