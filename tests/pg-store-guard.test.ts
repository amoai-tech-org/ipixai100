import { describe, expect, it } from "vitest";
import {
  assertSafeMastraDatabaseUrl,
  getMastraPgPool,
  getMastraPostgresStore,
} from "../src/mastra/pg-store";

describe("IPI-1044 local URL guard", () => {
  it("allows local Docker Postgres", () => {
    const parsed = assertSafeMastraDatabaseUrl(
      "postgresql://postgres:postgres@127.0.0.1:54342/postgres",
    );
    expect(parsed.hostname).toBe("127.0.0.1");
    expect(parsed.port).toBe("54342");
  });

  it("fails closed on hosted fashionos", () => {
    expect(() =>
      assertSafeMastraDatabaseUrl(
        "postgresql://postgres:x@db.nvdlhrodvevgwdsneplk.supabase.co:5432/postgres",
      ),
    ).toThrow(/fashionos|refusing/);
  });

  it("reuses one bounded pool for concurrent local queries", async () => {
    const url = process.env.MASTRA_DATABASE_URL;
    if (!url) return;
    const a = getMastraPgPool(url);
    const b = getMastraPgPool(url);
    expect(a).toBe(b);
    expect(getMastraPostgresStore(url)).toBe(getMastraPostgresStore(url));
    const [first, second] = await Promise.all([
      a.query("select 1 as n"),
      b.query("select 1 as n"),
    ]);
    expect(first.rows[0].n).toBe(1);
    expect(second.rows[0].n).toBe(1);
  });
});
