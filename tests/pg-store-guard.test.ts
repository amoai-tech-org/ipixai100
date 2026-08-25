import { afterAll, describe, expect, it } from "vitest";
import {
  assertSafeMastraDatabaseUrl,
  getMastraPgPool,
  getMastraPostgresStore,
  isAllowedLocalMastraDatabaseHost,
  MASTRA_SCHEMA_FINGERPRINT_SQL,
  resetMastraPgSingletonsForTests,
} from "../src/mastra/pg-store";

describe("IPI-1044 local URL guard", () => {
  afterAll(async () => {
    await resetMastraPgSingletonsForTests();
  });

  it("allows local Docker Postgres", () => {
    const parsed = assertSafeMastraDatabaseUrl(
      "postgresql://postgres:postgres@127.0.0.1:54342/postgres",
    );
    expect(parsed.hostname).toBe("127.0.0.1");
    expect(parsed.port).toBe("54342");
  });

  it("allows localhost, ::1, and the local Docker db hostname", () => {
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
    expect(isAllowedLocalMastraDatabaseHost("db.local")).toBe(false);
  });

  it("fails closed on non-postgres URL schemes", () => {
    expect(() =>
      assertSafeMastraDatabaseUrl("http://127.0.0.1:54342/postgres"),
    ).toThrow(/postgres: or postgresql:/);
    expect(() =>
      assertSafeMastraDatabaseUrl("postgresql://postgres@127.0.0.1:54342/postgres"),
    ).not.toThrow();
    expect(() =>
      assertSafeMastraDatabaseUrl("postgres://postgres@127.0.0.1:54342/postgres"),
    ).not.toThrow();
  });

  it("fails closed when host/hostaddr/socket query params would override the authority", () => {
    expect(() =>
      assertSafeMastraDatabaseUrl(
        "postgresql://postgres:pw@127.0.0.1:54342/postgres?host=db.prod.example.com",
      ),
    ).toThrow(/host\/hostaddr\/socket/);
    expect(() =>
      assertSafeMastraDatabaseUrl(
        "postgresql://postgres:pw@127.0.0.1:54342/postgres?hostaddr=8.8.8.8",
      ),
    ).toThrow(/host\/hostaddr\/socket/);
    expect(() =>
      assertSafeMastraDatabaseUrl(
        "postgresql://postgres:pw@127.0.0.1:54342/postgres?HOST=db.prod.example.com",
      ),
    ).toThrow(/host\/hostaddr\/socket/);
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

  it.skipIf(!process.env.MASTRA_DATABASE_URL)(
    "reuses one bounded pool for concurrent local queries",
    async () => {
      const url = process.env.MASTRA_DATABASE_URL!;
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
    },
  );

  it("throws if the singleton is reused with a different connection string", async () => {
    await resetMastraPgSingletonsForTests();
    const first =
      process.env.MASTRA_DATABASE_URL ??
      "postgresql://postgres:postgres@127.0.0.1:54342/postgres";
    const second = first.includes("@localhost")
      ? "postgresql://postgres:postgres@127.0.0.1:54342/postgres"
      : "postgresql://postgres:postgres@localhost:54342/postgres";
    getMastraPgPool(first);
    expect(() => getMastraPgPool(second)).toThrow(/refusing to reuse the singleton/);
    expect(() => getMastraPostgresStore(second)).toThrow(
      /refusing to reuse the singleton/,
    );
  });

  it("fingerprints mastra function and trigger catalogs", () => {
    expect(MASTRA_SCHEMA_FINGERPRINT_SQL).toMatch(/pg_get_functiondef/);
    expect(MASTRA_SCHEMA_FINGERPRINT_SQL).toMatch(/pg_get_triggerdef/);
    expect(MASTRA_SCHEMA_FINGERPRINT_SQL).not.toMatch(/proname = 'trigger_set_timestamps'/);
  });
});
