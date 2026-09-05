import type { Metadata } from "next";
import { canonicalUrl } from "@/lib/site";
import { MarketingHomePage } from "@/components/marketing/home-page";

// Public marketing homepage at the root. The Planner now lives at /planner
// (authenticated operator route); /app remains the Command Center. Marketing
// chrome is scoped to this route group and never wraps operator routes.
export const metadata: Metadata = {
  title: { absolute: "iPix — AI-Powered Content Studio for Fashion Brands" },
  description:
    "AI-powered platform that plans photoshoots, generates shot lists, and creates on-brand content.",
  alternates: { canonical: canonicalUrl("/") },
  openGraph: {
    title: "iPix — AI-Powered Content Studio for Fashion Brands",
    description:
      "AI-powered platform that plans photoshoots, generates shot lists, and creates on-brand content.",
    url: canonicalUrl("/"),
  },
};

export default function HomePage() {
  return <MarketingHomePage />;
}