import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const USER_A = "11111111-1111-4111-8111-111111111111";
const ORG_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ORG_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const BRAND_A = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const BRAND_B = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const SHOOT_A = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const SHOOT_B = "ffffffff-ffff-4fff-8fff-ffffffffffff";

const memberships: {
  rows: { org_id: string }[];
  error: unknown;
} = { rows: [], error: null };

const claims: { sub?: string; email?: string } = {
  sub: USER_A,
  email: "operator@example.com",
};

const brandRows: { id: string; org_id: string }[] = [];
const shootRows: { id: string; brand_id: string }[] = [];
const inserts: { table: string }[] = [];

function brandQuery(brandId: string, orgId: string) {
  const row = brandRows.find((b) => b.id === brandId && b.org_id === orgId);
  return { data: row ? { id: row.id } : null, error: null };
}

function shootQuery(shootId: string, brandId: string) {
  const row = shootRows.find((s) => s.id === shootId && s.brand_id === brandId);
  return { data: row ? { id: row.id } : null, error: null };
}

vi.mock("../src/lib/supabase/server", () => ({
  createClientFromRequest: () => ({
    auth: {
      getClaims: async () => ({
        data: { claims: { sub: claims.sub, email: claims.email } },
        error: claims.sub ? null : { message: "invalid JWT" },
      }),
    },
    from: (table: string) => {
      if (table === "org_members") {
        return {
          select: () => ({
            eq: async () => ({
              data: memberships.rows,
              error: memberships.error,
            }),
          }),
        };
      }
      if (table === "brands") {
        return {
          select: () => ({
            eq: (_c1: string, brandId: string) => ({
              eq: (_c2: string, orgId: string) => ({
                maybeSingle: async () => brandQuery(brandId, orgId),
              }),
            }),
          }),
          insert: () => {
            inserts.push({ table });
            throw new Error("signing must not insert brands");
          },
        };
      }
      if (table === "assets" || table === "cloudinary_assets") {
        return {
          insert: () => {
            inserts.push({ table });
            throw new Error("signing must not insert assets");
          },
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: async () => ({ data: null, error: { message: "unexpected" } }),
        }),
      };
    },
    schema: (name: string) => ({
      from: (table: string) => {
        if (name === "shoot" && table === "shoots") {
          return {
            select: () => ({
              eq: (_c1: string, shootId: string) => ({
                eq: (_c2: string, brandId: string) => ({
                  maybeSingle: async () => shootQuery(shootId, brandId),
                }),
              }),
            }),
            insert: () => {
              inserts.push({ table: "shoot.shoots" });
              throw new Error("signing must not insert shoots");
            },
          };
        }
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: null,
                  error: { message: "unexpected" },
                }),
              }),
            }),
          }),
        };
      },
    }),
  }),
  createClient: async () => null,
}));

import { POST } from "../src/app/api/cloudinary/sign/route";
import {
  buildSignedUploadParams,
  formatUploadContext,
  rejectClientSignParams,
  resolveSignedUploadPreset,
  signUploadParams,
} from "../src/lib/cloudinary/sign-upload";
import {
  DEFAULT_SIGNED_UPLOAD_PRESET,
  UPLOAD_CONTEXT_SCHEMA_VERSION,
} from "../src/lib/cloudinary/upload-contract";

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env.CLOUDINARY_CLOUD_NAME = "ipix-cloudinary";
  process.env.CLOUDINARY_API_KEY = "test-api-key";
  process.env.CLOUDINARY_API_SECRET = "test-api-secret";
  delete process.env.CLOUDINARY_SIGNED_UPLOAD_PRESET;
  memberships.rows = [{ org_id: ORG_A }];
  memberships.error = null;
  claims.sub = USER_A;
  brandRows.length = 0;
  brandRows.push({ id: BRAND_A, org_id: ORG_A });
  shootRows.length = 0;
  shootRows.push({ id: SHOOT_A, brand_id: BRAND_A });
  inserts.length = 0;
  vi.resetModules();
});

afterEach(() => {
  process.env = { ...originalEnv };
});

function signRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/cloudinary/sign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("IPI-1110 · CLD-SIGN-001 upload contract helpers", () => {
  it("formats shared context fields for webhook correlation", () => {
    expect(
      formatUploadContext({
        org_id: ORG_A,
        brand_id: BRAND_A,
        asset_id: "11111111-1111-4111-8111-111111111111",
        schema_version: UPLOAD_CONTEXT_SCHEMA_VERSION,
        v2_shoot_id: SHOOT_A,
      }),
    ).toBe(
      `org_id=${ORG_A}|brand_id=${BRAND_A}|asset_id=11111111-1111-4111-8111-111111111111|schema_version=1|v2_shoot_id=${SHOOT_A}`,
    );
  });

  it("rejects unauthorized client sign params and stale timestamps", () => {
    expect(rejectClientSignParams({ eager: "c_fill" })).toEqual({
      ok: false,
      reason: "unauthorized_param:eager",
    });
    expect(rejectClientSignParams({ notification_url: "https://x" })).toEqual({
      ok: false,
      reason: "unauthorized_param:notification_url",
    });
    expect(rejectClientSignParams({ upload_preset: "ai_powerstart" })).toEqual({
      ok: false,
      reason: "forbidden_preset",
    });
    expect(
      rejectClientSignParams(
        { timestamp: Math.floor(Date.now() / 1000) - 4000 },
        Math.floor(Date.now() / 1000),
      ),
    ).toEqual({ ok: false, reason: "stale_timestamp" });
  });

  it("defaults to ipix-signed-upload and rejects forbidden/unknown presets", () => {
    expect(resolveSignedUploadPreset(undefined)).toEqual({
      ok: true,
      preset: DEFAULT_SIGNED_UPLOAD_PRESET,
    });
    expect(resolveSignedUploadPreset("ipix-signed-upload")).toEqual({
      ok: true,
      preset: "ipix-signed-upload",
    });
    expect(resolveSignedUploadPreset("ai_powerstart")).toEqual({
      ok: false,
      reason: "forbidden_preset",
    });
    expect(resolveSignedUploadPreset("fashionos-unsigned")).toEqual({
      ok: false,
      reason: "unknown_preset",
    });
  });

  it("produces a different signature when brand or shoot changes", async () => {
    const { cloudinary } = await import("../src/lib/cloudinary/config");
    void cloudinary;
    const a = buildSignedUploadParams({
      orgId: ORG_A,
      brandId: BRAND_A,
      v2ShootId: SHOOT_A,
      assetId: "11111111-1111-4111-8111-111111111111",
      timestamp: 1_700_000_000,
      uploadPreset: DEFAULT_SIGNED_UPLOAD_PRESET,
    });
    const b = buildSignedUploadParams({
      orgId: ORG_A,
      brandId: BRAND_B,
      v2ShootId: SHOOT_A,
      assetId: "11111111-1111-4111-8111-111111111111",
      timestamp: 1_700_000_000,
      uploadPreset: DEFAULT_SIGNED_UPLOAD_PRESET,
    });
    expect(a.params.context).not.toBe(b.params.context);
    expect(a.params.upload_preset).toBe("ipix-signed-upload");
    expect(signUploadParams(a.params, "test-api-secret")).not.toBe(
      signUploadParams(b.params, "test-api-secret"),
    );
  });
});

describe("IPI-1110 · CLD-SIGN-001 /api/cloudinary/sign", () => {
  it("returns a signature for an owned brand and shoot without creating a DB row", async () => {
    const res = await POST(
      signRequest({ brand_id: BRAND_A, v2_shoot_id: SHOOT_A }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.signature).toEqual(expect.any(String));
    expect(body.signature.length).toBeGreaterThan(10);
    expect(body.type).toBe("authenticated");
    expect(body.upload_preset).toBe("ipix-signed-upload");
    expect(body.schema_version).toBe("1");
    expect(body.org_id).toBe(ORG_A);
    expect(body.brand_id).toBe(BRAND_A);
    expect(body.v2_shoot_id).toBe(SHOOT_A);
    expect(body.asset_id).toEqual(expect.any(String));
    expect(body.context).toContain(`asset_id=${body.asset_id}`);
    expect(body.api_key).toBe("test-api-key");
    expect(body.cloud_name).toBe("ipix-cloudinary");
    expect(body).not.toHaveProperty("api_secret");
    expect(JSON.stringify(body)).not.toContain("test-api-secret");
    expect(inserts).toEqual([]);
  });

  it("returns 403 and no signature for a foreign brand", async () => {
    brandRows.length = 0;
    brandRows.push({ id: BRAND_B, org_id: ORG_B });
    const res = await POST(signRequest({ brand_id: BRAND_B }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual({ error: "forbidden", reason: "ownership" });
    expect(body).not.toHaveProperty("signature");
  });

  it("returns 403 and no signature for a foreign shoot", async () => {
    shootRows.length = 0;
    shootRows.push({ id: SHOOT_B, brand_id: BRAND_B });
    const res = await POST(
      signRequest({ brand_id: BRAND_A, v2_shoot_id: SHOOT_B }),
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.reason).toBe("ownership");
    expect(body).not.toHaveProperty("signature");
  });

  it("fails closed when multi-org membership is unresolved", async () => {
    memberships.rows = [{ org_id: ORG_A }, { org_id: ORG_B }];
    const res = await POST(signRequest({ brand_id: BRAND_A }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual({
      error: "forbidden",
      reason: "needs_org_selection",
    });
    expect(body).not.toHaveProperty("signature");
  });

  it("rejects body.org_id and unauthorized sign params", async () => {
    const orgAttempt = await POST(
      signRequest({ brand_id: BRAND_A, org_id: ORG_B }),
    );
    expect(orgAttempt.status).toBe(400);
    expect(await orgAttempt.json()).toMatchObject({
      reason: "unauthorized_param:org_id",
    });

    const eager = await POST(
      signRequest({
        brand_id: BRAND_A,
        paramsToSign: { eager: "w_100", timestamp: Math.floor(Date.now() / 1000) },
      }),
    );
    expect(eager.status).toBe(400);
    expect(await eager.json()).toMatchObject({
      reason: "unauthorized_param:eager",
    });
  });

  it("rejects a stale client timestamp path", async () => {
    const res = await POST(
      signRequest({
        brand_id: BRAND_A,
        paramsToSign: { timestamp: 1_000_000_000 },
      }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ reason: "stale_timestamp" });
  });

  it("returns 503 when the API secret is absent", async () => {
    delete process.env.CLOUDINARY_API_SECRET;
    vi.resetModules();
    const { POST: postFresh } = await import(
      "../src/app/api/cloudinary/sign/route"
    );
    const res = await postFresh(signRequest({ brand_id: BRAND_A }));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe("unavailable");
    expect(body).not.toHaveProperty("signature");
  });

  it("returns 503 when CLOUDINARY_SIGNED_UPLOAD_PRESET is ai_powerstart", async () => {
    process.env.CLOUDINARY_SIGNED_UPLOAD_PRESET = "ai_powerstart";
    const res = await POST(signRequest({ brand_id: BRAND_A }));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body).toEqual({
      error: "unavailable",
      reason: "forbidden_preset",
    });
    expect(body).not.toHaveProperty("signature");
  });

  it("returns 401 when the session is missing", async () => {
    claims.sub = undefined;
    const res = await POST(signRequest({ brand_id: BRAND_A }));
    expect(res.status).toBe(401);
  });
});
