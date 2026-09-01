/**
 * Hosted PG proof (IPI-1124): synthetic TEST-<uuid> thread on fashionos mastra.
 * Does not print connection strings or passwords.
 *
 *   IPIX_MASTRA_HOSTED=1 MASTRA_DATABASE_URL='<dashboard uri>' npx tsx scripts/host-pg-001-proof.mjs
 *
 * Transaction pooler (6543) first. Session (5432) only if this script records
 * a prepared-statement / session-mode failure.
 */
import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { MASTRA_SCHEMA_FINGERPRINT_SQL } from "./mastra-schema-fingerprint.ts";
import {
  getMastraPostgresStore,
  requireMastraPostgresUrl,
  resetMastraPgSingletonsForTests,
} from "../src/mastra/pg-store.ts";

function redactError(err) {
  const raw = err instanceof Error ? err.message : String(err);
  return raw.replace(/:[^:@/]+@/g, ":redacted@");
}

async function fingerprint(pool) {
  const cols = await pool.query(MASTRA_SCHEMA_FINGERPRINT_SQL);
  return createHash("sha256").update(String(cols.rows[0].fp)).digest("hex");
}

async function idSet(pool, table) {
  const { rows } = await pool.query(`SELECT id FROM mastra.${table}`);
  return new Set(rows.map((r) => r.id));
}

async function snapshotIds(pool) {
  const [threads, messages, snapshots] = await Promise.all([
    idSet(pool, "mastra_threads"),
    idSet(pool, "mastra_messages"),
    pool.query(
      "SELECT workflow_name, run_id FROM mastra.mastra_workflow_snapshot",
    ),
  ]);
  const snapshotKeys = new Set(
    snapshots.rows.map((r) => `${r.workflow_name}\0${r.run_id}`),
  );
  return { threads, messages, snapshotKeys };
}

function assertUnchanged(before, after, added) {
  for (const id of before) {
    if (!after.has(id)) throw new Error("pre-existing id disappeared");
  }
  for (const id of after) {
    if (!before.has(id) && !added.has(id)) {
      throw new Error("unexpected new id outside TEST namespace");
    }
  }
}

async function withLiveStore(fn) {
  const url = requireMastraPostgresUrl();
  if (!url) throw new Error("hosted proof requires MASTRA_DATABASE_URL");
  await resetMastraPgSingletonsForTests();
  const store = getMastraPostgresStore(url);
  const livePool = store.pool;
  if (!livePool) throw new Error("PostgresStore pool missing");
  try {
    return await fn(store, livePool);
  } finally {
    await resetMastraPgSingletonsForTests();
  }
}

async function runtimeProof(store, pool) {
  const ssl = await pool.query(
    "SELECT ssl, pg_backend_pid() AS pid FROM pg_stat_ssl WHERE pid = pg_backend_pid()",
  );
  const who = await pool.query("SELECT current_user AS u, current_schema AS s");
  return {
    ssl: Boolean(ssl.rows[0]?.ssl),
    role: who.rows[0].u,
    schemaSearch: who.rows[0].s,
    storeSchema: store.schema,
    disableInit: store.disableInit,
  };
}

async function writePhase(ids) {
  return withLiveStore(async (store, pool) => {
    const beforeFp = await fingerprint(pool);
    const beforeIds = await snapshotIds(pool);
    const runtime = await runtimeProof(store, pool);
    if (!runtime.ssl) throw new Error("connection is not SSL");
    if (runtime.role !== "hyperdrive_mastra_runtime") {
      throw new Error("connected role is not hyperdrive_mastra_runtime");
    }
    if (runtime.storeSchema !== "mastra" || runtime.disableInit !== true) {
      throw new Error("store must use schema mastra and disableInit true");
    }

    const memory = await store.getStore("memory");
    if (!memory) throw new Error("memory store missing");
    const now = new Date();
    await memory.saveThread({
      thread: {
        id: ids.threadId,
        resourceId: ids.resourceId,
        title: "SS26 shot list — hosted PG-001 proof",
        createdAt: now,
        updatedAt: now,
        metadata: { campaign: "SS26", proof: "IPI-1124" },
      },
    });
    await memory.saveMessages({
      messages: [
        {
          id: ids.messageId,
          threadId: ids.threadId,
          resourceId: ids.resourceId,
          role: "user",
          createdAt: now,
          content: {
            format: 2,
            parts: [{ type: "text", text: "Keep the 12-look SS26 shot list after recycle" }],
            content: "Keep the 12-look SS26 shot list after recycle",
          },
        },
      ],
    });

    const afterFp = await fingerprint(pool);
    if (beforeFp !== afterFp) throw new Error("schema fingerprint changed (DDL?)");
    const afterIds = await snapshotIds(pool);
    assertUnchanged(beforeIds.threads, afterIds.threads, new Set([ids.threadId]));
    assertUnchanged(beforeIds.messages, afterIds.messages, new Set([ids.messageId]));
    assertUnchanged(beforeIds.snapshotKeys, afterIds.snapshotKeys, new Set());
    return { fingerprint: beforeFp, pid: process.pid, runtime };
  });
}

async function readPhase(ids, expectedFingerprint) {
  return withLiveStore(async (store, pool) => {
    const fp = await fingerprint(pool);
    if (fp !== expectedFingerprint) throw new Error("schema fingerprint changed after restart");
    const memory = await store.getStore("memory");
    const thread = await memory.getThreadById({ threadId: ids.threadId });
    if (!thread || thread.id !== ids.threadId) throw new Error("thread missing after restart");
    const listed = await memory.listMessages({
      threadId: ids.threadId,
      perPage: 20,
      orderBy: { field: "createdAt", direction: "ASC" },
    });
    const messages = listed.messages ?? listed;
    if (messages.length !== 1 || messages[0].id !== ids.messageId) {
      throw new Error("synthetic message missing after restart");
    }
    return { pid: process.pid, threadId: thread.id, messageId: messages[0].id };
  });
}

async function cleanupPhase(ids) {
  return withLiveStore(async (_store, pool) => {
    await pool.query("DELETE FROM mastra.mastra_messages WHERE id = $1", [ids.messageId]);
    await pool.query("DELETE FROM mastra.mastra_threads WHERE id = $1", [ids.threadId]);
  });
}

function proofIds(nonce) {
  return {
    resourceId: `TEST-${nonce}`,
    threadId: `TEST-${nonce}-thread`,
    messageId: `TEST-${nonce}-msg`,
  };
}

const phase = process.argv[2] ?? "parent";

try {
  if (process.env.IPIX_MASTRA_HOSTED !== "1") {
    throw new Error("IPIX_MASTRA_HOSTED=1 required for hosted proof");
  }
  if (phase === "write") {
    const nonce = process.argv[3];
    const written = await writePhase(proofIds(nonce));
    console.log(
      "WRITE_OK",
      JSON.stringify({
        pid: written.pid,
        fingerprint: written.fingerprint,
        ssl: written.runtime.ssl,
        role: written.runtime.role,
      }),
    );
  } else if (phase === "read") {
    const expected = process.argv[3];
    const nonce = process.argv[4];
    const read = await readPhase(proofIds(nonce), expected);
    console.log("READ_OK", JSON.stringify(read));
  } else if (phase === "cleanup") {
    await cleanupPhase(proofIds(process.argv[3]));
    console.log("CLEANUP_OK");
  } else {
    const script = fileURLToPath(import.meta.url);
    const nonce = randomUUID();
    const write = spawnSync("npx", ["tsx", script, "write", nonce], {
      env: process.env,
      encoding: "utf8",
    });
    if (write.status !== 0) {
      console.error(redactError(write.stderr || write.stdout));
      process.exit(write.status ?? 1);
    }
    const line = write.stdout.trim().split("\n").at(-1);
    const payload = JSON.parse(line.replace(/^WRITE_OK\s/, ""));
    const read = spawnSync("npx", ["tsx", script, "read", payload.fingerprint, nonce], {
      env: process.env,
      encoding: "utf8",
    });
    if (read.status !== 0) {
      console.error(redactError(read.stderr || read.stdout));
      process.exit(read.status ?? 1);
    }
    const readLine = read.stdout.trim().split("\n").at(-1);
    const readPayload = JSON.parse(readLine.replace(/^READ_OK\s/, ""));
    if (readPayload.pid === payload.pid) {
      throw new Error("expected a new PID for the read process");
    }
    console.log(
      "PASS hosted persistence",
      JSON.stringify({
        writePid: payload.pid,
        readPid: readPayload.pid,
        threadId: readPayload.threadId,
        messageId: readPayload.messageId,
        ssl: payload.ssl,
        role: payload.role,
        fingerprintUnchanged: true,
        namespace: "TEST-",
      }),
    );
    if (!process.argv.includes("--keep")) {
      const cleanup = spawnSync("npx", ["tsx", script, "cleanup", nonce], {
        env: process.env,
        encoding: "utf8",
      });
      if (cleanup.status !== 0) {
        console.error(redactError(cleanup.stderr || cleanup.stdout));
        process.exit(cleanup.status ?? 1);
      }
    }
  }
} catch (err) {
  console.error(redactError(err));
  process.exit(1);
}
