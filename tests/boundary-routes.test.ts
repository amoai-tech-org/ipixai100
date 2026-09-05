// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const redirect = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
);

const requireAppWorkspace = vi.hoisted(() => vi.fn());
const serverCreateClient = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ redirect }));

vi.mock("../src/lib/auth/app-shell", () => ({
  requireAppWorkspace,
}));

vi.mock("../src/lib/supabase/server", () => ({
  createClient: serverCreateClient,
}));

vi.mock("../src/components/ui/empty-state", () => ({
  EmptyState: ({ heading }: { heading: string }) =>
    createElement("div", { "data-testid": "empty-state" }, heading),
}));

import OnboardingPage from "../src/app/onboarding/page";
import OrgSelectionPage from "../src/app/org-selection/page";

const operator = { id: "11111111-1111-4111-8111-111111111111", name: "qa@example.com" };

function clientWithOrgIds(orgIds: string[]) {
  return {
    from: () => ({
      select: () => ({
        eq: vi.fn().mockResolvedValue({
          data: orgIds.map((org_id) => ({ org_id })),
          error: null,
        }),
      }),
    }),
  };
}

beforeEach(() => {
  requireAppWorkspace.mockResolvedValue(operator);
});

afterEach(() => {
  cleanup();
  redirect.mockClear();
  requireAppWorkspace.mockReset();
  serverCreateClient.mockReset();
});

describe("IPI-1058 · MARKETING-LOGIN-001 — Reuse the Proven iPix Login Experience With the New Supabase Auth Setup: boundary routes", () => {
  it("onboarding renders for a zero-org operator", async () => {
    serverCreateClient.mockReturnValue(clientWithOrgIds([]));
    const ui = await OnboardingPage();
    render(ui);
    expect(redirect).not.toHaveBeenCalled();
    expect(screen.getByTestId("empty-state")).toBeDefined();
  });

  it("onboarding redirects a single-org operator to /planner", async () => {
    serverCreateClient.mockReturnValue(
      clientWithOrgIds(["22222222-2222-4222-8222-222222222222"]),
    );
    await expect(OnboardingPage()).rejects.toThrow("REDIRECT:/planner");
    expect(redirect).toHaveBeenCalledWith("/planner");
  });

  it("onboarding redirects a multi-org operator to /org-selection", async () => {
    serverCreateClient.mockReturnValue(
      clientWithOrgIds([
        "22222222-2222-4222-8222-222222222222",
        "33333333-3333-4333-8333-333333333333",
      ]),
    );
    await expect(OnboardingPage()).rejects.toThrow("REDIRECT:/org-selection");
    expect(redirect).toHaveBeenCalledWith("/org-selection");
  });

  it("onboarding fails closed to /login on membership lookup failure", async () => {
    serverCreateClient.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: vi.fn().mockResolvedValue({ data: null, error: new Error("db") }),
        }),
      }),
    });
    await expect(OnboardingPage()).rejects.toThrow("REDIRECT:/login");
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("org-selection renders for a multi-org operator", async () => {
    serverCreateClient.mockReturnValue(
      clientWithOrgIds([
        "22222222-2222-4222-8222-222222222222",
        "33333333-3333-4333-8333-333333333333",
      ]),
    );
    const ui = await OrgSelectionPage();
    render(ui);
    expect(redirect).not.toHaveBeenCalled();
    expect(screen.getByTestId("empty-state")).toBeDefined();
  });

  it("org-selection redirects a single-org operator to /planner", async () => {
    serverCreateClient.mockReturnValue(
      clientWithOrgIds(["22222222-2222-4222-8222-222222222222"]),
    );
    await expect(OrgSelectionPage()).rejects.toThrow("REDIRECT:/planner");
    expect(redirect).toHaveBeenCalledWith("/planner");
  });

  it("org-selection redirects a zero-org operator to /onboarding", async () => {
    serverCreateClient.mockReturnValue(clientWithOrgIds([]));
    await expect(OrgSelectionPage()).rejects.toThrow("REDIRECT:/onboarding");
    expect(redirect).toHaveBeenCalledWith("/onboarding");
  });

  it("org-selection fails closed to /login on membership lookup failure", async () => {
    serverCreateClient.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: vi.fn().mockResolvedValue({ data: null, error: new Error("db") }),
        }),
      }),
    });
    await expect(OrgSelectionPage()).rejects.toThrow("REDIRECT:/login");
    expect(redirect).toHaveBeenCalledWith("/login");
  });
});