import { AnimatedSection } from "./animated-section";
import { JOURNEY_STEPS } from "./journey";

export function ProcessSection() {
  return (
    <section id="process" className="py-24 lg:py-32" style={{ background: "var(--mk-surface)" }}>
      <div className="mx-auto max-w-7xl px-6 lg:px-12">
        <AnimatedSection className="mb-20 max-w-2xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em]" style={{ color: "var(--mk-text-muted)" }}>
            How We Work
          </p>
          <h2 className="text-4xl font-light md:text-5xl">
            From Brief to
            <br />
            <span className="italic">Delivered.</span>
          </h2>
        </AnimatedSection>

        <div className="grid grid-cols-1 border-t md:grid-cols-2 lg:grid-cols-5" style={{ borderColor: "var(--mk-border)" }}>
          {JOURNEY_STEPS.map((step, i) => (
            <div
              key={step.title}
              className="border-b p-8 last:border-r-0 lg:border-b-0 lg:border-r lg:p-10"
              style={{ borderColor: "var(--mk-border)" }}
            >
              <span className="text-xs font-medium uppercase tracking-[0.2em]" style={{ color: "var(--mk-text-muted)" }}>
                Step {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mb-4 mt-6 text-2xl font-medium">{step.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--mk-text-muted)" }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}