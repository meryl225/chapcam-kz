'use client'

import { MessageCircle, Phone, LifeBuoy } from 'lucide-react'

// Numero d'assistance ChapCam (Cote d'Ivoire)
const SUPPORT_PHONE_DISPLAY = '+225 05 55 56 01 89'
const SUPPORT_PHONE_TEL = '+2250555560189'
const SUPPORT_WHATSAPP = '2250555560189'
const WHATSAPP_MESSAGE =
  'Bonjour ChapCam, je rencontre un problème pour utiliser le logiciel et j’ai besoin d’aide.'

export function SupportBanner() {
  const whatsappUrl = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`

  return (
    <section
      aria-label="Assistance ChapCam"
      className="relative mb-8 overflow-hidden rounded-[28px] border border-hairline bg-card p-6 md:p-8"
    >
      {/* halo d'accent */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(100% 120% at 0% 0%, rgba(0,255,136,0.14), transparent 45%), radial-gradient(100% 120% at 100% 100%, rgba(34,211,238,0.12), transparent 50%)',
        }}
      />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15">
            <LifeBuoy className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-bold tracking-tight text-foreground md:text-2xl text-balance">
              Veux-tu une assistance pro&nbsp;?
            </h3>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base text-pretty">
              Tu n’arrives pas à utiliser le logiciel IA&nbsp;? Notre équipe t’aide en direct.
              Écris-nous sur WhatsApp ou appelle-nous, on règle ça ensemble.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center justify-center gap-2.5 rounded-2xl bg-primary px-6 py-3.5 text-base font-bold text-black shadow-[0_0_30px_rgba(0,255,136,0.35)] transition-all hover:scale-[1.02] hover:bg-primary/90"
          >
            <MessageCircle className="h-5 w-5" />
            Nous contacter sur WhatsApp
          </a>
          <a
            href={`tel:${SUPPORT_PHONE_TEL}`}
            className="inline-flex items-center justify-center gap-2.5 rounded-2xl border border-hairline bg-background/40 px-6 py-3.5 text-base font-semibold text-foreground backdrop-blur transition-colors hover:border-primary/40 hover:text-primary"
          >
            <Phone className="h-5 w-5" />
            Appeler&nbsp;: {SUPPORT_PHONE_DISPLAY}
          </a>
        </div>
      </div>
    </section>
  )
}
