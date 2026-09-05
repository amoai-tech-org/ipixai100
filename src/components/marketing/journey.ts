// Shared V2 product journey — single source for the Brand → Plan → Book →
// Produce → Deliver story consumed by ServicesSection and ProcessSection.
// Presentation-specific fields (icons, step numbers) live in the consumers.
export const JOURNEY_STEPS = [
  { title: "Brand", desc: "Bring your brand context and identity into iPix so every plan starts on-brand." },
  { title: "Plan", desc: "Create a production-ready shoot plan with shot lists, deliverables, and timing." },
  { title: "Book", desc: "Hand off to talent, studio, and booking with clear dates, rates, and roles." },
  { title: "Produce", desc: "Manage the shoot and production from a single workspace — planned with the production workspace." },
  { title: "Deliver", desc: "Approve and receive final assets, ready for every channel — planned with asset delivery." },
] as const;