import { AnimatedSection } from "./animated-section";

// Portfolio grid — 6-tile span grid. Tiles use neutral gradient placeholders
// until MEDIA-001 supplies approved, provenance-verified imagery. No invented
// portfolio provenance.
const items = [
  { label: "Fashion", span: "row-span-2", tone: "var(--mk-primary)" },
  { label: "Watches", span: "", tone: "var(--mk-accent)" },
  { label: "Jewellery", span: "", tone: "var(--mk-ink)" },
  { label: "Product", span: "col-span-2", tone: "var(--mk-primary)" },
  { label: "eCommerce", span: "", tone: "var(--mk-accent)" },
  { label: "Still Life", span: "", tone: "var(--mk-ink)" },
];

export function PortfolioSection() {
  return (
    <section id="portfolio" className="py-24 lg:py-32" style={{ background: "var(--mk-bg)" }}>
      <div className="mx-auto max-w-7xl px-6 lg:px-12">
        <AnimatedSection className="mb-20 text-center">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em]" style={{ color: "var(--mk-text-muted)" }}>
            Selected Work
          </p>
          <h2 className="text-4xl font-light md:text-5xl">Portfolio</h2>
        </AnimatedSection>

        <div className="grid grid-cols-2 gap-1 lg:grid-cols-4">
          {items.map((item) => (
            <div key={item.label} className={`group relative min-h-[250px] overflow-hidden ${item.span}`}>
              <div
                className="absolute inset-0 transition-transform duration-700 group-hover:scale-105"
                style={{
                  background: `linear-gradient(135deg, ${item.tone} 0%, var(--mk-surface-warm) 100%)`,
                }}
                aria-hidden="true"
              />
              <div className="absolute inset-0 flex items-end bg-black/0 p-6 transition-colors duration-500 group-hover:bg-black/30">
                <span className="text-sm font-medium uppercase tracking-wide text-white">
                  {item.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}