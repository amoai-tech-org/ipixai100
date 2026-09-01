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

const HOSTED_MISSING_URL =
  "IPIX_MASTRA_HOSTED requires MASTRA_DATABASE_URL; refusing in-memory storage";

/** Existing fashionos project — the only hosted Mastra memory cabinet. */
export const APPROVED_MASTRA_PROJECT_REF = "nvdlhrodvevgwdsneplk";
export const APPROVED_MASTRA_DIRECT_HOST =
  `db.${APPROVED_MASTRA_PROJECT_REF}.supabase.co`;
export const APPROVED_MASTRA_RUNTIME_ROLE = "hyperdrive_mastra_runtime";
export const HOSTED_MASTRA_POOL_MAX = 1;
export const LOCAL_MASTRA_POOL_MAX = 8;

const GENERIC_HOSTED_REJECT =
  "MASTRA_DATABASE_URL is not the approved iPix Mastra Postgres project; refusing to connect";

export function isMastraHostedRuntime(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const raw = env.IPIX_MASTRA_HOSTED?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

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

function isApprovedPoolerHostname(hostname: string): boolean {
  return hostname.toLowerCase().endsWith(".pooler.supabase.com");
}

function connectionUsername(parsed: URL): string {
  try {
    return decodeURIComponent(parsed.username);
  } catch {
    return parsed.username;
  }
}

function isApprovedHostedMastraUrl(parsed: URL): boolean {
  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const user = connectionUsername(parsed);
  const userBase = user.split(".")[0] ?? "";
  if (userBase === "postgres" || user.toLowerCase().includes("service_role")) {
    return false;
  }

  const expectedPoolerUser = `${APPROVED_MASTRA_RUNTIME_ROLE}.${APPROVED_MASTRA_PROJECT_REF}`;

  if (host === APPROVED_MASTRA_DIRECT_HOST) {
    return user === APPROVED_MASTRA_RUNTIME_ROLE || user === expectedPoolerUser;
  }

  if (isApprovedPoolerHostname(host)) {
    return user === expectedPoolerUser;
  }

  return false;
}

export function warnIfMastraDatabaseUrlMissing(url: string | undefined): void {
  if (url) return;
  if (globalThis.__ipixMastraMissingUrlWarned) return;
  globalThis.__ipixMastraMissingUrlWarned = true;
  console.warn(MISSING_URL_WARNING);
}

function assertPostgresUrl(url: string): URL {
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
  const queryKeys = new Set(
    [...parsed.searchParams.keys()].map((key) => key.toLowerCase()),
  );
  if (queryKeys.has("host") || queryKeys.has("hostaddr") || queryKeys.has("socket")) {
    throw new Error(
      "MASTRA_DATABASE_URL must not set host/hostaddr/socket query params; refusing to connect",
    );
  }
  return parsed;
}

export function assertSafeMastraDatabaseUrl(
  url: string,
  options?: { hosted?: boolean },
): URL {
  const parsed = assertPostgresUrl(url);
  const hosted = options?.hosted ?? isMastraHostedRuntime();
  if (hosted) {
    if (!isApprovedHostedMastraUrl(parsed)) {
      throw new Error(GENERIC_HOSTED_REJECT);
    }
    return parsed;
  }
  if (!isAllowedLocalMastraDatabaseHost(parsed.hostname)) {
    throw new Error(
      "MASTRA_DATABASE_URL host is not on the local allowlist; refusing to connect",
    );
  }
  return parsed;
}

/**
 * Local: missing URL is LibSQL. Hosted: missing or unapproved URL throws.
 * Never returns a URL that failed the guard.
 */
export function requireMastraPostgresUrl(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const hosted = isMastraHostedRuntime(env);
  const url = env.MASTRA_DATABASE_URL;
  if (hosted) {
    if (!url?.trim()) {
      throw new Error(HOSTED_MISSING_URL);
    }
    assertSafeMastraDatabaseUrl(url, { hosted: true });
    return url;
  }
  warnIfMastraDatabaseUrlMissing(url);
  if (!url) return undefined;
  assertSafeMastraDatabaseUrl(url, { hosted: false });
  return url;
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
    const hosted = isMastraHostedRuntime();
    const pool = new Pool({
      connectionString,
      max: hosted ? HOSTED_MASTRA_POOL_MAX : LOCAL_MASTRA_POOL_MAX,
      ...(hosted ? { ssl: { rejectUnauthorized: true } } : {}),
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
