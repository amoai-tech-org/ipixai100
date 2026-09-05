import type { Metadata } from "next";
import { SITE_URL, canonicalUrl } from "@/lib/site";
import { MarketingHomePage } from "@/components/marketing/home-page";

// Staged homepage route for HOME-001 browser proof. NOT wired to `/` yet —
// the root Planner surface owns `/` until the Planner relocation merge gate
// passes (per IPI-1057). This route lets reviewers see the full homepage
// composition under the (marketing) layout without taking root ownership.
export const metadata: Metadata = {
  title: { absolute: "iPix — AI-Powered Content Studio for Fashion Brands" },
  description:
    "AI-powered platform that plans photoshoots, generates shot lists, and creates on-brand content.",
  alternates: { canonical: canonicalUrl("/") },
  openGraph: {
    title: "iPix — AI-Powered Content Studio for Fashion Brands",
    description:
      "AI-powered platform that plans photoshoots, generates shot lists, and creates on-brand content.",
    url: SITE_URL,
  },
};

export default function HomePage() {
  return <MarketingHomePage />;
}