"use client"

import { motion } from "framer-motion"
import {
  PRINCIPAL_COUNTRIES,
  OTHER_COUNTRIES_COUNT,
  getPaymentOperators,
} from "@/lib/geniuspay-countries"

export function AvailableCountriesSection() {
  return (
    <section className="relative py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 }}
        >
          <div className="mb-10 text-center">
            <p className="mb-3 text-sm font-bold uppercase tracking-widest text-[#00ff88]">
              Carte bancaire &amp; Mobile Money acceptes
            </p>
            <h3 className="text-balance text-2xl font-black text-white md:text-3xl">
              Payez depuis {PRINCIPAL_COUNTRIES.length + OTHER_COUNTRIES_COUNT}+ pays
            </h3>
            <p className="mx-auto mt-3 max-w-2xl text-pretty text-sm text-gray-400 md:text-base">
              Le Mobile Money (Orange Money, MTN, Moov, Wave, M-Pesa, Airtel...) est disponible dans
              les pays ci-dessous, et la carte bancaire Visa / Mastercard partout dans le monde.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white p-2.5 ring-1 ring-black/5">
                <img src="/images/visa-logo.svg" alt="Visa" className="h-full w-full object-contain" />
              </span>
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white p-2.5 ring-1 ring-black/5">
                <img src="/images/mastercard-logo.svg" alt="Mastercard" className="h-full w-full object-contain" />
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PRINCIPAL_COUNTRIES.map((country) => {
              const operators = getPaymentOperators(country)
              return (
                <div
                  key={country.code}
                  className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-[#00ff88]/40 hover:bg-white/[0.06]"
                >
                  <div className="flex items-center gap-2.5">
                    <img
                      src={`https://flagcdn.com/w40/${country.code.toLowerCase()}.png`}
                      srcSet={`https://flagcdn.com/w80/${country.code.toLowerCase()}.png 2x`}
                      width={26}
                      height={20}
                      loading="lazy"
                      alt=""
                      aria-hidden
                      className="h-5 w-[26px] shrink-0 rounded-[3px] object-cover shadow-sm ring-1 ring-white/10"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">
                      {country.name}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {operators.map((operator) =>
                      operator.logo ? (
                        <span
                          key={operator.key}
                          title={operator.label}
                          className="flex h-9 w-9 items-center justify-center rounded-lg bg-white p-1.5 ring-1 ring-black/5"
                        >
                          <img
                            src={operator.logo || "/placeholder.svg"}
                            alt={operator.label}
                            className="h-full w-full object-contain"
                          />
                        </span>
                      ) : (
                        <span
                          key={operator.key}
                          title={operator.label}
                          className="flex h-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] px-2.5 text-[11px] font-semibold text-gray-200"
                        >
                          {operator.label}
                        </span>
                      ),
                    )}

                    {/* Carte bancaire : disponible partout */}
                    <span
                      title="Visa"
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-white p-1.5 ring-1 ring-black/5"
                    >
                      <img src="/images/visa-logo.svg" alt="Visa" className="h-full w-full object-contain" />
                    </span>
                    <span
                      title="Mastercard"
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-white p-1.5 ring-1 ring-black/5"
                    >
                      <img src="/images/mastercard-logo.svg" alt="Mastercard" className="h-full w-full object-contain" />
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Le reste du monde : carte bancaire uniquement */}
          <div className="mt-4 flex flex-col items-center justify-between gap-4 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-5 text-center sm:flex-row sm:text-left">
            <div>
              <p className="text-base font-bold text-white">
                + {OTHER_COUNTRIES_COUNT} autres pays
              </p>
              <p className="mt-0.5 text-sm text-gray-400">
                Carte bancaire Visa / Mastercard acceptee partout dans le monde.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white p-2 ring-1 ring-black/5">
                <img src="/images/visa-logo.svg" alt="Visa" className="h-full w-full object-contain" />
              </span>
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white p-2 ring-1 ring-black/5">
                <img src="/images/mastercard-logo.svg" alt="Mastercard" className="h-full w-full object-contain" />
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
