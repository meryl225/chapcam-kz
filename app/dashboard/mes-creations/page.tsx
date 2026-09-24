'use client'

import Link from 'next/link'
import { ArrowLeft, Film } from 'lucide-react'
import { VideoHistorySection } from '@/components/video-history-section'

// Page "Toutes mes créations" : liste complète de l'historique vidéo, tous
// outils confondus. Accessible depuis le lien "Voir toutes mes créations" du
// dashboard (qui pointait par erreur vers /dashboard/mes-demandes).
export default function MesCreationsPage() {
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/dashboard"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-hairline bg-secondary text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <Film className="h-6 w-6 text-primary" />
            Toutes mes créations
          </h1>
          <p className="text-sm text-muted-foreground">
            Retrouvez l&apos;ensemble de vos vidéos générées, tous outils confondus.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 md:p-5">
        <VideoHistorySection tool="all" />
      </div>
    </div>
  )
}
