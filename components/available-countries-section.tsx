"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { PAYMENT_COUNTRIES } from "@/lib/geniuspay-countries"

export function AvailableCountriesSection() {
  return (
    <section className="relative py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4">
        {/* Grace au paiement crypto (Trybit), ChapCam est accessible partout dans le monde */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0a0f0d] px-6 py-12 text-center md:py-16"
        >
          <div className="relative mx-auto mb-8 aspect-[16/9] w-full max-w-3xl">
            <Image
              src="/images/world-map-dots.png"
              alt="Carte du monde : ChapCam accessible partout"
              fill
              className="object-contain opacity-80"
              sizes="(max-width: 768px) 100vw, 768px"
            />
          </div>
          <p className="mb-3 text-sm font-bold uppercase tracking-widest text-[#f7931a]">
            Paiement crypto
          </p>
          <h3 className="text-balance text-2xl font-black text-white md:text-4xl">
            Et partout dans le monde
          </h3>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-base text-gray-400 md:text-lg">
            Ou que vous soyez, payez en cryptomonnaie (Bitcoin, USDT, ETH et plus) via Trybit
            et activez votre compte instantanement, sans frontieres.
          </p>
        </motion.div>

        {/* Liste complete : carte bancaire disponible dans tous ces pays */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 }}
          className="mt-16"
        >
          <div className="mb-8 text-center">
            <p className="mb-3 text-sm font-bold uppercase tracking-widest text-[#00ff88]">
              Carte bancaire acceptee
            </p>
            <h3 className="text-balance text-2xl font-black text-white md:text-3xl">
              Payez par carte depuis {PAYMENT_COUNTRIES.length}+ pays
            </h3>
            <p className="mx-auto mt-3 max-w-2xl text-pretty text-sm text-gray-400 md:text-base">
              Visa et Mastercard sont acceptees partout dans le monde. Voici la liste complete des
              pays pris en charge.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <span className="flex h-11 w-16 items-center justify-center rounded-xl bg-white px-3">
                <img src="/images/visa-logo.svg" alt="Visa" className="max-h-4 max-w-full object-contain" />
              </span>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white p-2">
                <img src="/images/mastercard-logo.svg" alt="Mastercard" className="max-h-full max-w-full object-contain" />
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {PAYMENT_COUNTRIES.map((country) => (
              <div
                key={country.code}
                className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 transition-colors hover:border-[#00ff88]/40 hover:bg-white/[0.06]"
              >
                <img
                  src={`https://flagcdn.com/w40/${country.code.toLowerCase()}.png`}
                  srcSet={`https://flagcdn.com/w80/${country.code.toLowerCase()}.png 2x`}
                  width={24}
                  height={18}
                  loading="lazy"
                  alt=""
                  aria-hidden
                  className="h-[18px] w-6 shrink-0 rounded-[3px] object-cover shadow-sm ring-1 ring-white/10"
                />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-200">
                  {country.name}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
