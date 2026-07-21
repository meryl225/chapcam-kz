"use client"

import Image from "next/image"
import { motion } from "framer-motion"

const COUNTRIES = [
  { name: "Cote d'Ivoire", flag: "/images/flag-cote-divoire.png" },
  { name: "Benin", flag: "/images/flag-benin.png" },
  { name: "Nigeria", flag: "/images/flag-nigeria.png" },
  { name: "Ghana", flag: "/images/flag-ghana.png" },
  { name: "Togo", flag: "/images/flag-togo.png" },
  { name: "Cameroun", flag: "/images/flag-cameroun.png" },
]

export function AvailableCountriesSection() {
  return (
    <section className="relative py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-center"
        >
          <p className="mb-3 text-sm font-bold uppercase tracking-widest text-[#00ff88]">
            Disponible des maintenant
          </p>
          <h2 className="text-balance text-3xl font-black text-white md:text-5xl">
            ChapCam est disponible dans ces 6 pays
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-base text-gray-400 md:text-lg">
            Paiement Mobile Money et carte bancaire pris en charge en Cote d&apos;Ivoire, au Benin,
            au Nigeria, au Ghana, au Togo et au Cameroun.
          </p>
        </motion.div>

        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-6 sm:grid-cols-3 md:gap-8">
          {COUNTRIES.map((country, index) => (
            <motion.div
              key={country.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="relative aspect-[3/2] w-full overflow-hidden rounded-2xl border-2 border-white/10 shadow-2xl transition-transform duration-300 hover:scale-105 hover:border-[#00ff88]/50">
                <Image
                  src={country.flag || "/placeholder.svg"}
                  alt={`Drapeau ${country.name}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
              </div>
              <span className="text-lg font-bold text-white md:text-xl">{country.name}</span>
            </motion.div>
          ))}
        </div>

        {/* Grace au paiement crypto (Trybit), ChapCam est accessible partout dans le monde */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="relative mt-16 overflow-hidden rounded-3xl border border-white/10 bg-[#0a0f0d] px-6 py-12 text-center md:py-16"
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
      </div>
    </section>
  )
}
