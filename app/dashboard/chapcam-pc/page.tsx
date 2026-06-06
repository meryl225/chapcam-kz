import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Eye } from 'lucide-react'
import { ChapCamPcCard } from '@/components/dashboard/hub/chapcam-pc-card'
import { DesktopDownloadSection } from '@/components/desktop/desktop-download-section'
import { getDesktopDownloadUrl } from '@/lib/pc-offer'

export const metadata: Metadata = {
  title: 'ChapCam PC — Mode Gamer',
  description:
    'Achete ChapCam PC : face swap en temps reel sur ton GPU local, camera virtuelle, paiement unique a vie. Telechargement apres achat.',
}

export default function ChapCamPcPage() {
  const downloadUrl = getDesktopDownloadUrl()

  return (
    <div className="min-h-screen bg-background px-4 py-10 md:px-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-hairline bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Tableau de bord
          </Link>
          <Link
            href="/desktop"
            className="inline-flex items-center gap-2 rounded-xl border border-hairline bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <Eye className="h-4 w-4" />
            Voir l&apos;interface
          </Link>
        </div>

        <header className="text-center">
          <h1 className="text-3xl font-black text-foreground text-balance md:text-4xl">
            ChapCam PC — Mode Gamer
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty md:text-base">
            Face swap en temps reel sur ton PC Windows. Sans internet. Sans abonnement.
            Paiement unique, licence a vie.
          </p>
        </header>

        <ChapCamPcCard />

        <DesktopDownloadSection downloadUrl={downloadUrl} />
      </div>
    </div>
  )
}
