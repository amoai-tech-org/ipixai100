import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("Cloudinary server config", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    delete process.env.CLOUDINARY_CLOUD_NAME;
    delete process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    delete process.env.CLOUDINARY_API_KEY;
    delete process.env.CLOUDINARY_API_SECRET;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("prefers CLOUDINARY_CLOUD_NAME over NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", async () => {
    process.env.CLOUDINARY_CLOUD_NAME = "ipix-cloudinary";
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = "should-not-win";
    process.env.CLOUDINARY_API_KEY = "test-key";
    process.env.CLOUDINARY_API_SECRET = "test-secret";

    const { cloudinary } = await import("../src/lib/cloudinary/config");
    const cfg = cloudinary.config();

    expect(cfg.cloud_name).toBe("ipix-cloudinary");
    expect(cfg.secure).toBe(true);
  });

  it("falls back to NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and sets secure: true", async () => {
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = "public-cloud";
    process.env.CLOUDINARY_API_KEY = "test-key";
    process.env.CLOUDINARY_API_SECRET = "test-secret";

    const { cloudinary } = await import("../src/lib/cloudinary/config");
    const cfg = cloudinary.config();

    expect(cfg.cloud_name).toBe("public-cloud");
    expect(cfg.secure).toBe(true);
  });
});
