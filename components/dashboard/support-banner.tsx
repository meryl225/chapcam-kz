'use client'

import { MessageCircle, Phone, LifeBuoy } from 'lucide-react'
import { useT } from '@/lib/i18n/language-provider'

// Numero d'assistance ChapCam (Cote d'Ivoire)
const SUPPORT_PHONE_DISPLAY = '+225 05 55 56 01 89'
const SUPPORT_PHONE_TEL = '+2250555560189'
const SUPPORT_WHATSAPP = '2250555560189'
const WHATSAPP_MESSAGE =
  'Bonjour ChapCam, je rencontre un problème pour utiliser le logiciel et j’ai besoin d’aide.'

export function SupportBanner() {
  const t = useT()
  const whatsappUrl = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`

  return (
    <section
      aria-label="Assistance ChapCam"
      className="mb-8 flex flex-col gap-4 rounded-2xl border border-hairline bg-card/40 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <LifeBuoy className="h-4 w-4 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground text-pretty">
          <span className="font-medium text-foreground">{t('Besoin d’aide ?')}</span>{' '}
          {t('Notre équipe t’assiste en direct sur WhatsApp ou par téléphone.')}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </a>
        <a
          href={`tel:${SUPPORT_PHONE_TEL}`}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-hairline px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
        >
          <Phone className="h-4 w-4" />
          <span className="hidden sm:inline">{SUPPORT_PHONE_DISPLAY}</span>
          <span className="sm:hidden">{t('Appeler')}</span>
        </a>
      </div>
    </section>
  )
}
