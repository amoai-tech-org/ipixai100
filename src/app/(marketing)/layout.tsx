import { Cormorant_Garamond, Outfit } from "next/font/google";
import "./marketing.css";
import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

// (marketing) group layout — public header/footer only. NO CopilotKit, NO
// OperatorPanel, NO ThreadsDrawer, NO auth. The `.marketing` class scopes the
// iPix brand tokens (marketing.css) so the operator theme is untouched.
export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className={`marketing ${cormorant.variable} ${outfit.variable}`}>
      <MarketingHeader />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  );
}