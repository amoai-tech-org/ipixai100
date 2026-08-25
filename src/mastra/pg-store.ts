import { Pool } from "pg";
import { PostgresStore } from "@mastra/pg";

declare global {
  // ponytail: Next HMR otherwise opens extra pools; ceiling is one process-wide Pool.
  var __ipixMastraPgPool: PostgresStore["pool"] | undefined;
  var __ipixMastraPgStore: PostgresStore | undefined;
  var __ipixMastraPgConnectionString: string | undefined;
}

const MISSING_URL_WARNING =
  "MASTRA_DATABASE_URL is unset; Planner threads use in-memory LibSQL and will not survive restart. Copy MASTRA_DATABASE_URL from .env.example (local Docker only).";

let missingUrlWarned = false;

/** Full mastra-schema catalog used to prove disableInit did not run DDL. */
export const MASTRA_SCHEMA_FINGERPRINT_SQL = `
SELECT json_build_object(
  'tables', (
    SELECT coalesce(json_agg(json_build_object(
      'name', table_name,
      'type', table_type
    ) ORDER BY table_name), '[]'::json)
    FROM information_schema.tables
    WHERE table_schema = 'mastra'
  ),
  'columns', (
    SELECT coalesce(json_agg(json_build_object(
      'table', table_name,
      'column', column_name,
      'data_type', data_type,
      'udt', udt_name,
      'nullable', is_nullable,
      'default', column_default,
      'char_max', character_maximum_length,
      'numeric_precision', numeric_precision,
      'datetime_precision', datetime_precision,
      'ordinal', ordinal_position
    ) ORDER BY table_name, ordinal_position), '[]'::json)
    FROM information_schema.columns
    WHERE table_schema = 'mastra'
  ),
  'constraints', (
    SELECT coalesce(json_agg(json_build_object(
      'name', tc.constraint_name,
      'table', tc.table_name,
      'type', tc.constraint_type
    ) ORDER BY tc.table_name, tc.constraint_name), '[]'::json)
    FROM information_schema.table_constraints tc
    WHERE tc.table_schema = 'mastra'
  ),
  'indexes', (
    SELECT coalesce(json_agg(json_build_object(
      'name', indexname,
      'table', tablename,
      'def', indexdef
    ) ORDER BY tablename, indexname), '[]'::json)
    FROM pg_indexes
    WHERE schemaname = 'mastra'
  ),
  'policies', (
    SELECT coalesce(json_agg(json_build_object(
      'schema', schemaname,
      'table', tablename,
      'name', policyname,
      'permissive', permissive,
      'roles', roles,
      'cmd', cmd,
      'qual', qual,
      'with_check', with_check
    ) ORDER BY tablename, policyname), '[]'::json)
    FROM pg_policies
    WHERE schemaname = 'mastra'
  ),
  'grants', (
    SELECT coalesce(json_agg(json_build_object(
      'grantee', grantee,
      'table', table_name,
      'privilege', privilege_type,
      'is_grantable', is_grantable
    ) ORDER BY table_name, grantee, privilege_type), '[]'::json)
    FROM information_schema.role_table_grants
    WHERE table_schema = 'mastra'
  ),
  'functions', (
    SELECT coalesce(json_agg(json_build_object(
      'schema', n.nspname,
      'name', p.proname,
      'identity', pg_get_function_identity_arguments(p.oid),
      'language', l.lanname,
      'volatile', p.provolatile,
      'def', pg_get_functiondef(p.oid)
    ) ORDER BY n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)), '[]'::json)
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    JOIN pg_language l ON l.oid = p.prolang
    WHERE n.nspname = 'mastra'
  ),
  'triggers', (
    SELECT coalesce(json_agg(json_build_object(
      'schema', n.nspname,
      'table', c.relname,
      'name', t.tgname,
      'enabled', t.tgenabled,
      'type', t.tgtype,
      'def', pg_get_triggerdef(t.oid)
    ) ORDER BY c.relname, t.tgname), '[]'::json)
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'mastra'
      AND NOT t.tgisinternal
  )
)::text AS fp
`;

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
  if (missingUrlWarned) return;
  missingUrlWarned = true;
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
      console.error("Mastra pg pool idle client error", err.message);
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
