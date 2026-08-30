import { afterEach, describe, expect, it, vi } from "vitest";

import * as agent from "../src/agent";
import {
  DELETE,
  GET,
  PATCH,
  POST,
} from "../src/app/api/copilotkit/[[...slug]]/route";
import { unauthorizedResponse } from "../src/lib/auth/unauthorized";
import {
  copilotHandshake,
  infoListsDefaultAgent,
} from "../src/lib/auth/copilot-mount";
import {
  getVerifiedOperatorFromClaims,
  memoryResourceId,
  plannerSurfaceFor,
  requireVerifiedOperator,
} from "../src/lib/auth/verified-operator";

vi.mock("../src/lib/supabase/server", () => ({
  createClientFromRequest: () => ({
    auth: {
      getClaims: async () => ({ data: { claims: null }, error: null }),
    },
  }),
  createClient: async () => null,
}));

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function jsonRequest(
  method: string,
  body?: Record<string, unknown>,
  headers?: Record<string, string>,
): Request {
  return new Request("http://localhost/api/copilotkit/info", {
    method,
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("IPI-1037 · AUTH-001 identity", () => {
  it("returns 401 for a signed-out claims result", async () => {
    await expect(
      requireVerifiedOperator({
        request: jsonRequest("GET"),
        getClaims: async () => ({ data: { claims: null }, error: null }),
      }),
    ).rejects.toSatisfy((err: unknown) => err instanceof Response && err.status === 401);
  });

  it("returns the server-verified user when getClaims succeeds", async () => {
    const operator = await getVerifiedOperatorFromClaims({
      getClaims: async () => ({
        data: { claims: { sub: USER_A, email: "operator@example.com" } },
        error: null,
      }),
    });
    expect(operator).toEqual({ id: USER_A, name: "operator@example.com" });
  });

  it("returns 401 for expired or tampered claims", async () => {
    await expect(
      requireVerifiedOperator({
        request: jsonRequest("GET", undefined, {
          cookie: "sb-nvdlhrodvevgwdsneplk-auth-token=tampered",
        }),
        getClaims: async () => ({
          data: { claims: null },
          error: { message: "invalid JWT" },
        }),
      }),
    ).rejects.toSatisfy((err: unknown) => err instanceof Response && err.status === 401);
  });

  it("ignores a forged body/header user id", async () => {
    const request = jsonRequest(
      "POST",
      { userId: USER_B, user_id: USER_B, identifyUser: { id: USER_B } },
      { "x-user-id": USER_B, authorization: `Bearer ${USER_B}` },
    );
    const operator = await getVerifiedOperatorFromClaims({
      request,
      getClaims: async () => ({
        data: { claims: { sub: USER_A, email: "a@example.com" } },
        error: null,
      }),
    });
    expect(operator?.id).toBe(USER_A);
    expect(operator?.id).not.toBe(USER_B);
  });

  it("uses the org::user memory key until AUTH-002 supplies an org", () => {
    expect(memoryResourceId(USER_A)).toBe(`org:unscoped::user:${USER_A}`);
  });

  it("keeps the same user across a refresh-shaped second claims read", async () => {
    const getClaims = vi
      .fn()
      .mockResolvedValueOnce({
        data: { claims: { sub: USER_A, email: "operator@example.com" } },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { claims: { sub: USER_A, email: "operator@example.com" } },
        error: null,
      });
    const first = await getVerifiedOperatorFromClaims({ getClaims });
    const second = await getVerifiedOperatorFromClaims({ getClaims });
    expect(first?.id).toBe(USER_A);
    expect(second?.id).toBe(USER_A);
    expect(getClaims).toHaveBeenCalledTimes(2);
    expect(copilotHandshake("signed-in").expectedInfoStatus).toBe(200);
  });

  it("denies the next request after a sign-out-shaped claims miss", async () => {
    const signedIn = await getVerifiedOperatorFromClaims({
      getClaims: async () => ({
        data: { claims: { sub: USER_A, email: "operator@example.com" } },
        error: null,
      }),
    });
    expect(signedIn?.id).toBe(USER_A);
    await expect(
      requireVerifiedOperator({
        request: jsonRequest("POST"),
        getClaims: async () => ({ data: { claims: null }, error: null }),
      }),
    ).rejects.toSatisfy((err: unknown) => err instanceof Response && err.status === 401);
    expect(copilotHandshake("signed-out").expectedInfoStatus).toBe(401);
  });

  it("returns 401 from every CopilotKit handler before creating agents", async () => {
    const spy = vi.spyOn(agent, "createLocalAgents");
    const handlers = { GET, POST, PATCH, DELETE };
    for (const method of ["GET", "POST", "PATCH", "DELETE"] as const) {
      const info = await handlers[method](
        new Request("http://localhost/api/copilotkit/info", { method }),
      );
      expect(info.status).toBe(401);

      const agentReq = new Request("http://localhost/api/copilotkit", {
        method,
        headers: { "content-type": "application/json" },
        body: method === "GET" || method === "DELETE" ? undefined : "{}",
      });
      const agentRes = await handlers[method](agentReq);
      expect(agentRes.status).toBe(401);
    }
    expect(spy).not.toHaveBeenCalled();
  });

  it("does not serialize cookies, JWTs, or keys into the 401 body", async () => {
    const response = unauthorizedResponse();
    const body = await response.text();
    expect(body).toBe('{"error":"unauthorized"}');
    expect(body.toLowerCase()).not.toMatch(/cookie|bearer|jwt|service_role|refresh_token/);
  });

  it("does not mount CopilotKit until a verified session exists", () => {
    expect(plannerSurfaceFor(null)).toBe("login");
    expect(copilotHandshake("signed-out")).toEqual({
      mountCopilotKit: false,
      expectedInfoStatus: 401,
    });
    expect(copilotHandshake("loading")).toEqual({
      mountCopilotKit: false,
      expectedInfoStatus: null,
    });
    expect(
      plannerSurfaceFor({ id: USER_A, name: "operator@example.com" }),
    ).toBe("planner");
    expect(copilotHandshake("signed-in")).toEqual({
      mountCopilotKit: true,
      expectedInfoStatus: 200,
    });
  });

  it("recognizes the default agent after runtime discovery", () => {
    expect(
      infoListsDefaultAgent({
        version: "1.68.1",
        agents: { default: { name: "default", className: "o" } },
      }),
    ).toBe(true);
    expect(infoListsDefaultAgent({ agents: { weather: { name: "weather" } } })).toBe(
      false,
    );
  });
});
