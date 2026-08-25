import { describe, expect, it } from "vitest";
import {
  assertSafeMastraDatabaseUrl,
  getMastraPgPool,
  getMastraPostgresStore,
  isAllowedLocalMastraDatabaseHost,
} from "../src/mastra/pg-store";

describe("IPI-1044 local URL guard", () => {
  it("allows local Docker Postgres", () => {
    const parsed = assertSafeMastraDatabaseUrl(
      "postgresql://postgres:postgres@127.0.0.1:54342/postgres",
    );
    expect(parsed.hostname).toBe("127.0.0.1");
    expect(parsed.port).toBe("54342");
  });

  it("allows localhost, ::1, docker db hostname, and *.local", () => {
    expect(
      assertSafeMastraDatabaseUrl("postgresql://postgres@localhost:5432/postgres")
        .hostname,
    ).toBe("localhost");
    expect(isAllowedLocalMastraDatabaseHost("::1")).toBe(true);
    expect(
      assertSafeMastraDatabaseUrl(
        "postgresql://postgres@supabase_db_ipixai:5432/postgres",
      ).hostname,
    ).toBe("supabase_db_ipixai");
    expect(
      assertSafeMastraDatabaseUrl("postgresql://postgres@db.local:5432/postgres")
        .hostname,
    ).toBe("db.local");
  });

  it("fails closed on hosted fashionos, RDS, Neon, and supabase.com poolers", () => {
    const rejected = [
      "postgresql://postgres:x@db.nvdlhrodvevgwdsneplk.supabase.co:5432/postgres",
      "postgresql://postgres:x@aws-0-us-east-1.pooler.supabase.com:6543/postgres",
      "postgresql://postgres:x@project.supabase.com:5432/postgres",
      "postgresql://postgres:x@my-db.cluster-xyz.us-east-1.rds.amazonaws.com:5432/postgres",
      "postgresql://postgres:x@ep-cool-name.us-east-1.aws.neon.tech:5432/neondb",
    ];
    for (const url of rejected) {
      expect(() => assertSafeMastraDatabaseUrl(url)).toThrow(/allowlist|refusing/);
    }
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
