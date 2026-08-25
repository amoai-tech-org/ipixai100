import { createRequire } from "node:module";
import { PostgresStore } from "@mastra/pg";

const require = createRequire(import.meta.url);
const { Pool } = require("pg") as {
  Pool: new (config: { connectionString: string; max: number }) => PostgresStore["pool"];
};

const PRODUCTION_HOST_MARKERS = [
  "nvdlhrodvevgwdsneplk",
  "db.nvdlhrodvevgwdsneplk.supabase.co",
];

declare global {
  // ponytail: Next HMR otherwise opens extra pools; ceiling is one process-wide Pool.
  var __ipixMastraPgPool: PostgresStore["pool"] | undefined;
  var __ipixMastraPgStore: PostgresStore | undefined;
}

export function assertSafeMastraDatabaseUrl(url: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("MASTRA_DATABASE_URL is not a valid URL");
  }
  const host = parsed.hostname.toLowerCase();
  if (PRODUCTION_HOST_MARKERS.some((m) => url.includes(m) || host.includes(m))) {
    throw new Error("MASTRA_DATABASE_URL points at hosted fashionos; refusing to connect");
  }
  const local =
    host === "127.0.0.1" ||
    host === "localhost" ||
    host === "supabase_db_ipixai" ||
    host.endsWith(".local");
  if (!local && host.includes("supabase.co")) {
    throw new Error("MASTRA_DATABASE_URL points at hosted Supabase; refusing to connect");
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
