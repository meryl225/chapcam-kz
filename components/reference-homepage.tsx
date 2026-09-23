"use client"

import Image from "next/image"
import Link from "next/link"
import { Bell, Camera, ChevronRight, Home, Image as ImageIcon, Menu, Play, Plus, Search, Sparkles, UserRound } from "lucide-react"

const creators = [
  ["a3", "1.2M"],
  ["a2", "842K"],
  ["a6", "2.1M"],
  ["a4", "1.4M"],
  ["a1", "980K"],
  ["a5", "1.6M"],
]

const tools = [
  { title: "Live Swap", image: "/images/hero/creator-swapped.png", icon: Sparkles, color: "#2563eb", href: "/dashboard/live-swap" },
  { title: "Photos en vidéo", image: "/images/hero/creator-real.png", icon: Camera, color: "#10b981", href: "/dashboard/photo-video" },
  { title: "Motion Control", image: "/images/hero/game-scene.png", icon: Sparkles, color: "#6366f1", href: "/dashboard/motion" },
  { title: "Message Vocal", image: "/images/voice-changer-i9.png", icon: Menu, color: "#ec4899", href: "/dashboard/voice" },
  { title: "Genjutsu", image: "/images/hero/studio-after.png", icon: Sparkles, color: "#22c55e", href: "/dashboard/genjutsu" },
]

const community = [
  ["/images/hero/creator-real.png", "3.4M"],
  ["/images/hero/game-scene.png", "2.8M"],
  ["/images/hero/creator-swapped.png", "1.1M"],
  ["/images/hero/studio-after.png", "920K"],
]

export function ReferenceHomepage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#f4f9ff] text-[#071a42]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(125,211,252,0.38),transparent_38%),linear-gradient(180deg,#f8fbff_0%,#e8f4ff_65%,#f8fbff_100%)]" />
      <main className="relative mx-auto max-w-[760px] px-4 pb-28 sm:px-6 lg:max-w-7xl lg:pb-12">
        <header className="flex h-20 items-center justify-between gap-3">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <Image src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo%20chapcam-Zg2rUUnOrSECjteElTxoU1rcYfwF3i.jpg" alt="ChapCam" width={42} height={42} className="h-10 w-10 rounded-xl object-contain shadow-sm" />
            <span className="text-xl font-bold tracking-tight text-[#10234d]">Chap<span className="text-[#159fea]">Cam</span></span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-[#4c5d7a] lg:flex"><Link href="#outils" className="hover:text-[#10234d]">Fonctionnalités</Link><Link href="#tarifs" className="hover:text-[#10234d]">Tarifs</Link><Link href="#outils" className="hover:text-[#10234d]">À propos</Link><Link href="/blog" className="hover:text-[#10234d]">Blog</Link></nav>
          <div className="flex items-center gap-2"><Link href="/auth/login" className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-[#53637c] sm:block">Se connecter</Link><Link href="/auth/sign-up" className="rounded-xl bg-gradient-to-r from-[#10a8ec] to-[#7c3aed] px-4 py-2.5 text-sm font-bold text-white shadow-[0_8px_24px_-8px_rgba(59,130,246,.7)]">S’inscrire</Link></div>
        </header>

        <section className="mb-5 flex snap-x gap-3 overflow-x-auto pb-1 pt-2 [scrollbar-width:none] lg:mb-8"><div className="flex min-w-max gap-3">{creators.map(([avatar, views]) => <div key={avatar} className="relative h-36 w-28 shrink-0 overflow-hidden rounded-2xl border border-white/70 bg-white shadow-[0_8px_20px_-12px_rgba(28,77,130,.5)] sm:h-40 sm:w-32"><Image src={`/images/hero/avatars/${avatar}.png`} alt="Créateur ChapCam" fill className="object-cover" /><div className="absolute inset-x-2 bottom-2 flex items-center gap-1 text-xs font-semibold text-white drop-shadow"><Play className="h-3 w-3 fill-current" />{views}</div></div>)}</div></section>

        <div className="mb-5 flex h-14 items-center gap-3 rounded-2xl border border-white/80 bg-white/65 px-4 shadow-[0_12px_30px_-20px_rgba(28,77,130,.55)] backdrop-blur"><Search className="h-5 w-5 text-[#6480a4]" /><span className="text-sm text-[#7487a1]">Rechercher un outil, un effet, une idée...</span></div>

        <section className="relative overflow-hidden rounded-[1.7rem] border border-white/90 bg-gradient-to-br from-[#e9f7ff] via-[#c9e9ff] to-[#e7e3ff] shadow-[0_24px_60px_-28px_rgba(37,99,235,.55)] lg:min-h-[430px]">
          <div className="relative z-10 max-w-sm px-7 pb-9 pt-8 sm:px-10 sm:pt-12 lg:max-w-[48%] lg:py-24"><span className="inline-flex items-center gap-2 rounded-full border border-[#4ec7f1]/40 bg-white/45 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#087bad]"><Sparkles className="h-3.5 w-3.5" />L&apos;IA au service de ta créativité</span><h1 className="mt-5 text-5xl font-black leading-[.92] tracking-[-.06em] text-[#071a42] sm:text-6xl">Crée sans <span className="text-[#079ded]">limites.</span></h1><p className="mt-5 max-w-xs text-sm leading-6 text-[#405675]">Change de visage, anime tes photos et donne vie à toutes tes idées avec ChapCam.</p><Link href="/auth/sign-up" className="mt-6 inline-flex items-center gap-3 rounded-xl bg-gradient-to-r from-[#0ea5e9] to-[#7c3aed] px-6 py-3.5 text-sm font-bold text-white shadow-[0_14px_28px_-12px_rgba(37,99,235,.75)]">Commencer gratuitement <ChevronRight className="h-4 w-4" /></Link></div><div className="relative h-72 sm:h-96 lg:absolute lg:inset-y-0 lg:right-0 lg:h-full lg:w-[58%]"><div className="absolute inset-0 bg-gradient-to-r from-[#d7efff] via-transparent to-transparent lg:z-10" /><Image src="/images/hero/creator-swapped.png" alt="Création ChapCam" fill priority className="object-cover object-center" /><div className="absolute bottom-7 right-6 max-w-[130px] rotate-[-6deg] text-right text-xl font-semibold italic text-[#087bad]">Plus qu&apos;un outil,<br />une nouvelle réalité.</div></div></section>

        <section id="outils" className="pt-8"><div className="mb-4 flex items-end justify-between"><h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Nos outils</h2><Link href="/dashboard" className="flex items-center gap-1 text-sm font-semibold text-[#148ee0]">Voir tout <ChevronRight className="h-4 w-4" /></Link></div><div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-3 [scrollbar-width:none] lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0">{tools.map((tool) => { const Icon = tool.icon; return <Link key={tool.title} href={tool.href} className="group relative h-44 min-w-[128px] snap-start overflow-hidden rounded-2xl border border-white/80 bg-white shadow-[0_10px_24px_-18px_rgba(28,77,130,.6)] lg:min-w-0"><Image src={tool.image} alt={tool.title} fill className="object-cover transition duration-500 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-[#061b42]/85 via-transparent to-transparent" /><span className="absolute bottom-11 left-3 flex h-8 w-8 items-center justify-center rounded-xl text-white" style={{ backgroundColor: tool.color }}><Icon className="h-4 w-4" /></span><span className="absolute bottom-3 left-3 text-xs font-bold text-white">{tool.title}</span></Link>})}</div></section>

        <section className="pt-8"><div className="mb-4 flex items-end justify-between"><h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Créations de la communauté</h2><Link href="/dashboard" className="flex items-center gap-1 text-sm font-semibold text-[#148ee0]">Voir plus <ChevronRight className="h-4 w-4" /></Link></div><div className="mb-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">{["Pour toi", "Tendances", "Avant / Après", "Vidéos IA", "Looks", "Voyages"].map((tab, index) => <button key={tab} className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-semibold ${index === 0 ? "border-[#079ded] bg-white text-[#079ded]" : "border-white/80 bg-white/45 text-[#667a98]"}`}>{tab}</button>)}</div><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{community.map(([image, views]) => <div key={image} className="relative aspect-[1.65] overflow-hidden rounded-2xl border border-white/80 bg-white"><Image src={image} alt="Création de la communauté ChapCam" fill className="object-cover" /><span className="absolute bottom-2 left-2 flex items-center gap-1 text-xs font-semibold text-white drop-shadow"><Play className="h-3 w-3 fill-current" />{views}</span></div>)}</div></section>

        <section id="tarifs" className="mt-10 hidden rounded-3xl bg-[#102b63] px-8 py-10 text-white shadow-[0_18px_45px_-24px_rgba(16,43,99,.7)] lg:block"><div className="flex items-center justify-between gap-8"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-cyan-300">ChapCam Pro</p><h2 className="mt-2 text-3xl font-bold">Crée sans limites.</h2><p className="mt-2 text-sm text-blue-100/75">Des outils IA conçus pour donner vie à toutes tes idées.</p></div><Link href="/dashboard/plans" className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#102b63]">Voir les tarifs</Link></div></section>
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-w-[760px] items-center justify-around rounded-t-[1.7rem] border border-white/80 bg-white/85 px-3 py-3 shadow-[0_-12px_35px_-18px_rgba(28,77,130,.55)] backdrop-blur-xl lg:hidden"><Link href="/" className="flex flex-col items-center gap-1 text-xs font-semibold text-[#148ee0]"><Home className="h-5 w-5" />Accueil</Link><Link href="/dashboard" className="flex flex-col items-center gap-1 text-xs text-[#71839e]"><Search className="h-5 w-5" />Explorer</Link><Link href="/auth/sign-up" className="-mt-7 flex h-14 w-14 flex-col items-center justify-center rounded-full bg-gradient-to-br from-[#0ea5e9] to-[#7c3aed] text-white shadow-[0_10px_24px_-6px_rgba(37,99,235,.75)]"><Plus className="h-7 w-7" /><span className="sr-only">Créer</span></Link><Link href="/dashboard" className="flex flex-col items-center gap-1 text-xs text-[#71839e]"><ImageIcon className="h-5 w-5" />Mes créations</Link><Link href="/dashboard/settings" className="flex flex-col items-center gap-1 text-xs text-[#71839e]"><UserRound className="h-5 w-5" />Profil</Link></nav>
    </div>
  )
}
