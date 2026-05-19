import { Users } from 'lucide-react'

export default function AvatarsPage() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="flex items-center gap-3 text-2xl font-bold text-white">
          <Users className="h-7 w-7 text-[#00ff88]" />
          MES AVATARS
        </h1>
        <p className="mt-2 text-gray-400">
          Gère tes avatars personnalisés pour le face swap.
        </p>
      </div>

      <div className="rounded-lg border border-white/10 bg-[#111111] p-8 text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#7c3aed]/10">
          <Users className="h-10 w-10 text-[#7c3aed]" />
        </div>
        <h2 className="mb-2 text-xl font-bold text-white">
          Aucun avatar pour le moment
        </h2>
        <p className="mb-6 text-gray-400">
          Ajoute ton premier avatar pour commencer à utiliser le face swap.
        </p>
        <button className="rounded-lg bg-[#7c3aed] px-6 py-3 font-bold uppercase text-white transition-colors hover:bg-[#6d28d9]">
          AJOUTER UN AVATAR
        </button>
      </div>
    </div>
  )
}
