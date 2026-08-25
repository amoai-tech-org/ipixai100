/**
 * Local-only PG-001 proof: write a synthetic SS26 thread, kill this PID's
 * store usage, read from a new process. Does not print secrets.
 */
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { PostgresStore } from "@mastra/pg";
import { Pool } from "pg";

const PRODUCTION_MARKERS = ["nvdlhrodvevgwdsneplk"];

function assertSafeUrl(url) {
  const parsed = new URL(url);
  if (PRODUCTION_MARKERS.some((m) => url.includes(m))) {
    throw new Error("refusing hosted fashionos URL");
  }
  const host = parsed.hostname;
  if (
    host !== "127.0.0.1" &&
    host !== "localhost" &&
    host !== "supabase_db_ipixai" &&
    parsed.hostname.includes("supabase.co")
  ) {
    throw new Error("refusing hosted Supabase URL");
  }
}

const FINGERPRINT_SQL = `
SELECT json_agg(row_to_json(t) ORDER BY table_name, column_name)::text AS fp
FROM (
  SELECT c.table_name, c.column_name, c.data_type, c.is_nullable
  FROM information_schema.columns c
  WHERE c.table_schema = 'mastra'
    AND c.table_name IN ('mastra_threads','mastra_messages','mastra_resources','mastra_workflow_snapshot')
) t
`;

const INDEX_SQL = `
SELECT json_agg(indexname ORDER BY indexname)::text
FROM pg_indexes
WHERE schemaname = 'mastra'
  AND tablename IN ('mastra_threads','mastra_messages','mastra_workflow_snapshot')
`;

async function fingerprint(pool) {
  const cols = await pool.query(FINGERPRINT_SQL);
  const idx = await pool.query(INDEX_SQL);
  const raw = `${cols.rows[0].fp}|${idx.rows[0].json_agg}`;
  return createHash("sha256").update(raw).digest("hex");
}

async function withStore(url, fn) {
  assertSafeUrl(url);
  const pool = new Pool({ connectionString: url, max: 4 });
  const store = new PostgresStore({
    id: "ipix-mastra-storage-proof",
    pool,
    schemaName: "mastra",
    disableInit: true,
  });
  try {
    return await fn(store, pool);
  } finally {
    await pool.end();
  }
}

async function writePhase(url, ids) {
  return withStore(url, async (store, pool) => {
    const before = await fingerprint(pool);
    const memory = await store.getStore("memory");
    if (!memory) throw new Error("memory store missing");
    await pool.query("DELETE FROM mastra.mastra_messages WHERE thread_id = $1", [
      ids.threadId,
    ]);
    await pool.query("DELETE FROM mastra.mastra_threads WHERE id = $1", [ids.threadId]);
    const now = new Date();
    await memory.saveThread({
      thread: {
        id: ids.threadId,
        resourceId: ids.resourceId,
        title: "SS26 shot list — local PG-001 proof",
        createdAt: now,
        updatedAt: now,
        metadata: { campaign: "SS26", proof: "IPI-1044" },
      },
    });
    await memory.saveMessages({
      messages: [
        {
          id: ids.msg1,
          threadId: ids.threadId,
          resourceId: ids.resourceId,
          role: "user",
          createdAt: new Date(now.getTime()),
          content: {
            format: 2,
            parts: [{ type: "text", text: "Keep the 12-look SS26 shot list" }],
            content: "Keep the 12-look SS26 shot list",
          },
        },
        {
          id: ids.msg2,
          threadId: ids.threadId,
          resourceId: ids.resourceId,
          role: "assistant",
          createdAt: new Date(now.getTime() + 1000),
          content: {
            format: 2,
            parts: [{ type: "text", text: "Added second studio day after look 12" }],
            content: "Added second studio day after look 12",
          },
        },
      ],
    });
    const after = await fingerprint(pool);
    if (before !== after) {
      throw new Error("schema fingerprint changed during write (DDL?)");
    }
    return { fingerprint: before, pid: process.pid };
  });
}

async function readPhase(url, ids, expectedFingerprint) {
  return withStore(url, async (store, pool) => {
    const fp = await fingerprint(pool);
    if (fp !== expectedFingerprint) {
      throw new Error("schema fingerprint changed after restart");
    }
    const memory = await store.getStore("memory");
    const thread = await memory.getThreadById({ threadId: ids.threadId });
    if (!thread || thread.id !== ids.threadId) {
      throw new Error("thread missing after restart");
    }
    const listed = await memory.listMessages({
      threadId: ids.threadId,
      perPage: 50,
      orderBy: { field: "createdAt", direction: "ASC" },
    });
    const messages = listed.messages ?? listed;
    const order = messages.map((m) => m.id);
    if (order[0] !== ids.msg1 || order[1] !== ids.msg2) {
      throw new Error(`message order mismatch: ${JSON.stringify(order)}`);
    }
    return { pid: process.pid, threadId: thread.id, order };
  });
}

const url = process.env.MASTRA_DATABASE_URL;
if (!url) {
  throw new Error("MASTRA_DATABASE_URL required (local Docker only)");
}

const ids = {
  resourceId: "resource-ss26-pg001-local",
  threadId: "thread-ss26-pg001-local",
  msg1: "msg-ss26-look-list",
  msg2: "msg-ss26-studio-day",
};

const phase = process.argv[2] ?? "parent";

if (phase === "write") {
  const written = await writePhase(url, ids);
  console.log("WRITE_OK", JSON.stringify({ pid: written.pid, fingerprint: written.fingerprint }));
} else if (phase === "read") {
  const expected = process.argv[3];
  if (!expected) throw new Error("read phase needs fingerprint arg");
  const read = await readPhase(url, ids, expected);
  console.log("READ_OK", JSON.stringify(read));
} else {
  const write = spawnSync(process.execPath, [process.argv[1], "write"], {
    env: process.env,
    encoding: "utf8",
  });
  if (write.status !== 0) {
    console.error(write.stderr || write.stdout);
    process.exit(write.status ?? 1);
  }
  const line = write.stdout.trim().split("\n").at(-1);
  const payload = JSON.parse(line.replace(/^WRITE_OK\s/, ""));
  const read = spawnSync(
    process.execPath,
    [process.argv[1], "read", payload.fingerprint],
    { env: process.env, encoding: "utf8" },
  );
  if (read.status !== 0) {
    console.error(read.stderr || read.stdout);
    process.exit(read.status ?? 1);
  }
  const readLine = read.stdout.trim().split("\n").at(-1);
  const readPayload = JSON.parse(readLine.replace(/^READ_OK\s/, ""));
  if (readPayload.pid === payload.pid) {
    throw new Error("expected a new PID for the read process");
  }
  console.log(
    "PASS restart persistence",
    JSON.stringify({
      writePid: payload.pid,
      readPid: readPayload.pid,
      threadId: readPayload.threadId,
      order: readPayload.order,
      fingerprintUnchanged: true,
    }),
  );
}
