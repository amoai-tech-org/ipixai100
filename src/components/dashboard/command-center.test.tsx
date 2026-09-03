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
    const link = screen.getAllByRole("link", { name: "Open" }).find(
      (el) => el.getAttribute("href") === "/app/plans",
    );
    expect(link).toBeDefined();
  });

  it("renders Brands and Shoots quick links too", () => {
    render(<CommandCenter brandsResult={BRANDS_OK} />);
    const hrefs = screen.getAllByRole("link", { name: "Open" }).map((el) => el.getAttribute("href"));
    expect(hrefs).toEqual(expect.arrayContaining(["/app/brands", "/app/shoots", "/app/plans"]));
  });

  it("keeps quick links usable when the brands read fails", () => {
    render(<CommandCenter brandsResult={BRANDS_FAILED} />);
    expect(screen.getByText(/Couldn't load your brands/)).toBeDefined();
    // Quick links are static and must not disappear with the failed section.
    expect(screen.getAllByRole("link", { name: "Open" })).toHaveLength(3);
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
