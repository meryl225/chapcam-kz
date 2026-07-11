'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CreditCard, ClipboardList, Download, ChevronRight } from 'lucide-react'
import { InstallationRequestModal } from '@/components/dashboard/installation-request-modal'

export function HeaderActions() {
  const [showInstallModal, setShowInstallModal] = useState(false)

  return (
    <>
      <div className="w-full overflow-hidden rounded-2xl border border-hairline bg-card/80 p-2 backdrop-blur lg:w-72">
        <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-text-faint">
          Actions rapides
        </p>

        <div className="flex flex-col gap-1">
          {/* Recharger (accent primaire) */}
          <Link
            href="/dashboard/plans"
            className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-primary/10"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary transition-transform duration-300 group-hover:scale-105">
              <CreditCard className="h-[18px] w-[18px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-foreground">Recharger</span>
              <span className="block truncate text-[11px] text-text-faint">
                Ajoute des crédits de swap
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-text-faint transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-primary" />
          </Link>

          {/* Mes demandes */}
          <Link
            href="/dashboard/mes-demandes"
            className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/5"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#22d3ee]/15 text-[#22d3ee] transition-transform duration-300 group-hover:scale-105">
              <ClipboardList className="h-[18px] w-[18px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-foreground">Mes demandes</span>
              <span className="block truncate text-[11px] text-text-faint">
                Suivi de tes requêtes
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-text-faint transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-foreground" />
          </Link>

          {/* Demande d'installation */}
          <button
            onClick={() => setShowInstallModal(true)}
            className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[#2563eb]/10"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#2563eb]/15 text-[#3b82f6] transition-transform duration-300 group-hover:scale-105">
              <Download className="h-[18px] w-[18px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-foreground">
                Demande d&apos;installation
              </span>
              <span className="block truncate text-[11px] text-text-faint">
                On installe ChapCam pour toi
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-text-faint transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-[#3b82f6]" />
          </button>
        </div>
      </div>

      <InstallationRequestModal open={showInstallModal} onClose={() => setShowInstallModal(false)} />
    </>
  )
}
