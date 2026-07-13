import LandingNav from "@/src/components/landing/LandingNav";
import HeroSection from "@/src/components/landing/HeroSection";
import StatsSection from "@/src/components/landing/StatsSection";
import FeaturesSection from "@/src/components/landing/FeaturesSection";
import HowItWorksSection from "@/src/components/landing/HowItWorksSection";
import TestimonialsSection from "@/src/components/landing/TestimonialsSection";
import CtaSection from "@/src/components/landing/CtaSection";
import SiteFooter from "@/src/components/landing/SiteFooter";
import JsonLd from "@/src/components/seo/JsonLd";
import { homeJsonLd } from "@/lib/jsonld";

export const metadata = {
  title: {
    absolute: "LessonPilot — AI Lesson Plans & Test Generator",
  },
  description:
    "Turn any topic into classroom-ready lesson plans and printable tests in minutes. Free to start, no credit card required.",
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <JsonLd data={homeJsonLd()} />
      <LandingNav />
      <main>
        <HeroSection />
        <StatsSection />
        <FeaturesSection />
        <HowItWorksSection />
        <TestimonialsSection />
        <CtaSection />
      </main>
      <SiteFooter />
    </div>
  );
}
