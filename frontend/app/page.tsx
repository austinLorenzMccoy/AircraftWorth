import { HeroSection } from "@/components/landing/hero-section"
import { HowItWorksSection } from "@/components/landing/how-it-works-section"
import { WhyHederaSection } from "@/components/landing/why-hedera-section"
import { Footer } from "@/components/landing/footer"

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background">
      <HeroSection />
      <HowItWorksSection />
      <WhyHederaSection />
      <Footer />
    </main>
  )
}
