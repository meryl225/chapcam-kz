"use client"

import { motion } from "framer-motion"
import { MessageCircle, Mail, Handshake, ArrowRight } from "lucide-react"
import { useT } from "@/lib/i18n/language-provider"

// Coordonnees officielles ChapCam (reprises du header / lib/email.ts).
const WHATSAPP_NUMBER_DISPLAY = "+225 05 55 56 01 89"
const WHATSAPP_URL =
  "https://wa.me/2250555560189?text=" +
  encodeURIComponent("Bonjour ChapCam, je souhaite discuter d'un partenariat.")
const EMAIL = "contact@chapcam.com"
const EMAIL_URL =
  "mailto:contact@chapcam.com?subject=" + encodeURIComponent("Demande de partenariat ChapCam")

export function PartnershipSection() {
  const t = useT()
  return (
    <section id="partenariat" className="relative px-6 py-24 overflow-hidden">
      {/* Effets de fond */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/3 top-1/4 h-[400px] w-[400px] rounded-full bg-[#00ff88]/5 blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/3 h-[350px] w-[350px] rounded-full bg-[#25D366]/5 blur-[90px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl">
        {/* En-tete */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-14 text-center"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#00ff88]/30 bg-[#00ff88]/10 px-4 py-2">
            <Handshake className="h-4 w-4 text-[#00ff88]" />
            <span className="text-sm font-semibold tracking-wide text-[#00ff88]">{t("PARTENARIAT")}</span>
          </div>

          <h2 className="mb-4 text-balance text-4xl font-bold text-white md:text-5xl">
            {t("Travaillons")} <span className="text-[#00ff88]">{t("ensemble")}</span>
          </h2>
          <p className="mx-auto max-w-2xl text-pretty leading-relaxed text-gray-300">
            {t(
              "Créateur, agence, revendeur ou média ? Contacte l'équipe ChapCam pour un partenariat, une collaboration ou toute question. On te répond rapidement par mail ou sur WhatsApp.",
            )}
          </p>
        </motion.div>

        {/* Cartes de contact */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* WhatsApp */}
          <motion.a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            whileHover={{ y: -4 }}
            className="group relative flex flex-col rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-8 transition-colors hover:border-[#25D366]/50"
          >
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#25D366]/15 ring-1 ring-[#25D366]/30">
              <MessageCircle className="h-7 w-7 text-[#25D366]" />
            </div>
            <h3 className="mb-1 text-xl font-bold text-white">WhatsApp</h3>
            <p className="mb-4 text-sm text-gray-400">{t("Réponse rapide, assistance en direct")}</p>
            <span className="text-lg font-semibold text-white">{WHATSAPP_NUMBER_DISPLAY}</span>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#25D366]">
              {t("Écrire sur WhatsApp")}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </motion.a>

          {/* Email */}
          <motion.a
            href={EMAIL_URL}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            whileHover={{ y: -4 }}
            className="group relative flex flex-col rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-8 transition-colors hover:border-[#00d4ff]/50"
          >
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#00d4ff]/15 ring-1 ring-[#00d4ff]/30">
              <Mail className="h-7 w-7 text-[#00d4ff]" />
            </div>
            <h3 className="mb-1 text-xl font-bold text-white">{t("Email")}</h3>
            <p className="mb-4 text-sm text-gray-400">{t("Pour les demandes détaillées & pros")}</p>
            <span className="text-lg font-semibold text-white">{EMAIL}</span>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#00d4ff]">
              {t("Nous envoyer un mail")}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </motion.a>
        </div>
      </div>
    </section>
  )
}
