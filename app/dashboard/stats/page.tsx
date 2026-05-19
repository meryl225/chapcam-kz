import { BarChart2 } from 'lucide-react'

export default function StatsPage() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="flex items-center gap-3 text-2xl font-bold text-white">
          <BarChart2 className="h-7 w-7 text-[#00ff88]" />
          STATISTIQUES
        </h1>
        <p className="mt-2 text-gray-400">
          Consulte tes statistiques d&apos;utilisation.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-[#111111] p-6">
          <p className="text-sm uppercase text-gray-400">Sessions totales</p>
          <p className="mt-2 text-3xl font-bold text-white">0</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-[#111111] p-6">
          <p className="text-sm uppercase text-gray-400">Temps de swap</p>
          <p className="mt-2 text-3xl font-bold text-white">0h</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-[#111111] p-6">
          <p className="text-sm uppercase text-gray-400">Avatars utilisés</p>
          <p className="mt-2 text-3xl font-bold text-white">0</p>
        </div>
      </div>
    </div>
  )
}
