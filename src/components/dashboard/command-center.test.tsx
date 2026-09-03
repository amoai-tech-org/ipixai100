// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

// Mock every CSS module the tree imports (CommandCenter + composed atoms).
vi.mock("./command-center.module.css", () => ({
  default: new Proxy({}, { get: (_, key) => String(key) }),
}));
vi.mock("../ui/empty-state.module.css", () => ({
  default: new Proxy({}, { get: (_, key) => String(key) }),
}));
vi.mock("../ui/error-state.module.css", () => ({
  default: new Proxy({}, { get: (_, key) => String(key) }),
}));

import { CommandCenter } from "./command-center";

afterEach(() => cleanup());

const BRANDS_OK = { ok: true as const, brands: [{ id: "brand-1", name: "Brand Alpha" }] };
const BRANDS_EMPTY = { ok: true as const, brands: [] };
const BRANDS_FAILED = { ok: false as const };

describe("CommandCenter", () => {
  it("renders a Planner quick link to /app/plans", () => {
    render(<CommandCenter brandsResult={BRANDS_OK} />);
    const link = screen.getByRole("link", { name: "Open Plans" });
    expect(link.getAttribute("href")).toBe("/app/plans");
  });

  it("renders Brands and Shoots quick links with distinct accessible names", () => {
    render(<CommandCenter brandsResult={BRANDS_OK} />);
    expect(screen.getByRole("link", { name: "Open Brands" }).getAttribute("href")).toBe("/app/brands");
    expect(screen.getByRole("link", { name: "Open Shoots" }).getAttribute("href")).toBe("/app/shoots");
  });

  it("keeps quick links usable when the brands read fails", () => {
    render(<CommandCenter brandsResult={BRANDS_FAILED} />);
    expect(screen.getByText(/Couldn't load your brands/)).toBeDefined();
    // Quick links are static and must not disappear with the failed section.
    expect(screen.getByRole("link", { name: "Open Brands" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Open Shoots" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Open Plans" })).toBeDefined();
  });

  it("shows the empty state with no brands", () => {
    render(<CommandCenter brandsResult={BRANDS_EMPTY} />);
    expect(screen.getByText("No brands yet")).toBeDefined();
  });

  it("links each brand card to /app/brands", () => {
    render(<CommandCenter brandsResult={BRANDS_OK} />);
    const anchor = screen.getByText("Brand Alpha").closest("a");
    expect(anchor?.getAttribute("href")).toBe("/app/brands");
  });
});
