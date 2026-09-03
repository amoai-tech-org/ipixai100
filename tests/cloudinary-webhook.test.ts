import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const ORG = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const BRAND = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ASSET = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const SHOOT = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const PROVIDER = "provider-asset-111";

function signBody(body: string, timestamp: number, secret: string): string {
  return createHash("sha1")
    .update(body + String(timestamp) + secret)
    .digest("hex");
}

describe("IPI-1111 Cloudinary webhook normalize + context", () => {
  it("reads signed upload context fields and tolerates unknown payload keys", async () => {
    const { normalizeCloudinaryNotification, toRpcPayload } = await import(
      "../src/lib/cloudinary/webhook-normalize"
    );

    const event = normalizeCloudinaryNotification({
      notification_type: "upload",
      request_id: "req-1",
      asset_id: PROVIDER,
      public_id: "brands/x/shot",
      version: 8,
      secure_url: "https://res.cloudinary.com/demo/image/authenticated/v8/brands/x/shot",
      resource_type: "image",
      type: "authenticated",
      width: 100,
      height: 200,
      totally_unknown_future_field: { nested: true },
      context: {
        custom: {
          ipix_asset_id: ASSET,
          org_id: ORG,
          brand_id: BRAND,
          v2_shoot_id: SHOOT,
        },
      },
    });

    expect(event).not.toBeNull();
    expect(event!.kind).toBe("upload");
    expect(event!.cloudinaryAssetId).toBe(PROVIDER);
    expect(event!.version).toBe(8);
    expect(event!.context.ipixAssetId).toBe(ASSET);
    expect(event!.context.brandId).toBe(BRAND);
    expect(event!.context.orgId).toBe(ORG);
    expect(event!.context.v2ShootId).toBe(SHOOT);
    expect(event!.requestId).toBe("req-1");

    const payload = toRpcPayload(event!);
    expect(payload.ipix_asset_id).toBe(ASSET);
    expect(payload.cloudinary_asset_id).toBe(PROVIDER);
  });

  it("uses deterministic request_id fallback (never a fresh UUID)", async () => {
    const { normalizeCloudinaryNotification } = await import(
      "../src/lib/cloudinary/webhook-normalize"
    );

    const body = {
      notification_type: "upload",
      asset_id: PROVIDER,
      public_id: "a/b",
      version: 3,
    };
    const a = normalizeCloudinaryNotification(body)!;
    const b = normalizeCloudinaryNotification(body)!;
    expect(a.requestId).toBe(b.requestId);
    expect(a.requestId.startsWith("cld:evt:")).toBe(true);
  });

  it("maps delete notifications and keeps provider identity across public_id rename payloads", async () => {
    const { normalizeCloudinaryNotification } = await import(
      "../src/lib/cloudinary/webhook-normalize"
    );

    const deleted = normalizeCloudinaryNotification({
      notification_type: "delete",
      request_id: "del-1",
      resources: [{ public_id: "old/name", asset_id: PROVIDER, type: "authenticated" }],
    });
    expect(deleted!.kind).toBe("deleted");
    expect(deleted!.cloudinaryAssetId).toBe(PROVIDER);
    expect(deleted!.publicId).toBe("old/name");

    const renamed = normalizeCloudinaryNotification({
      notification_type: "rename",
      request_id: "ren-1",
      asset_id: PROVIDER,
      public_id: "new/name",
      version: 9,
    });
    expect(renamed!.kind).toBe("rename");
    expect(renamed!.cloudinaryAssetId).toBe(PROVIDER);
    expect(renamed!.publicId).toBe("new/name");
  });

  it("parses pipe-delimited context strings", async () => {
    const { readIpixUploadContext } = await import(
      "../src/lib/cloudinary/upload-context"
    );
    const ctx = readIpixUploadContext(
      `ipix_asset_id=${ASSET}|brand_id=${BRAND}|org_id=${ORG}`,
    );
    expect(ctx.ipixAssetId).toBe(ASSET);
    expect(ctx.brandId).toBe(BRAND);
  });
});

describe("IPI-1111 signature verify", () => {
  const secret = "test-notification-secret";
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env.CLOUDINARY_CLOUD_NAME = "ipix-cloudinary";
    process.env.CLOUDINARY_API_KEY = "key";
    process.env.CLOUDINARY_API_SECRET = secret;
    delete process.env.CLOUDINARY_NOTIFICATION_API_SECRET;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("accepts a valid signature and rejects tampered body / missing headers", async () => {
    const { verifyCloudinaryNotification } = await import(
      "../src/lib/cloudinary/webhook-verify"
    );
    const body = JSON.stringify({ notification_type: "upload", asset_id: PROVIDER });
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = signBody(body, timestamp, secret);

    expect(
      verifyCloudinaryNotification({
        rawBody: body,
        timestampHeader: String(timestamp),
        signatureHeader: signature,
      }).ok,
    ).toBe(true);

    expect(
      verifyCloudinaryNotification({
        rawBody: body + " ",
        timestampHeader: String(timestamp),
        signatureHeader: signature,
      }).ok,
    ).toBe(false);

    expect(
      verifyCloudinaryNotification({
        rawBody: body,
        timestampHeader: null,
        signatureHeader: signature,
      }).ok,
    ).toBe(false);
  });
});

describe("IPI-1111 webhook route", () => {
  const secret = "route-secret";
  const originalEnv = { ...process.env };
  const rpc = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    rpc.mockReset();
    process.env.CLOUDINARY_CLOUD_NAME = "ipix-cloudinary";
    process.env.CLOUDINARY_API_KEY = "key";
    process.env.CLOUDINARY_API_SECRET = secret;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";

    vi.doMock("../src/lib/cloudinary/webhook-persist", () => ({
      applyCloudinaryAssetEvent: rpc,
    }));
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.doUnmock("../src/lib/cloudinary/webhook-persist");
  });

  function signedRequest(body: unknown, mutate?: (raw: string) => string) {
    const raw = typeof body === "string" ? body : JSON.stringify(body);
    const timestamp = Math.floor(Date.now() / 1000);
    const payload = mutate ? mutate(raw) : raw;
    // Sign the bytes we send; for tamper tests we sign original then mutate after.
    const signature = signBody(raw, timestamp, secret);
    return new Request("http://localhost/api/cloudinary/webhook", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-cld-timestamp": String(timestamp),
        "x-cld-signature": signature,
        "x-cld-signature_v2": "observed-but-unused",
      },
      body: payload,
    });
  }

  it("returns 200 after successful upload apply", async () => {
    rpc.mockResolvedValue({
      ok: true,
      result: { outcome: "applied", asset_id: ASSET, version: 8 },
    });
    const { POST } = await import("../src/app/api/cloudinary/webhook/route");
    const res = await POST(
      signedRequest({
        notification_type: "upload",
        request_id: "req-upload-1",
        asset_id: PROVIDER,
        public_id: "p/1",
        version: 8,
        secure_url: "https://example.test/u",
        type: "authenticated",
        context: { custom: { ipix_asset_id: ASSET, brand_id: BRAND, org_id: ORG } },
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.outcome).toBe("applied");
    expect(rpc).toHaveBeenCalledOnce();
  });

  it("returns 200 for duplicate / stale outcomes (Cloudinary should not retry forever)", async () => {
    rpc.mockResolvedValue({ ok: true, result: { outcome: "noop_duplicate" } });
    const { POST } = await import("../src/app/api/cloudinary/webhook/route");
    expect((await POST(signedRequest({ notification_type: "upload", request_id: "d", asset_id: PROVIDER, version: 8 }))).status).toBe(200);

    rpc.mockResolvedValue({ ok: true, result: { outcome: "noop_stale", version: 8 } });
    expect((await POST(signedRequest({ notification_type: "upload", request_id: "s", asset_id: PROVIDER, version: 7 }))).status).toBe(200);
  });

  it("returns 401 for tampered body with reused signature", async () => {
    rpc.mockResolvedValue({ ok: true, result: { outcome: "applied" } });
    const { POST } = await import("../src/app/api/cloudinary/webhook/route");
    const original = JSON.stringify({
      notification_type: "upload",
      request_id: "t1",
      asset_id: PROVIDER,
      version: 1,
    });
    const res = await POST(signedRequest(original, (raw) => raw.replace("t1", "HACKED")));
    expect(res.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("returns 503 when persistence fails so Cloudinary retries", async () => {
    rpc.mockResolvedValue({ ok: false, status: 503, error: "forced_db_fail" });
    const { POST } = await import("../src/app/api/cloudinary/webhook/route");
    const res = await POST(
      signedRequest({
        notification_type: "upload",
        request_id: "fail-1",
        asset_id: PROVIDER,
        version: 1,
      }),
    );
    expect(res.status).toBe(503);
  });

  it("archives deletes and treats duplicate delete as 200", async () => {
    rpc.mockResolvedValue({ ok: true, result: { outcome: "archived" } });
    const { POST } = await import("../src/app/api/cloudinary/webhook/route");
    expect(
      (
        await POST(
          signedRequest({
            notification_type: "delete",
            request_id: "del-1",
            resources: [{ asset_id: PROVIDER, public_id: "x" }],
          }),
        )
      ).status,
    ).toBe(200);

    rpc.mockResolvedValue({ ok: true, result: { outcome: "noop_duplicate_delete" } });
    expect(
      (
        await POST(
          signedRequest({
            notification_type: "delete",
            request_id: "del-1",
            resources: [{ asset_id: PROVIDER, public_id: "x" }],
          }),
        )
      ).status,
    ).toBe(200);
  });
});

describe("IPI-1111 version compare helper (stale vs newest)", () => {
  it("treats lower version as stale and equal as candidate duplicate", () => {
    const isStale = (incoming: number, current: number) => incoming < current;
    expect(isStale(7, 8)).toBe(true);
    expect(isStale(8, 8)).toBe(false);
    expect(isStale(9, 8)).toBe(false);
  });
});
