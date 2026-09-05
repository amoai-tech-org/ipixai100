import Link from "next/link";
import { AnimatedSection } from "./animated-section";

// Home hero (parity with Vite HeroSection.tsx): split copy/visual, two CTAs.
// Visual is a neutral gradient placeholder until MEDIA-001 supplies approved
// imagery — no invented provenance. CTAs target supported destinations.
export function HeroSection() {
  return (
    <section className="relative flex min-h-screen items-center pt-20">
      <div className="mx-auto w-full max-w-7xl px-6 lg:px-12">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <AnimatedSection className="max-w-xl">
            <p className="mb-6 text-sm font-medium uppercase tracking-[0.2em]" style={{ color: "var(--mk-text-muted)" }}>
              AI-Powered Content Studio
            </p>
            <h1 className="mb-8 text-5xl font-light leading-[1.05] md:text-6xl lg:text-7xl">
              From Brand to
              <br />
              <span className="italic font-light">Delivered Content.</span>
            </h1>
            <p className="mb-10 max-w-prose text-base leading-relaxed md:text-lg" style={{ color: "var(--mk-text-muted)" }}>
              Bring your brand, plan the shoot, book the talent, produce the
              imagery, and deliver on-brand assets — one platform, from concept
              to delivery.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Link
                href="/login"
                className="px-8 py-4 text-center text-sm font-medium uppercase tracking-wide text-white transition-opacity hover:opacity-90"
                style={{ background: "var(--mk-text)" }}
              >
                Get Started
              </Link>
              <Link
                href="#process"
                className="px-8 py-4 text-center text-sm font-medium uppercase tracking-wide transition-colors"
                style={{ border: "1px solid var(--mk-text)" }}
              >
                How It Works
              </Link>
            </div>
          </AnimatedSection>

          <AnimatedSection className="relative h-[500px] lg:h-[600px]">
            <div
              className="h-full w-full"
              style={{
                background:
                  "linear-gradient(135deg, var(--mk-surface-warm) 0%, var(--mk-accent) 45%, var(--mk-primary) 100%)",
              }}
              aria-hidden="true"
            />
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}