import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { CreatorsSection } from "@/components/creators-section"
import { InActionSection } from "@/components/in-action-section"
import { HowItWorksSection } from "@/components/how-it-works-section"
import { RoadmapSection } from "@/components/roadmap-section"
import { PricingSection } from "@/components/pricing-section"
import { AvailableCountriesSection } from "@/components/available-countries-section"
import { FAQSection } from "@/components/faq-section"
import { TutorialSection } from "@/components/tutorial-section"
import { FounderSection } from "@/components/founder-section"
import { AnimatedBackground } from "@/components/animated-background"
import { TelegramSupport } from "@/components/telegram-support"
import { LiveActivity } from "@/components/live-activity"
import { PaymentBadgePopup } from "@/components/payment-badge-popup"
import { SiteFooter } from "@/components/site-footer"

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
        <CreatorsSection />
        <InActionSection />
        <RoadmapSection />
        <HowItWorksSection />
        <AvailableCountriesSection />
        <PricingSection />
        <FAQSection />
        <TutorialSection />
        <FounderSection />
        <SiteFooter />
      </div>

      {/* Telegram Support Button */}
      <TelegramSupport />

      {/* Notifications d'activite en direct */}
      <LiveActivity />

      {/* Badges paiements & cryptos (popup a gauche, alternance aleatoire) */}
      <PaymentBadgePopup />
    </main>
  )
}
