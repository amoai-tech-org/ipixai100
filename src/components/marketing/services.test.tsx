import { describe, expect, it } from "vitest";
import { SERVICES } from "./services";

// IPI-1053 · MARKETING-NAV-001 — registry contract for the V2 service nav.
// NAV may merge before HOME/SERVICES page bodies exist, so this asserts the
// registry contract (5 canonical destinations, unique, well-formed), not that
// every /services/* body is already implemented (owned by SERVICES-001).
describe("SERVICES nav registry (IPI-1053)", () => {
  it("lists exactly the 5 canonical V2 service pages", () => {
    expect(SERVICES).toHaveLength(5);
  });

  it("uses unique hrefs under /services/", () => {
    const hrefs = SERVICES.map((s) => s.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    for (const href of hrefs) {
      expect(href).toMatch(/^\/services\/[a-z0-9-]+$/);
    }
  });

  it("includes the intended canonical V2 destinations", () => {
    const hrefs = SERVICES.map((s) => s.href);
    expect(hrefs).toEqual(
      expect.arrayContaining([
        "/services/fashion-photography",
        "/services/ecommerce-photography",
        "/services/amazon",
        "/services/shopify",
        "/services/instagram",
      ]),
    );
  });

  it("excludes merged/dropped legacy routes from primary nav", () => {
    const hrefs = SERVICES.map((s) => s.href);
    for (const dropped of [
      "/services/clothing",
      "/services/location",
      "/services/jewellery",
      "/services/video",
    ]) {
      expect(hrefs).not.toContain(dropped);
    }
  });
});