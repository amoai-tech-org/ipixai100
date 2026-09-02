// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const redirect = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
);

const getVerifiedOperatorFromCookies = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  redirect,
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

vi.mock("../src/app/planner-app", () => ({
  PlannerApp: () => createElement("div", { "data-testid": "planner-app" }, "Planner"),
}));

vi.mock("../src/lib/auth/copilot-hooks", () => ({
  getVerifiedOperatorFromCookies,
}));

import AppLayout from "../src/app/app/layout";
import HomePage from "../src/app/page";
import { requireAppWorkspace } from "../src/lib/auth/app-shell";

const operator = { id: "11111111-1111-4111-8111-111111111111", name: "qa@example.com" };

afterEach(() => cleanup());

beforeEach(() => {
  redirect.mockClear();
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
});
