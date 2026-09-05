import { describe, expect, it } from "vitest";
import { normalizeSiteUrl } from "../src/lib/site";

describe("normalizeSiteUrl (IPI-1057)", () => {
  it("returns the default site URL when unset", () => {
    expect(normalizeSiteUrl(undefined)).toBe("https://www.ipix.co");
  });

  it("normalizes a bare host", () => {
    expect(normalizeSiteUrl("ipix.co")).toBe("https://ipix.co");
  });

  it("rejects apex and subdomain workers.dev hosts", () => {
    expect(normalizeSiteUrl("https://my-worker.workers.dev")).toBe("https://www.ipix.co");
    expect(normalizeSiteUrl("https://workers.dev")).toBe("https://www.ipix.co");
  });

  it("rejects apex and subdomain vercel.app hosts", () => {
    expect(normalizeSiteUrl("https://ipixai-bennsyrnb-amo1000.vercel.app")).toBe("https://www.ipix.co");
    expect(normalizeSiteUrl("https://vercel.app")).toBe("https://www.ipix.co");
  });

  it("rejects preview hosts with non-default ports", () => {
    expect(normalizeSiteUrl("https://preview.vercel.app:3000")).toBe("https://www.ipix.co");
  });

  it("keeps a production host", () => {
    expect(normalizeSiteUrl("https://www.ipix.co")).toBe("https://www.ipix.co");
  });
});