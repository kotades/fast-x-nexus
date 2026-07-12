import React from "react";
import { 
  HeroSection, 
  ValueProp, 
  OperationsIntel, 
  ConversionCTA, 
  PartnerLogos,
  TrackingSection,
  FleetSection,
  SolutionsSection,
  NetworkSection
} from "@/components/landing";
import { LandingHeader } from "@/components/Header/LandingHeader";
import { Footer } from "@/components/Footer/Footer";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-surface)]">
      <LandingHeader />
      <main className="flex-1 flex flex-col">
        <HeroSection />
        <PartnerLogos />
        <ValueProp />
        <OperationsIntel />
        <FleetSection />
        <TrackingSection />
        {/* <SolutionsSection /> */}
        <NetworkSection />
        <ConversionCTA />
      </main>
      <Footer />
    </div>
  );
}