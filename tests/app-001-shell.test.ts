// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const redirect = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
);

const notFound = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
);

const getVerifiedOperatorFromCookies = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  redirect,
  notFound,
  usePathname: () => "/app",
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => createElement("a", { href, ...props }, children),
}));

vi.mock("../src/components/operator-panel/operator-panel.module.css", () => ({
  default: new Proxy({}, { get: (_, key) => String(key) }),
}));

// @copilotkit/react-core/v2's package entry pulls in its own bundled CSS,
// which this repo's plain-node Vitest config (no CSS transform) can't load.
// Stubbed here — these tests assert route/layout wiring, not CopilotKit's
// internals (see operator-panel.test.tsx for the same stub).
vi.mock("@copilotkit/react-core/v2", () => ({
  CopilotKit: ({ children }: { children: React.ReactNode }) => createElement("div", null, children),
  CopilotChat: () => createElement("div", { "data-testid": "copilot-chat-stub" }),
}));

vi.mock("../src/components/ui/empty-state.module.css", () => ({
  default: new Proxy({}, { get: (_, key) => String(key) }),
}));

vi.mock("../src/app/planner-app", () => ({
  PlannerApp: () => createElement("div", { "data-testid": "planner-app" }, "Planner"),
}));

vi.mock("../src/lib/auth/copilot-hooks", () => ({
  getVerifiedOperatorFromCookies,
}));

import AppSectionPage from "../src/app/app/[section]/page";
import AppLayout from "../src/app/app/layout";
import HomePage from "../src/app/page";
import { requireAppWorkspace } from "../src/lib/auth/app-shell";

const operator = { id: "11111111-1111-4111-8111-111111111111", name: "qa@example.com" };

afterEach(() => cleanup());

beforeEach(() => {
  redirect.mockClear();
  notFound.mockClear();
  getVerifiedOperatorFromCookies.mockReset();
});

describe("requireAppWorkspace", () => {
  it("redirects signed-out operators to login", async () => {
    getVerifiedOperatorFromCookies.mockResolvedValue(null);
    await expect(requireAppWorkspace()).rejects.toThrow("REDIRECT:/login");
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("returns the signed-in operator", async () => {
    getVerifiedOperatorFromCookies.mockResolvedValue(operator);
    await expect(requireAppWorkspace()).resolves.toEqual(operator);
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("APP-001 route split", () => {
  it("signed-in /app layout exposes the operator workspace around children", async () => {
    getVerifiedOperatorFromCookies.mockResolvedValue(operator);
    const ui = await AppLayout({
      children: createElement("p", null, "Workspace body"),
    });
    render(ui);
    expect(screen.getByTestId("operator-panel")).toBeDefined();
    expect(screen.getByText("Workspace body")).toBeDefined();
  });

  it("signed-in / does not expose the operator workspace", async () => {
    getVerifiedOperatorFromCookies.mockResolvedValue(operator);
    const ui = await HomePage();
    render(ui);
    expect(screen.queryByTestId("operator-panel")).toBeNull();
    expect(screen.getByTestId("planner-app")).toBeDefined();
  });

  it("signed-out / redirects to login", async () => {
    getVerifiedOperatorFromCookies.mockResolvedValue(null);
    await expect(HomePage()).rejects.toThrow("REDIRECT:/login");
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("unknown /app/[section] calls notFound", async () => {
    getVerifiedOperatorFromCookies.mockResolvedValue(operator);
    await expect(
      AppSectionPage({ params: Promise.resolve({ section: "not-a-real-section" }) }),
    ).rejects.toThrow("NOT_FOUND");
    expect(notFound).toHaveBeenCalled();
  });

  it("known /app/brands renders the EmptyState placeholder", async () => {
    getVerifiedOperatorFromCookies.mockResolvedValue(operator);
    const ui = await AppSectionPage({
      params: Promise.resolve({ section: "brands" }),
    });
    render(ui);
    expect(notFound).not.toHaveBeenCalled();
    expect(screen.getByTestId("empty-state")).toBeDefined();
    expect(screen.getByRole("heading", { name: "Brands" })).toBeDefined();
  });
});
