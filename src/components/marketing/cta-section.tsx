import Link from "next/link";
import { AnimatedSection } from "./animated-section";

// Centered inquiry CTA. No inquiry endpoint exists yet, so this is a truthful
// CTA to a real supported route rather than a form that discards input.
// "Start Planning" is an acquisition CTA for a visitor with no account yet —
// it targets /signup (IPI-1157 · AUTH-UX-001), not sign-in-only /login.
export function CTASection() {
  return (
    <section id="contact" className="py-24 lg:py-32" style={{ background: "var(--mk-surface)" }}>
      <div className="mx-auto max-w-7xl px-6 lg:px-12">
        <AnimatedSection className="mx-auto max-w-3xl text-center">
          <h2 className="mb-6 text-4xl font-light md:text-5xl lg:text-6xl">
            Ready to Plan
            <br />
            <span className="italic">Your Next Shoot?</span>
          </h2>
          <p className="mx-auto mb-12 max-w-xl text-base leading-relaxed md:text-lg" style={{ color: "var(--mk-text-muted)" }}>
            Tell us about your brand and we&apos;ll help you plan, book, produce,
            and deliver on-brand content.
          </p>
          <Link
            href="/signup"
            className="inline-block px-10 py-4 text-sm font-medium uppercase tracking-wide text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--mk-text)" }}
          >
            Start Planning
          </Link>
        </AnimatedSection>
      </div>
    </section>
  );
}