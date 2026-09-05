import { HeroSection } from "./hero-section";
import { ServicesSection } from "./services-section";
import { PortfolioSection } from "./portfolio-section";
import { ProcessSection } from "./process-section";
import { ClientsSection } from "./clients-section";
import { CTASection } from "./cta-section";

// Homepage composition — six section roles in the V2 product-journey order.
// No MarketingChat, no CopilotKit, no Worker runtime. This component is the
// single homepage body; the route that mounts it is owned by the merge gate
// (HOME-001 must not take `/` until Planner has a non-root route).
export function MarketingHomePage() {
  return (
    <>
      <HeroSection />
      <ServicesSection />
      <PortfolioSection />
      <ProcessSection />
      <ClientsSection />
      <CTASection />
    </>
  );
}