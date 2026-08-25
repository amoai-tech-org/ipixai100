import { Pool } from "pg";
import { PostgresStore } from "@mastra/pg";

declare global {
  // ponytail: Next HMR otherwise opens extra pools; ceiling is one process-wide Pool.
  var __ipixMastraPgPool: PostgresStore["pool"] | undefined;
  var __ipixMastraPgStore: PostgresStore | undefined;
  var __ipixMastraPgConnectionString: string | undefined;
  var __ipixMastraMissingUrlWarned: boolean | undefined;
}

const MISSING_URL_WARNING =
  "MASTRA_DATABASE_URL is unset; Planner threads use in-memory LibSQL and will not survive restart. Copy MASTRA_DATABASE_URL from .env.example (local Docker only).";

export function isAllowedLocalMastraDatabaseHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host) return false;
  return (
    host === "127.0.0.1" ||
    host === "localhost" ||
    host === "::1" ||
    host === "supabase_db_ipixai"
  );
}

export function warnIfMastraDatabaseUrlMissing(url: string | undefined): void {
  if (url) return;
  if (globalThis.__ipixMastraMissingUrlWarned) return;
  globalThis.__ipixMastraMissingUrlWarned = true;
  console.warn(MISSING_URL_WARNING);
}

export function assertSafeMastraDatabaseUrl(url: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("MASTRA_DATABASE_URL is not a valid URL");
  }
  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new Error(
      "MASTRA_DATABASE_URL must use postgres: or postgresql:; refusing to connect",
    );
  }
  // pg-connection-string lets host=/hostaddr= override the URL authority.
  const queryKeys = new Set(
    [...parsed.searchParams.keys()].map((key) => key.toLowerCase()),
  );
  if (queryKeys.has("host") || queryKeys.has("hostaddr") || queryKeys.has("socket")) {
    throw new Error(
      "MASTRA_DATABASE_URL must not set host/hostaddr/socket query params; refusing to connect",
    );
  }
  if (!isAllowedLocalMastraDatabaseHost(parsed.hostname)) {
    throw new Error(
      "MASTRA_DATABASE_URL host is not on the local allowlist; refusing to connect",
    );
  }
  return parsed;
}

export async function resetMastraPgSingletonsForTests(): Promise<void> {
  const pool = globalThis.__ipixMastraPgPool;
  globalThis.__ipixMastraPgPool = undefined;
  globalThis.__ipixMastraPgStore = undefined;
  globalThis.__ipixMastraPgConnectionString = undefined;
  if (pool) await pool.end();
}

function assertSameMastraConnectionString(connectionString: string): void {
  const existing = globalThis.__ipixMastraPgConnectionString;
  if (existing && existing !== connectionString) {
    throw new Error(
      "MASTRA_DATABASE_URL changed after the Mastra pool was created; refusing to reuse the singleton",
    );
  }
}

export function getMastraPgPool(connectionString: string): PostgresStore["pool"] {
  assertSafeMastraDatabaseUrl(connectionString);
  assertSameMastraConnectionString(connectionString);
  if (!globalThis.__ipixMastraPgPool) {
    const pool = new Pool({
      connectionString,
      max: 8,
    });
    pool.on("error", (err: Error) => {
      console.error("Mastra pg pool idle client error", err);
    });
    globalThis.__ipixMastraPgPool = pool;
    globalThis.__ipixMastraPgConnectionString = connectionString;
  }
  return globalThis.__ipixMastraPgPool;
}

export function getMastraPostgresStore(connectionString: string): PostgresStore {
  assertSameMastraConnectionString(connectionString);
  if (!globalThis.__ipixMastraPgStore) {
    const pool = getMastraPgPool(connectionString);
    globalThis.__ipixMastraPgStore = new PostgresStore({
      id: "ipix-mastra-storage",
      pool,
      schemaName: "mastra",
      disableInit: true,
    });
  }
  return globalThis.__ipixMastraPgStore;
}
