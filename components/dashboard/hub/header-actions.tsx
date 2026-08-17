'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CreditCard, ClipboardList, Download, ChevronRight, Clock, Loader2 } from 'lucide-react'
import { InstallationRequestModal } from '@/components/dashboard/installation-request-modal'
import { usePaymentCheckout } from '@/components/payment/use-payment-checkout'
import { MINUTES_OFFER } from '@/lib/minutes-offers'
import { useT } from '@/lib/i18n/language-provider'

export function HeaderActions() {
  const t = useT()
  const [showInstallModal, setShowInstallModal] = useState(false)
  const { startCheckout, pendingKey, modal } = usePaymentCheckout()
  const minutesLoading = pendingKey === MINUTES_OFFER.id

  return (
    <>
      <div className="w-full overflow-hidden rounded-2xl border border-hairline bg-card/80 p-2 backdrop-blur lg:w-72">
        <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-text-faint">
          {t('Actions rapides')}
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
              <span className="block text-sm font-semibold text-foreground">{t('Recharger')}</span>
              <span className="block truncate text-[11px] text-text-faint">
                {t('Ajoute des crédits de swap')}
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-text-faint transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-primary" />
          </Link>

          {/* Ajouter des minutes : credite des minutes de swap SANS changer le
              forfait (meme en VIP). 4 min = 10 000 F. */}
          <button
            onClick={() => startCheckout(MINUTES_OFFER.id)}
            disabled={minutesLoading}
            className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[#a855f7]/10 disabled:opacity-60"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#a855f7]/15 text-[#c084fc] transition-transform duration-300 group-hover:scale-105">
              {minutesLoading ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : <Clock className="h-[18px] w-[18px]" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-foreground">{t('Ajouter des minutes')}</span>
              <span className="block truncate text-[11px] text-text-faint">
                {t('4 min de swap · 10 000 F, ton forfait ne change pas')}
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-text-faint transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-[#c084fc]" />
          </button>

          {/* Mes demandes */}
          <Link
            href="/dashboard/mes-demandes"
            className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/5"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#22d3ee]/15 text-[#22d3ee] transition-transform duration-300 group-hover:scale-105">
              <ClipboardList className="h-[18px] w-[18px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-foreground">{t('Mes demandes')}</span>
              <span className="block truncate text-[11px] text-text-faint">
                {t('Suivi de tes requêtes')}
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
                {t('Demande d\'installation')}
              </span>
              <span className="block truncate text-[11px] text-text-faint">
                {t('On installe ChapCam pour toi')}
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-text-faint transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-[#3b82f6]" />
          </button>
        </div>
      </div>

      <InstallationRequestModal open={showInstallModal} onClose={() => setShowInstallModal(false)} />
      {modal}
    </>
  )
}
