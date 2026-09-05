import { BookOpen, CalendarCheck, Camera, PackageCheck, Palette } from "lucide-react";
import { AnimatedSection } from "./animated-section";
import { JOURNEY_STEPS } from "./journey";

const ICONS = [Palette, BookOpen, CalendarCheck, Camera, PackageCheck] as const;

export function ServicesSection() {
  return (
    <section id="services" className="py-24 lg:py-32" style={{ background: "var(--mk-surface)" }}>
      <div className="mx-auto max-w-7xl px-6 lg:px-12">
        <AnimatedSection className="mb-20 text-center">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em]" style={{ color: "var(--mk-text-muted)" }}>
            How iPix Works
          </p>
          <h2 className="text-4xl font-light md:text-5xl">From Brand to Delivered Content</h2>
        </AnimatedSection>

        <div className="grid grid-cols-1 gap-px sm:grid-cols-2 lg:grid-cols-5" style={{ background: "var(--mk-border)" }}>
          {JOURNEY_STEPS.map((step, i) => {
            const Icon = ICONS[i];
            return (
              <div
                key={step.title}
                className="group p-8 transition-colors lg:p-10"
                style={{ background: "var(--mk-surface)" }}
              >
                <Icon size={28} strokeWidth={1.2} className="mb-6" style={{ color: "var(--mk-text-muted)" }} />
                <h3 className="mb-3 text-xl font-medium">{step.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--mk-text-muted)" }}>{step.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}