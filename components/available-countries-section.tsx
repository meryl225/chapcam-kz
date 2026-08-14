"use client"

import { motion } from "framer-motion"
import { PAYMENT_COUNTRIES } from "@/lib/geniuspay-countries"

export function AvailableCountriesSection() {
  return (
    <section className="relative py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4">
        {/* Liste complete : carte bancaire disponible dans tous ces pays */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 }}
        >
          <div className="mb-8 text-center">
            <p className="mb-3 text-sm font-bold uppercase tracking-widest text-[#00ff88]">
              Carte bancaire &amp; Mobile Money acceptes
            </p>
            <h3 className="text-balance text-2xl font-black text-white md:text-3xl">
              Payez depuis {PAYMENT_COUNTRIES.length}+ pays
            </h3>
            <p className="mx-auto mt-3 max-w-2xl text-pretty text-sm text-gray-400 md:text-base">
              Visa et Mastercard sont acceptees partout dans le monde, et le Mobile Money
              (Orange Money, MTN, Moov, Wave, M-Pesa, Airtel...) dans de nombreux pays africains.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <span className="flex h-11 w-16 items-center justify-center rounded-xl bg-white px-3">
                <img src="/images/visa-logo.svg" alt="Visa" className="max-h-4 max-w-full object-contain" />
              </span>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white p-2">
                <img src="/images/mastercard-logo.svg" alt="Mastercard" className="max-h-full max-w-full object-contain" />
              </span>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-gray-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#00ff88]" aria-hidden />
                Carte bancaire (tous les pays)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#f59e0b]" aria-hidden />
                Mobile Money disponible
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {PAYMENT_COUNTRIES.map((country) => {
              const hasMobileMoney = country.methods.some((m) => m.kind === "mobile")
              return (
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
                  {hasMobileMoney && (
                    <span
                      title="Mobile Money disponible"
                      className="shrink-0 rounded-full bg-[#f59e0b]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#fbbf24] ring-1 ring-inset ring-[#f59e0b]/30"
                    >
                      MoMo
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
