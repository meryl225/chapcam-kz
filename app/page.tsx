import dynamic from "next/dynamic"
import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"

// Sections sous la ligne de flottaison : chargees a la demande (au defilement)
// pour alleger le JavaScript initial et accelerer l'affichage du haut de page.
const CreatorsSection = dynamic(() =>
  import("@/components/creators-section").then((m) => m.CreatorsSection),
)
const ToolsShowcaseSection = dynamic(() =>
  import("@/components/tools-showcase-section").then((m) => m.ToolsShowcaseSection),
)
const InActionSection = dynamic(() =>
  import("@/components/in-action-section").then((m) => m.InActionSection),
)
const RoadmapSection = dynamic(() =>
  import("@/components/roadmap-section").then((m) => m.RoadmapSection),
)
const HowItWorksSection = dynamic(() =>
  import("@/components/how-it-works-section").then((m) => m.HowItWorksSection),
)
const AvailableCountriesSection = dynamic(() =>
  import("@/components/available-countries-section").then((m) => m.AvailableCountriesSection),
)
const PricingSection = dynamic(() =>
  import("@/components/pricing-section").then((m) => m.PricingSection),
)
const FAQSection = dynamic(() =>
  import("@/components/faq-section").then((m) => m.FAQSection),
)
const TutorialSection = dynamic(() =>
  import("@/components/tutorial-section").then((m) => m.TutorialSection),
)
const FounderSection = dynamic(() =>
  import("@/components/founder-section").then((m) => m.FounderSection),
)
const PartnershipSection = dynamic(() =>
  import("@/components/partnership-section").then((m) => m.PartnershipSection),
)
const SiteFooter = dynamic(() =>
  import("@/components/site-footer").then((m) => m.SiteFooter),
)

// Sentinelle framer-motion : partage le chunk de framer, donc ne pose la classe
// `mo-anim` que si framer se charge vraiment (voir components/motion-ready.tsx).
const MotionReady = dynamic(() =>
  import("@/components/motion-ready").then((m) => m.MotionReady),
)

// Overlays flottants : charges dans un chunk separe (differe le JS client).
const AnimatedBackground = dynamic(() =>
  import("@/components/animated-background").then((m) => m.AnimatedBackground),
)
const TelegramSupport = dynamic(() =>
  import("@/components/telegram-support").then((m) => m.TelegramSupport),
)
const LiveActivity = dynamic(() =>
  import("@/components/live-activity").then((m) => m.LiveActivity),
)
const PaymentBadgePopup = dynamic(() =>
  import("@/components/payment-badge-popup").then((m) => m.PaymentBadgePopup),
)

export default function Home() {
  return (
    <main className="min-h-screen bg-background overflow-hidden relative">
      {/* Global background effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1a1f35] via-[#0a0e1a] to-[#0a0e1a]" />
      </div>

      {/* Animated particles and effects */}
      <AnimatedBackground />

      <div className="relative z-10">
        <Header />
        <HeroSection />
        {/* Sections animees au scroll : gardees VISIBLES par defaut si framer
            echoue (voir .mo-belowfold dans globals.css). */}
        <div className="mo-belowfold">
          <ToolsShowcaseSection />
          <CreatorsSection />
          <InActionSection />
          <RoadmapSection />
          <HowItWorksSection />
          <AvailableCountriesSection />
          <PricingSection />
          <FAQSection />
          <TutorialSection />
          <FounderSection />
          <PartnershipSection />
          <SiteFooter />
        </div>
      </div>

      {/* Pose `mo-anim` uniquement si framer-motion est reellement operationnel. */}
      <MotionReady />

      {/* Telegram Support Button */}
      <TelegramSupport />

      {/* Notifications d'activite en direct */}
      <LiveActivity />

      {/* Badges paiements & cryptos (popup a gauche, alternance aleatoire) */}
      <PaymentBadgePopup />
    </main>
  )
}
