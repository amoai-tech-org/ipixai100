// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";

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

const SHOOTS_OK = {
  ok: true as const,
  shoots: [
    { id: "shoot-1", name: "Shoot One", status: "in_progress", dnaScore: null, channel: null },
  ],
};
const SHOOTS_EMPTY = { ok: true as const, shoots: [] };
const SHOOTS_FAILED = { ok: false as const };

describe("CommandCenter", () => {
  it("renders a Planner quick link to /app/plans", () => {
    render(<CommandCenter brandsResult={BRANDS_OK} shootsResult={SHOOTS_OK} />);
    const link = screen.getByRole("link", { name: "Open Plans" });
    expect(link.getAttribute("href")).toBe("/app/plans");
  });

  it("renders Brands and Shoots quick links with distinct accessible names", () => {
    render(<CommandCenter brandsResult={BRANDS_OK} shootsResult={SHOOTS_OK} />);
    expect(screen.getByRole("link", { name: "Open Brands" }).getAttribute("href")).toBe("/app/brands");
    expect(screen.getByRole("link", { name: "Open Shoots" }).getAttribute("href")).toBe("/app/shoots");
  });

  it("keeps quick links usable when the brands read fails", () => {
    render(<CommandCenter brandsResult={BRANDS_FAILED} shootsResult={SHOOTS_OK} />);
    expect(screen.getByText(/Couldn't load your brands/)).toBeDefined();
    // Quick links are static and must not disappear with the failed section.
    expect(screen.getByRole("link", { name: "Open Brands" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Open Shoots" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Open Plans" })).toBeDefined();
  });

  it("shows the empty state with no brands", () => {
    render(<CommandCenter brandsResult={BRANDS_EMPTY} shootsResult={SHOOTS_OK} />);
    expect(screen.getByText("No brands yet")).toBeDefined();
  });

  it("links each brand card to /app/brands", () => {
    render(<CommandCenter brandsResult={BRANDS_OK} shootsResult={SHOOTS_OK} />);
    // "Brand Alpha" also appears in the hero card — scope to the list.
    const list = screen.getByTestId("command-center-brand-list");
    const anchor = within(list).getByText("Brand Alpha").closest("a");
    expect(anchor?.getAttribute("href")).toBe("/app/brands");
  });

  it("shows the empty state with no shoots", () => {
    render(<CommandCenter brandsResult={BRANDS_OK} shootsResult={SHOOTS_EMPTY} />);
    expect(screen.getByText("No shoots yet")).toBeDefined();
  });

  it("links each shoot card to /app/shoots", () => {
    render(<CommandCenter brandsResult={BRANDS_OK} shootsResult={SHOOTS_OK} />);
    const anchor = screen.getByText("Shoot One").closest("a");
    expect(anchor?.getAttribute("href")).toBe("/app/shoots");
  });

  it("keeps the brands section intact when the shoots read fails independently", () => {
    render(<CommandCenter brandsResult={BRANDS_OK} shootsResult={SHOOTS_FAILED} />);
    expect(screen.getByText(/Couldn't load your shoots/)).toBeDefined();
    // Brands section is unaffected by the shoots read failing.
    expect(within(screen.getByTestId("command-center-brand-list")).getByText("Brand Alpha")).toBeDefined();
  });

  it("keeps the shoots section intact when the brands read fails independently", () => {
    render(<CommandCenter brandsResult={BRANDS_FAILED} shootsResult={SHOOTS_OK} />);
    expect(screen.getByText(/Couldn't load your brands/)).toBeDefined();
    // Shoots section is unaffected by the brands read failing.
    expect(screen.getByText("Shoot One")).toBeDefined();
  });

  it("shows a hero card for the first real brand, with no fabricated cover image", () => {
    render(<CommandCenter brandsResult={BRANDS_OK} shootsResult={SHOOTS_OK} />);
    expect(screen.getByTestId("command-center-hero")).toBeDefined();
    expect(screen.getAllByText("Brand Alpha").length).toBeGreaterThan(0);
    // No <img> in the hero — it renders an initial avatar, not a stock photo.
    expect(screen.getByTestId("command-center-hero").querySelector("img")).toBeNull();
  });

  it("renders no hero card when there are no brands", () => {
    render(<CommandCenter brandsResult={BRANDS_EMPTY} shootsResult={SHOOTS_OK} />);
    expect(screen.queryByTestId("command-center-hero")).toBeNull();
  });

  it("never renders a shoot cover image — no proven secure-delivery path yet", () => {
    // Even a shoot with a real DNA score and channel gets the honest
    // placeholder: cover_url has no bridge to this app's signed-delivery
    // contract yet (see the .recentThumb comment in command-center.tsx).
    const shoots = {
      ok: true as const,
      shoots: [{ id: "shoot-2", name: "Shoot Two", status: "active", dnaScore: 91, channel: "IG" }],
    };
    render(<CommandCenter brandsResult={BRANDS_OK} shootsResult={shoots} />);
    const tile = screen.getByText("Shoot Two").closest("a");
    expect(tile?.querySelector("img")).toBeNull();
    expect(screen.getByText("91")).toBeDefined();
    expect(screen.getByText("IG")).toBeDefined();
  });

  it("shows a DNA score of exactly 0 rather than treating it as unscored", () => {
    const shoots = {
      ok: true as const,
      shoots: [{ id: "shoot-3", name: "Shoot Three", status: "planning", dnaScore: 0, channel: null }],
    };
    render(<CommandCenter brandsResult={BRANDS_OK} shootsResult={shoots} />);
    expect(screen.getByText("0")).toBeDefined();
    expect(screen.getByLabelText("DNA score: 0")).toBeDefined();
  });

  it("never fabricates a DNA score or channel when the shoot has none", () => {
    render(<CommandCenter brandsResult={BRANDS_OK} shootsResult={SHOOTS_OK} />);
    const tile = screen.getByText("Shoot One").closest("a");
    // No numeric badge and no meta line for this null-score, null-channel shoot.
    expect(tile?.textContent).toBe("Shoot One");
  });
});
