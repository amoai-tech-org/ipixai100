import { describe, expect, it } from "vitest";
import {
  postAuthDestinationFor,
  safeRedirect,
} from "../src/lib/auth/post-auth-destination";

const operator = { id: "11111111-1111-4111-8111-111111111111", name: "qa@example.com" };

describe("safeRedirect (IPI-1058)", () => {
  it("accepts allowlisted internal destinations", () => {
    expect(safeRedirect("/planner")).toBe("/planner");
    expect(safeRedirect("/app")).toBe("/app");
    expect(safeRedirect("/onboarding")).toBe("/onboarding");
    expect(safeRedirect("/org-selection")).toBe("/org-selection");
  });

  it("rejects external URLs", () => {
    expect(safeRedirect("https://evil.example")).toBeNull();
    expect(safeRedirect("http://evil.example")).toBeNull();
  });

  it("rejects protocol-relative URLs", () => {
    expect(safeRedirect("//evil.example")).toBeNull();
  });

  it("rejects javascript: and other schemes", () => {
    expect(safeRedirect("javascript:alert(1)")).toBeNull();
    expect(safeRedirect("data:text/html,<script>1</script>")).toBeNull();
  });

  it("rejects backslash tricks and malformed values", () => {
    expect(safeRedirect("/\\evil.example")).toBeNull();
    expect(safeRedirect("")).toBeNull();
    expect(safeRedirect(null)).toBeNull();
    expect(safeRedirect(undefined)).toBeNull();
  });

  it("rejects non-allowlisted internal paths", () => {
    expect(safeRedirect("/admin")).toBeNull();
    expect(safeRedirect("/login")).toBeNull();
  });
});

describe("postAuthDestinationFor (IPI-1058)", () => {
  it("routes zero memberships to /onboarding", async () => {
    const destination = await postAuthDestinationFor({
      operator,
      listOrgIds: async () => ({ ok: true, orgIds: [] }),
    });
    expect(destination).toBe("/onboarding");
  });

  it("routes one membership to /planner", async () => {
    const destination = await postAuthDestinationFor({
      operator,
      listOrgIds: async () => ({
        ok: true,
        orgIds: ["22222222-2222-4222-8222-222222222222"],
      }),
    });
    expect(destination).toBe("/planner");
  });

  it("routes multiple memberships to /org-selection", async () => {
    const destination = await postAuthDestinationFor({
      operator,
      listOrgIds: async () => ({
        ok: true,
        orgIds: [
          "22222222-2222-4222-8222-222222222222",
          "33333333-3333-4333-8333-333333333333",
        ],
      }),
    });
    expect(destination).toBe("/org-selection");
  });

  it("fails closed to /login on lookup failure", async () => {
    const destination = await postAuthDestinationFor({
      operator,
      listOrgIds: async () => ({ ok: false }),
    });
    expect(destination).toBe("/login");
  });

  it("ignores malformed membership ids", async () => {
    const destination = await postAuthDestinationFor({
      operator,
      listOrgIds: async () => ({
        ok: true,
        orgIds: ["not-a-uuid", "22222222-2222-4222-8222-222222222222"],
      }),
    });
    expect(destination).toBe("/planner");
  });
});