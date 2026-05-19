import { Zap } from 'lucide-react'

export default function DashboardPage() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="flex items-center gap-3 text-2xl font-bold text-white">
          <Zap className="h-7 w-7 text-[#00ff88]" />
          LIVE SWAP
        </h1>
        <p className="mt-2 text-gray-400">
          Transforme ton apparence en temps réel pendant tes streams et appels vidéo.
        </p>
      </div>

      {/* Placeholder content */}
      <div className="rounded-lg border border-white/10 bg-[#111111] p-8 text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#00ff88]/10">
          <Zap className="h-10 w-10 text-[#00ff88]" />
        </div>
        <h2 className="mb-2 text-xl font-bold text-white">
          Prêt à démarrer le swap ?
        </h2>
        <p className="mb-6 text-gray-400">
          Sélectionne un avatar et lance la webcam virtuelle pour commencer.
        </p>
        <button className="rounded-lg bg-[#00ff88] px-6 py-3 font-bold uppercase text-black transition-colors hover:bg-[#00cc6a]">
          DÉMARRER LE SWAP
        </button>
      </div>
    </div>
  )
}
