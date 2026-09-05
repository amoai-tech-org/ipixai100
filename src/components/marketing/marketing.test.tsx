// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MarketingHeader } from "./header";
import { MarketingFooter } from "./footer";
import { SERVICES } from "./services";

afterEach(() => {
  cleanup();
});

describe("MarketingHeader (IPI-1053)", () => {
  it("renders the brand mark and primary nav links", () => {
    render(<MarketingHeader />);
    expect(screen.getByText(/ipix/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Sign in" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Get a Quote" })).toBeTruthy();
  });

  it("exposes aria-expanded + aria-controls on the Services control", () => {
    render(<MarketingHeader />);
    const button = screen.getByRole("button", { name: /services/i });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(button.getAttribute("aria-controls")).toBeTruthy();
  });

  it("opens the Services dropdown on click and closes on Escape", () => {
    render(<MarketingHeader />);
    const button = screen.getByRole("button", { name: /services/i });
    fireEvent.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    for (const s of SERVICES) {
      expect(screen.getByRole("link", { name: s.label })).toBeTruthy();
    }
    fireEvent.keyDown(button, { key: "Escape" });
    expect(button.getAttribute("aria-expanded")).toBe("false");
  });

  it("closes the Services dropdown when focus leaves its container", () => {
    render(<MarketingHeader />);
    const button = screen.getByRole("button", { name: /services/i });
    fireEvent.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    fireEvent.blur(button.parentElement as HTMLElement, {
      relatedTarget: document.body,
    });
    expect(button.getAttribute("aria-expanded")).toBe("false");
  });

  it("exposes aria-expanded + aria-controls on the mobile toggle", () => {
    render(<MarketingHeader />);
    const toggle = screen.getByRole("button", { name: "Toggle menu" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(toggle.getAttribute("aria-controls")).toBeTruthy();
  });

  it("renders Work and Process links in the mobile sheet", () => {
    render(<MarketingHeader />);
    const toggle = screen.getByRole("button", { name: "Toggle menu" });
    fireEvent.click(toggle);
    const mobileNav = screen.getByRole("navigation", { name: "Mobile" });
    expect(within(mobileNav).getByRole("link", { name: "Work" })).toBeTruthy();
    expect(within(mobileNav).getByRole("link", { name: "Process" })).toBeTruthy();
  });

  it("closes the mobile sheet after navigating via a link", () => {
    render(<MarketingHeader />);
    const toggle = screen.getByRole("button", { name: "Toggle menu" });
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    const mobileNav = screen.getByRole("navigation", { name: "Mobile" });
    fireEvent.click(within(mobileNav).getByRole("link", { name: "Sign in" }));
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("navigation", { name: "Mobile" })).toBeNull();
  });
});

describe("MarketingFooter (IPI-1053)", () => {
  it("renders the V2 services registry without an empty More column", () => {
    render(<MarketingFooter />);
    for (const s of SERVICES) {
      expect(screen.getByRole("link", { name: s.label })).toBeTruthy();
    }
    // Legacy slice(5) "More" column must be gone (5 services → no second column).
    expect(screen.queryByText("More")).toBeNull();
  });

  it("contains no stale Lumina/FashionOS branding", () => {
    render(<MarketingFooter />);
    expect(screen.queryByText(/Lumina Studio/i)).toBeNull();
    expect(screen.queryByText(/fashionos\.co/i)).toBeNull();
  });
});