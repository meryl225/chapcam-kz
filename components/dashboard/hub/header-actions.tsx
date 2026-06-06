'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CreditCard, ClipboardList, Download } from 'lucide-react'
import { InstallationRequestModal } from '@/components/dashboard/installation-request-modal'

export function HeaderActions() {
  const [showInstallModal, setShowInstallModal] = useState(false)

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {/* Recharger (orange) */}
        <Link
          href="/dashboard/plans"
          className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_20px_rgba(249,115,22,0.4)] transition-colors hover:bg-orange-600"
        >
          <CreditCard className="h-4 w-4" />
          Recharger
        </Link>

        {/* Mes demandes */}
        <Link
          href="/dashboard/mes-demandes"
          className="flex items-center gap-2 rounded-lg border border-hairline bg-secondary px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-white/25"
        >
          <ClipboardList className="h-4 w-4" />
          Mes demandes
        </Link>

        {/* Demande d'installation (bleu) */}
        <button
          onClick={() => setShowInstallModal(true)}
          className="flex items-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-colors hover:bg-[#1d4ed8]"
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Demande d&apos;installation</span>
          <span className="sm:hidden">Installation</span>
        </button>
      </div>

      <InstallationRequestModal open={showInstallModal} onClose={() => setShowInstallModal(false)} />
    </>
  )
}
