"use client"

import Image from "next/image"
import Link from "next/link"
import { Bell, ChevronRight, Home, Image as ImageIcon, Menu, Music2, Plus, Search, Sparkles, UserRound } from "lucide-react"
import { CreatorVideoStrip } from "@/components/creator-video-strip"
import { HomeCommunityShowcase } from "@/components/home-community-showcase"
import { HomepageFaq } from "@/components/homepage-faq"

const tools = [
  { title: "Live Swap", description: "Change de visage en temps réel.", media: { type: "video", src: "/swap/live-swap-demo.mp4" }, icon: Sparkles, color: "#2563eb", href: "/dashboard/live-swap" },
  { title: "Genjutsu", description: "Anime tes images avec un mouvement naturel.", media: { type: "video", src: "/videos/genjutsu-demo.mov" }, icon: Sparkles, color: "#22c55e", href: "/dashboard/genjutsu" },
  { title: "Motion Control", description: "Anime ta photo en 3D.", media: { type: "video", src: "/videos/motion-control-demo.mp4", poster: "/swap/poster-motion.png" }, icon: Sparkles, color: "#6366f1", href: "/dashboard/motion" },
  { title: "Message Vocal", description: "Crée des voix réalistes depuis un texte.", media: { type: "image", src: "/swap/poster-message-vocal.png" }, icon: Menu, color: "#ec4899", href: "/dashboard/message-vocal" },
  { title: "Traduction vidéo", description: "Traduis ta vidéo en 190+ langues.", media: { type: "image", src: "/swap/poster-video-translation.png" }, icon: Music2, color: "#14b8a6", href: "/dashboard/video-translation" },
  { title: "ChapVerify", description: "Détecte les deepfakes.", media: { type: "image", src: "/swap/poster-chapverify.png" }, icon: Bell, color: "#ef4444", href: "/chapverify" },
  { title: "ChapSim", description: "Numéros virtuels, SMS OTP et proxies premium.", media: { type: "image", src: "/chapsim/presentation.jpg" }, icon: ImageIcon, color: "#f59e0b", href: "/chapsim" },
]

export function ReferenceHomepage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#f4f9ff] text-[#071a42]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(125,211,252,0.38),transparent_38%),linear-gradient(180deg,#f8fbff_0%,#e8f4ff_65%,#f8fbff_100%)]" />
      <main className="relative mx-auto max-w-[760px] px-4 pb-28 sm:px-6 lg:max-w-7xl lg:max-w-[1440px] lg:pb-12">
        <header className="flex h-[76px] items-center justify-between gap-4 border-b border-[#d8e8f6]/80">
          <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="ChapCam accueil">
            <Image src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo%20chapcam-Zg2rUUnOrSECjteElTxoU1rcYfwF3i.jpg" alt="ChapCam" width={38} height={38} className="h-9 w-9 rounded-xl object-contain shadow-sm" />
            <span className="text-[21px] font-bold tracking-[-0.04em] text-[#10234d]">Chap<span className="text-[#159fea]">Cam</span></span>
          </Link>
          <nav className="hidden items-center gap-7 text-[13px] font-semibold text-[#536783] lg:flex" aria-label="Navigation principale">
            <Link href="#outils" className="transition-colors hover:text-[#10234d]">Fonctionnalités</Link>
            <Link href="/dashboard/plans" className="transition-colors hover:text-[#10234d]">Tarifs</Link>
            <Link href="#outils" className="transition-colors hover:text-[#10234d]">À propos</Link>
            <Link href="#faq" className="transition-colors hover:text-[#10234d]">FAQ</Link>
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <Link href="https://www.tiktok.com/@multivoix.ci" target="_blank" rel="noreferrer" aria-label="TikTok ChapCam" className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#d5e4f1] bg-white/65 text-[#10234d] transition hover:-translate-y-0.5 hover:border-[#9bbce0] hover:shadow-sm">
              <Music2 className="h-[17px] w-[17px]" />
            </Link>
            <Link href="/auth/login" className="hidden whitespace-nowrap rounded-xl px-3 py-2 text-[13px] font-semibold text-[#53637c] transition hover:bg-white/70 hover:text-[#10234d] sm:block">Se connecter</Link>
            <Link href="/auth/sign-up" className="whitespace-nowrap rounded-xl bg-gradient-to-r from-[#10a8ec] to-[#7c3aed] px-4 py-2.5 text-[13px] font-bold text-white shadow-[0_8px_24px_-8px_rgba(59,130,246,.7)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-8px_rgba(59,130,246,.75)]">S’inscrire gratuitement</Link>
          </div>
        </header>

        <CreatorVideoStrip />

        <div className="mb-5 flex h-14 items-center gap-3 rounded-2xl border border-white/80 bg-white/65 px-4 shadow-[0_12px_30px_-20px_rgba(28,77,130,.55)] backdrop-blur"><Search className="h-5 w-5 text-[#6480a4]" /><span className="text-sm text-[#7487a1]">Rechercher un outil, un effet, une idée...</span></div>

        <section className="relative overflow-hidden rounded-[1.7rem] border border-white/90 bg-[#dceeff] shadow-[0_24px_60px_-28px_rgba(37,99,235,.55)] lg:min-h-[480px]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_35%,rgba(125,211,252,.28),transparent_34%),radial-gradient(circle_at_95%_90%,rgba(139,92,246,.2),transparent_32%)]" />
          <div className="relative z-20 max-w-sm px-7 pb-9 pt-8 sm:px-10 sm:pt-12 lg:max-w-[42%] lg:py-24"><span className="inline-flex items-center gap-2 rounded-full border border-[#4ec7f1]/40 bg-white/55 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#087bad]"><Sparkles className="h-3.5 w-3.5" />L&apos;IA au service de ta créativité</span><h1 className="mt-5 text-5xl font-black leading-[.94] tracking-[-.06em] text-[#071a42] sm:text-6xl">Crée <span className="bg-gradient-to-r from-[#079ded] to-[#7654e8] bg-clip-text text-transparent">sans limites.</span></h1><p className="mt-5 max-w-xs text-sm leading-6 text-[#405675]">Donne vie à tes idées avec des outils IA simples, rapides et puissants.</p><Link href="/auth/sign-up" className="mt-6 inline-flex items-center gap-3 rounded-xl bg-gradient-to-r from-[#0ea5e9] to-[#7c3aed] px-6 py-3.5 text-sm font-bold text-white shadow-[0_14px_28px_-12px_rgba(37,99,235,.75)]">Commencer gratuitement <ChevronRight className="h-4 w-4" /></Link><div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-medium text-[#526986]"><span>Sans carte bancaire</span><span>Accès immédiat</span><span>Outils IA créatifs</span></div></div><div className="relative h-72 sm:h-96 lg:absolute lg:inset-y-0 lg:right-0 lg:h-full lg:w-[58%]"><div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-1/4 bg-gradient-to-r from-[#dceeff]/70 to-transparent" /><video src="/videos/img-1467.mp4" autoPlay muted loop playsInline preload="metadata" className="h-full w-full bg-[#dceeff] object-contain object-center" aria-label="Démonstration ChapCam" /></div></section>

        <section id="outils" className="pt-16 lg:pt-24">
          <div className="mb-7 flex items-end justify-between gap-6">
            <div><h2 className="text-3xl font-bold tracking-[-.04em] text-[#071a42] sm:text-4xl">Explore ChapCam</h2><p className="mt-2 text-sm text-[#607493]">Tous tes outils créatifs, dans un seul espace.</p></div>
            <Link href="/dashboard" className="hidden items-center gap-1 text-sm font-semibold text-[#148ee0] sm:flex">Voir tous les outils <ChevronRight className="h-4 w-4" /></Link>
          </div>
          <div className="grid gap-3 lg:grid-cols-12 lg:grid-rows-[170px_170px_150px]">
            {tools.map((tool, index) => { const Icon = tool.icon; const featured = index === 0; return <Link key={tool.title} href={tool.href} className={`group relative overflow-hidden rounded-[18px] border border-[#dbe9f4] bg-white shadow-[0_14px_32px_-24px_rgba(28,77,130,.6)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_38px_-22px_rgba(28,77,130,.55)] ${featured ? "lg:col-span-5 lg:row-span-2" : "lg:col-span-4"}`}><div className={`absolute inset-0 ${featured ? "lg:w-[58%]" : ""}`}>{tool.media.type === "video" ? <video src={tool.media.src} poster={"poster" in tool.media ? tool.media.poster : undefined} autoPlay muted loop playsInline preload="metadata" aria-label={tool.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <Image src={tool.media.src} alt={tool.title} fill className="object-cover transition duration-500 group-hover:scale-105" />}</div><div className={`absolute inset-0 ${featured ? "bg-gradient-to-r from-transparent via-transparent to-white lg:bg-gradient-to-r lg:from-transparent lg:via-white/20 lg:to-white" : "bg-gradient-to-t from-[#071a42]/85 via-transparent to-transparent"}`} /><div className={`absolute z-10 ${featured ? "bottom-0 left-0 max-w-[58%] p-5 text-[#071a42]" : "inset-x-0 bottom-0 p-4 text-white"}`}><span className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl text-white" style={{ backgroundColor: tool.color }}><Icon className="h-4 w-4" /></span><h3 className="text-sm font-bold sm:text-base">{tool.title}</h3><p className={`mt-1 text-xs leading-5 ${featured ? "text-[#607493]" : "text-white/80"}`}>{tool.description}</p><span className={`mt-3 inline-flex items-center gap-1 text-xs font-semibold ${featured ? "text-[#148ee0]" : "text-white/90"}`}>Découvrir <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" /></span></div></Link>})}
          </div>
          <Link href="/dashboard" className="mt-5 flex items-center justify-center gap-1 text-sm font-semibold text-[#148ee0] sm:hidden">Voir tous les outils <ChevronRight className="h-4 w-4" /></Link>
        </section>

        <HomeCommunityShowcase />

        <HomepageFaq />

        <section id="tarifs" className="mt-10 hidden rounded-3xl bg-[#102b63] px-8 py-10 text-white shadow-[0_18px_45px_-24px_rgba(16,43,99,.7)] lg:block"><div className="flex items-center justify-between gap-8"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-cyan-300">ChapCam Pro</p><h2 className="mt-2 text-3xl font-bold">Crée sans limites.</h2><p className="mt-2 text-sm text-blue-100/75">Des outils IA conçus pour donner vie à toutes tes idées.</p></div><Link href="/dashboard/plans" className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#102b63]">Voir les tarifs</Link></div></section>
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-w-[760px] items-center justify-around rounded-t-[1.7rem] border border-white/80 bg-white/85 px-3 py-3 shadow-[0_-12px_35px_-18px_rgba(28,77,130,.55)] backdrop-blur-xl lg:hidden"><Link href="/" className="flex flex-col items-center gap-1 text-xs font-semibold text-[#148ee0]"><Home className="h-5 w-5" />Accueil</Link><Link href="/dashboard" className="flex flex-col items-center gap-1 text-xs text-[#71839e]"><Search className="h-5 w-5" />Explorer</Link><Link href="/auth/sign-up" className="-mt-7 flex h-14 w-14 flex-col items-center justify-center rounded-full bg-gradient-to-br from-[#0ea5e9] to-[#7c3aed] text-white shadow-[0_10px_24px_-6px_rgba(37,99,235,.75)]"><Plus className="h-7 w-7" /><span className="sr-only">Créer</span></Link><Link href="/dashboard" className="flex flex-col items-center gap-1 text-xs text-[#71839e]"><ImageIcon className="h-5 w-5" />Mes créations</Link><Link href="/dashboard/settings" className="flex flex-col items-center gap-1 text-xs text-[#71839e]"><UserRound className="h-5 w-5" />Profil</Link></nav>
    </div>
  )
}
