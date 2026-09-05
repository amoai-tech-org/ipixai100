import { AnimatedSection } from "./animated-section";

// Trust section (parity with Vite ClientsSection.tsx layout). The legacy named
// client list (Pandora, TK Maxx, Tiffany & Co., etc.), "20 years", and
// "conversion — guaranteed" are NOT copied — no verified commercial evidence.
// Replaced with an honest, non-client trust framing.
export function ClientsSection() {
  return (
    <section id="about" className="py-24 lg:py-32" style={{ background: "var(--mk-bg)" }}>
      <div className="mx-auto max-w-7xl px-6 lg:px-12">
        <AnimatedSection className="mb-20 grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
          <h2 className="text-3xl font-light leading-tight md:text-4xl lg:text-5xl">
            Built for fashion and DTC brands that need consistent, on-brand content.
          </h2>
          <p className="max-w-prose text-base leading-relaxed" style={{ color: "var(--mk-text-muted)" }}>
            iPix combines AI-driven creative planning with a production workflow
            that takes you from brand context to delivered assets. Plan, book,
            produce, and deliver — without the back-and-forth.
          </p>
        </AnimatedSection>

        <div className="border-t pt-16" style={{ borderColor: "var(--mk-border)" }}>
          <p className="mb-12 text-center text-xs font-medium uppercase tracking-[0.2em]" style={{ color: "var(--mk-text-muted)" }}>
            One Platform, End to End
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
            {["Brand", "Plan", "Book", "Produce", "Deliver"].map((step) => (
              <span
                key={step}
                className="text-lg tracking-wide md:text-xl"
                style={{ fontFamily: "var(--font-cormorant)", color: "var(--mk-text-muted)" }}
              >
                {step}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}