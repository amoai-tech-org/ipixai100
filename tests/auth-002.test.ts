import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import * as agent from "../src/agent";
import {
  DELETE,
  GET,
  PATCH,
  POST,
} from "../src/app/api/copilotkit/[[...slug]]/route";
import {
  memoryResourceId,
} from "../src/lib/auth/verified-operator";
import {
  productBootstrapFor,
  resolveTrustedRuntimeOrg,
} from "../src/lib/auth/runtime-org";

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
const ORG_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ORG_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const memberships: { rows: { org_id: string }[]; error: unknown } = {
  rows: [],
  error: null,
};
const claims: { sub?: string; email?: string } = {
  sub: USER_A,
  email: "operator@example.com",
};

vi.mock("../src/lib/supabase/server", () => ({
  createClientFromRequest: () => ({
    auth: {
      getClaims: async () => ({
        data: { claims: { sub: claims.sub, email: claims.email } },
        error: claims.sub ? null : { message: "invalid JWT" },
      }),
    },
    from: (table: string) => ({
      select: () => ({
        eq: async () => {
          if (table !== "org_members") {
            return { data: null, error: { message: "unexpected table" } };
          }
          return { data: memberships.rows, error: memberships.error };
        },
      }),
    }),
  }),
  createClient: async () => null,
}));

afterEach(() => {
  memberships.rows = [];
  memberships.error = null;
  claims.sub = USER_A;
  claims.email = "operator@example.com";
  vi.restoreAllMocks();
});

function jsonRequest(
  method: string,
  body?: Record<string, unknown>,
  headers?: Record<string, string>,
): Request {
    const init: RequestInit = {
      method,
      headers: {
        "content-type": "application/json",
        ...headers,
      },
    };
    if (body && method !== "GET" && method !== "HEAD" && method !== "DELETE") {
      init.body = JSON.stringify(body);
    }
    return new Request("http://localhost/api/copilotkit/info", init);
}

describe("IPI-1046 · AUTH-002 tenant identity", () => {
  it("gives an Org A member an Org A resourceId", () => {
    expect(
      memoryResourceId({ userId: USER_A, orgId: ORG_A }),
    ).toBe(`org:${ORG_A}::user:${USER_A}`);
    expect(
      resolveTrustedRuntimeOrg({
        membershipOrgIds: [ORG_A],
        clientOrgId: ORG_B,
        userMetadataOrgId: ORG_B,
      }),
    ).toEqual({ status: "ok", orgId: ORG_A });
  });

  it("gives an Org B member an Org B resourceId", () => {
    expect(
      memoryResourceId({ userId: USER_B, orgId: ORG_B }),
    ).toBe(`org:${ORG_B}::user:${USER_B}`);
  });

  it("uses different resourceIds for the same user in different orgs", () => {
    const inA = memoryResourceId({ userId: USER_A, orgId: ORG_A });
    const inB = memoryResourceId({ userId: USER_A, orgId: ORG_B });
    expect(inA).not.toBe(inB);
  });

  it("does not silently pick an org when the user has two memberships", () => {
    const resolution = resolveTrustedRuntimeOrg({
      membershipOrgIds: [ORG_A, ORG_B],
      clientOrgId: ORG_A,
    });
    expect(resolution).toEqual({ status: "needs_org_selection" });
    expect(productBootstrapFor(resolution)).toBe("org_selection");
  });

  it("maps zero memberships to onboarding for product bootstrap, not a fake org", () => {
    const resolution = resolveTrustedRuntimeOrg({
      membershipOrgIds: [],
      userMetadataOrgId: ORG_A,
    });
    expect(resolution).toEqual({ status: "needs_onboarding" });
    expect(productBootstrapFor(resolution)).toBe("onboarding");
  });

  it("returns 403 on CopilotKit runtime before creating agents when membership is missing", async () => {
    const spy = vi.spyOn(agent, "createLocalAgents");
    memberships.rows = [];
    const handlers = { GET, POST, PATCH, DELETE };
    for (const method of ["GET", "POST", "PATCH", "DELETE"] as const) {
      const response = await handlers[method](jsonRequest(method));
      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body).toEqual({
        error: "forbidden",
        reason: "needs_onboarding",
      });
    }
    expect(spy).not.toHaveBeenCalled();
  });

  it("returns 403 for a two-org user instead of assigning an arbitrary org", async () => {
    const spy = vi.spyOn(agent, "createLocalAgents");
    memberships.rows = [{ org_id: ORG_A }, { org_id: ORG_B }];
    const response = await POST(jsonRequest("POST", { orgId: ORG_A }));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "forbidden",
      reason: "needs_org_selection",
    });
    expect(spy).not.toHaveBeenCalled();
  });

  it("ignores spoofed body, query, and header orgIds", async () => {
    const spy = vi
      .spyOn(agent, "createLocalAgents")
      .mockReturnValue({});
    memberships.rows = [{ org_id: ORG_A }];
    const request = new Request(
      `http://localhost/api/copilotkit/info?orgId=${ORG_B}&org_id=${ORG_B}`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-org-id": ORG_B,
        },
        body: JSON.stringify({ orgId: ORG_B, org_id: ORG_B, organizationId: ORG_B }),
      },
    );
    const response = await POST(request);
    expect(response.status).not.toBe(403);
    expect(spy).toHaveBeenCalledWith(`org:${ORG_A}::user:${USER_A}`);
    expect(spy).not.toHaveBeenCalledWith(`org:${ORG_B}::user:${USER_A}`);
  });

  it("ignores user_metadata.orgId when granting tenant context", async () => {
    const spy = vi
      .spyOn(agent, "createLocalAgents")
      .mockReturnValue({});
    memberships.rows = [{ org_id: ORG_A }];
    const request = jsonRequest("POST", {
      user_metadata: { orgId: ORG_B, org_id: ORG_B },
    });
    await POST(request);
    expect(spy).toHaveBeenCalledWith(`org:${ORG_A}::user:${USER_A}`);
  });

  it("still 401s a stale JWT through AUTH-001 before tenant resolution", async () => {
    const spy = vi.spyOn(agent, "createLocalAgents");
    claims.sub = undefined;
    memberships.rows = [{ org_id: ORG_A }];
    const response = await GET(jsonRequest("GET"));
    expect(response.status).toBe(401);
    expect(spy).not.toHaveBeenCalled();
  });

  it("does not put a service-role secret in browser client source", () => {
    const client = readFileSync(
      join(process.cwd(), "src/lib/supabase/client.ts"),
      "utf8",
    );
    const env = readFileSync(join(process.cwd(), "src/lib/supabase/env.ts"), "utf8");
    expect(client).not.toMatch(/SERVICE_ROLE|service_role|secret/i);
    expect(env).not.toMatch(/SERVICE_ROLE|service_role/);
  });
});
