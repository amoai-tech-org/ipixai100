import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { mastra } from "../src/mastra";
import { productionPlannerAgent } from "../src/mastra/agents";

// IPI-1048 · PLANNER-001 — the `default` registry key stays as-is (Planner
// UI, thread drawer, history restore, and operator chat all hard-code
// agentId="default"); only the agent instance behind it changes from the
// starter weather demo to the Production Planner.
describe("IPI-1048 PLANNER-001: production planner replaces the weather demo", () => {
  it("`default` resolves to the canonical Production Planner instance", () => {
    expect(mastra.getAgent("default")).toBe(productionPlannerAgent);
  });

  it("agent identity is the Production Planner, not the weather demo", () => {
    expect(productionPlannerAgent.id).toBe("production-planner");
    expect(productionPlannerAgent.name).toBe("Production Planner");
  });

  it("no weather tool is attached — no TOOL-001 tools yet either", async () => {
    const tools = await productionPlannerAgent.listTools();
    expect(tools).toEqual({});
  });

  it("instructions carry the fashion-production contract, not the generic demo prompt", async () => {
    const instructions = await productionPlannerAgent.getInstructions();
    const text = String(instructions).toLowerCase();
    expect(text).not.toBe("you are a helpful assistant.");
    expect(text).not.toContain("weather");
    for (const term of ["shoot", "deliverable", "budget", "production"]) {
      expect(text).toContain(term);
    }
  });

  it("never claims a save/approval/booking/payment occurred, and asks rather than invents", async () => {
    const instructions = String(await productionPlannerAgent.getInstructions()).toLowerCase();
    expect(instructions).toContain("ask for missing information");
    expect(instructions).toMatch(/cannot save|no tools to do so|never claim/);
  });

  it("keeps the existing resource-scoped Postgres/Memory configuration attached", async () => {
    const memory = await productionPlannerAgent.getMemory();
    expect(memory).toBeDefined();
  });

  it("no production registry entry exposes the weather agent", () => {
    const registeredIds = Object.values(mastra.listAgents()).map((agent) => agent.id);
    expect(registeredIds).not.toContain("weather-agent");
    expect(registeredIds).toContain("production-planner");
  });

  it("agents/index.ts source has no weather agent/tool import left in the production module", () => {
    const src = readFileSync(
      new URL("../src/mastra/agents/index.ts", import.meta.url),
      "utf8",
    );
    expect(src).not.toMatch(/weatherAgent|weatherTool|weather-agent/);
  });
});
