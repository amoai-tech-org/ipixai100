import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { beforeEach, describe, expect, it, vi } from "vitest";

const redirect = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
);

const getVerifiedOperatorFromCookies = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ redirect }));

vi.mock("../src/lib/auth/copilot-hooks", () => ({
  getVerifiedOperatorFromCookies,
}));

import { requireAppWorkspace } from "../src/lib/auth/app-shell";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

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
    const operator = { id: "11111111-1111-4111-8111-111111111111", name: "qa@example.com" };
    getVerifiedOperatorFromCookies.mockResolvedValue(operator);
    await expect(requireAppWorkspace()).resolves.toEqual(operator);
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("APP-001 marketing split", () => {
  it("does not wrap / or the root layout in OperatorPanel", () => {
    const page = readFileSync(join(ROOT, "src/app/page.tsx"), "utf8");
    const layout = readFileSync(join(ROOT, "src/app/layout.tsx"), "utf8");
    expect(page).not.toMatch(/OperatorPanel/);
    expect(layout).not.toMatch(/OperatorPanel/);
  });
});
