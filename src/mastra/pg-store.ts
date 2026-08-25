import { createRequire } from "node:module";
import { PostgresStore } from "@mastra/pg";

const require = createRequire(import.meta.url);
const { Pool } = require("pg") as {
  Pool: new (config: { connectionString: string; max: number }) => PostgresStore["pool"];
};

declare global {
  // ponytail: Next HMR otherwise opens extra pools; ceiling is one process-wide Pool.
  var __ipixMastraPgPool: PostgresStore["pool"] | undefined;
  var __ipixMastraPgStore: PostgresStore | undefined;
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
    host === "supabase_db_ipixai" ||
    host.endsWith(".local")
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
  if (!isAllowedLocalMastraDatabaseHost(parsed.hostname)) {
    throw new Error(
      "MASTRA_DATABASE_URL host is not on the local allowlist; refusing to connect",
    );
  }
  return parsed;
}

export function getMastraPgPool(connectionString: string): PostgresStore["pool"] {
  assertSafeMastraDatabaseUrl(connectionString);
  if (!globalThis.__ipixMastraPgPool) {
    globalThis.__ipixMastraPgPool = new Pool({
      connectionString,
      max: 8,
    });
  }
  return globalThis.__ipixMastraPgPool;
}

export function getMastraPostgresStore(connectionString: string): PostgresStore {
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
