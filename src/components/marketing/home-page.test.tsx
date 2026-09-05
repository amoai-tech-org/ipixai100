// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { MarketingHomePage } from "./home-page";

class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
});

afterEach(() => {
  cleanup();
});

describe("MarketingHomePage (IPI-1057)", () => {
  it("renders the six homepage sections in product-journey order", () => {
    render(<MarketingHomePage />);
    const headings = screen
      .getAllByRole("heading", { level: 2 })
      .map((h) => h.textContent?.replace(/\s+/g, " ").trim());

    // Hero h1 must exist.
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();

    // Journey order: Hero (h1) → Services (h2) → Portfolio (h2) → Process (h2)
    // → Clients (h2) → CTA (h2). Assert the section elements appear in order.
    const sectionIds = ["services", "portfolio", "process", "about", "contact"];
    const domOrder = Array.from(document.body.querySelectorAll("section")).map(
      (s) => s.id,
    );
    const seen = domOrder.filter((id) => sectionIds.includes(id));
    expect(seen).toEqual(sectionIds);
    expect(headings.length).toBeGreaterThanOrEqual(5);
  });

  it("presents the Brand → Plan → Book → Produce → Deliver journey", () => {
    render(<MarketingHomePage />);
    const process = document.getElementById("process");
    expect(process).toBeTruthy();
    const titles = Array.from(process?.querySelectorAll("h3") ?? []).map(
      (h) => h.textContent?.replace(/\s+/g, " ").trim() ?? "",
    );
    expect(titles).toEqual(["Brand", "Plan", "Book", "Produce", "Deliver"]);
  });

  it("CTA links point to supported destinations", () => {
    render(<MarketingHomePage />);
    const getStarted = screen.getByRole("link", { name: "Get Started" });
    expect(getStarted.getAttribute("href")).toBe("/signup");
    const howItWorks = screen.getByRole("link", { name: "How It Works" });
    expect(howItWorks.getAttribute("href")).toBe("#process");
    const startPlanning = screen.getByRole("link", { name: "Start Planning" });
    expect(startPlanning.getAttribute("href")).toBe("/signup");
  });

  it("contains no legacy named clients or unsupported claims", () => {
    render(<MarketingHomePage />);
    const body = document.body.textContent ?? "";
    for (const claim of ["Pandora", "TK Maxx", "Tiffany", "20 years", "guaranteed"]) {
      expect(body).not.toContain(claim);
    }
  });
});