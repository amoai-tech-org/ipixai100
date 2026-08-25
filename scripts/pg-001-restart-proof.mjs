/**
 * Local-only PG-001 proof: write a synthetic SS26 thread, kill this PID's
 * store usage, read from a new process. Does not print secrets.
 * Run: npx tsx scripts/pg-001-restart-proof.mjs
 * Pass --keep to leave the synthetic SS26 rows after a passing read.
 */
import { createHash, randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { PostgresStore } from "@mastra/pg";
import { Pool } from "pg";
import { assertSafeMastraDatabaseUrl } from "../src/mastra/pg-store.ts";
import { MASTRA_SCHEMA_FINGERPRINT_SQL } from "./mastra-schema-fingerprint.ts";

async function fingerprint(pool) {
  const cols = await pool.query(MASTRA_SCHEMA_FINGERPRINT_SQL);
  return createHash("sha256").update(String(cols.rows[0].fp)).digest("hex");
}

async function withStore(url, fn) {
  assertSafeMastraDatabaseUrl(url);
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

async function cleanupPhase(url, ids) {
  return withStore(url, async (_store, pool) => {
    await pool.query("DELETE FROM mastra.mastra_messages WHERE thread_id = $1", [
      ids.threadId,
    ]);
    await pool.query("DELETE FROM mastra.mastra_threads WHERE id = $1", [ids.threadId]);
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
    if (order.length !== 2 || order[0] !== ids.msg1 || order[1] !== ids.msg2) {
      throw new Error(`message order mismatch: ${JSON.stringify(order)}`);
    }
    return { pid: process.pid, threadId: thread.id, order };
  });
}

const url = process.env.MASTRA_DATABASE_URL;
if (!url) {
  throw new Error("MASTRA_DATABASE_URL required (local Docker only)");
}

function proofIds(nonce) {
  return {
    resourceId: `resource-ss26-pg001-local-${nonce}`,
    threadId: `thread-ss26-pg001-local-${nonce}`,
    msg1: `msg-ss26-look-list-${nonce}`,
    msg2: `msg-ss26-studio-day-${nonce}`,
  };
}

const phase = process.argv[2] ?? "parent";

if (phase === "write") {
  const nonce = process.argv[3];
  if (!nonce) throw new Error("write phase needs nonce arg");
  const written = await writePhase(url, proofIds(nonce));
  console.log("WRITE_OK", JSON.stringify({ pid: written.pid, fingerprint: written.fingerprint }));
} else if (phase === "read") {
  const expected = process.argv[3];
  const nonce = process.argv[4];
  if (!expected) throw new Error("read phase needs fingerprint arg");
  if (!nonce) throw new Error("read phase needs nonce arg");
  const read = await readPhase(url, proofIds(nonce), expected);
  console.log("READ_OK", JSON.stringify(read));
} else if (phase === "cleanup") {
  const nonce = process.argv[3];
  if (!nonce) throw new Error("cleanup phase needs nonce arg");
  await cleanupPhase(url, proofIds(nonce));
  console.log("CLEANUP_OK");
} else {
  const script = fileURLToPath(import.meta.url);
  const nonce = randomBytes(6).toString("hex");
  const write = spawnSync("npx", ["tsx", script, "write", nonce], {
    env: process.env,
    encoding: "utf8",
  });
  if (write.status !== 0) {
    console.error(write.stderr || write.stdout);
    process.exit(write.status ?? 1);
  }
  const line = write.stdout.trim().split("\n").at(-1);
  const payload = JSON.parse(line.replace(/^WRITE_OK\s/, ""));
  const read = spawnSync("npx", ["tsx", script, "read", payload.fingerprint, nonce], {
    env: process.env,
    encoding: "utf8",
  });
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
  if (!process.argv.includes("--keep")) {
    const cleanup = spawnSync("npx", ["tsx", script, "cleanup", nonce], {
      env: process.env,
      encoding: "utf8",
    });
    if (cleanup.status !== 0) {
      console.error(cleanup.stderr || cleanup.stdout);
      process.exit(cleanup.status ?? 1);
    }
  }
}
