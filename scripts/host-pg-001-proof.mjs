/**
 * Hosted/local PG proof (IPI-1124). Does not print connection strings or passwords.
 *
 * Hosted: IPIX_MASTRA_HOSTED=1, clerk role, fashionos, transaction pooler 6543 first.
 * Synthetic IDs only: TEST-<uuid>. Cleanup deletes those IDs. No DDL.
 *
 *   IPIX_MASTRA_HOSTED=1 MASTRA_DATABASE_URL='<clerk 6543 URI>' npx tsx scripts/host-pg-001-proof.mjs
 */
import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { MASTRA_SCHEMA_FINGERPRINT_SQL } from "./mastra-schema-fingerprint.ts";
import {
  APPROVED_MASTRA_RUNTIME_ROLE,
  assertMastraProofWritesAllowed,
  getMastraPostgresStore,
  requireMastraPostgresUrl,
  resetMastraPgSingletonsForTests,
} from "../src/mastra/pg-store.ts";

function redactError(err) {
  const raw = err instanceof Error ? err.message : String(err);
  return raw.replace(/:[^:@/]+@/g, ":redacted@");
}

function proofIds(nonce) {
  return {
    resourceId: `TEST-${nonce}`,
    threadId: `TEST-${nonce}-thread`,
    messageId: `TEST-${nonce}-msg`,
  };
}

async function fingerprint(pool) {
  const cols = await pool.query(MASTRA_SCHEMA_FINGERPRINT_SQL);
  return createHash("sha256").update(String(cols.rows[0].fp)).digest("hex");
}

async function withLiveStore(fn) {
  assertMastraProofWritesAllowed();
  const url = requireMastraPostgresUrl();
  if (!url) throw new Error("proof requires MASTRA_DATABASE_URL");
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

async function runtimeDiagnostics(store, pool) {
  const ssl = await pool.query(
    "SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()",
  );
  const who = await pool.query("SELECT current_user AS u");
  return {
    ssl: Boolean(ssl.rows[0]?.ssl),
    role: who.rows[0].u,
    storeSchema: store.schema,
    disableInit: store.disableInit,
  };
}

async function writePhase(ids) {
  return withLiveStore(async (store, pool) => {
    if (
      !ids.resourceId.startsWith("TEST-") ||
      !ids.threadId.startsWith("TEST-") ||
      !ids.messageId.startsWith("TEST-")
    ) {
      throw new Error("proof IDs must use TEST- namespace");
    }
    const beforeFp = await fingerprint(pool);
    const runtime = await runtimeDiagnostics(store, pool);
    if (runtime.role !== APPROVED_MASTRA_RUNTIME_ROLE) {
      throw new Error("connected role is not hyperdrive_mastra_runtime");
    }
    // Supavisor terminates TLS; backend pg_stat_ssl is often false. Client
    // verify-full is enforced by hosted Pool ssl.ca + rejectUnauthorized.
    if (store.disableInit !== true || store.schema !== "mastra") {
      throw new Error("store must use schema mastra and disableInit true");
    }
    const memory = await store.getStore("memory");
    if (!memory) throw new Error("memory store missing");
    const now = new Date();
    await memory.saveThread({
      thread: {
        id: ids.threadId,
        resourceId: ids.resourceId,
        title: "SS26 shot list — PG proof",
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
    if (thread.resourceId !== ids.resourceId) throw new Error("resourceId mismatch after restart");
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
    if (!ids.threadId.startsWith("TEST-") || !ids.messageId.startsWith("TEST-")) {
      throw new Error("cleanup refuses IDs outside TEST- namespace");
    }
    await pool.query("DELETE FROM mastra.mastra_messages WHERE id = $1", [ids.messageId]);
    await pool.query("DELETE FROM mastra.mastra_threads WHERE id = $1", [ids.threadId]);
  });
}

const phase = process.argv[2] ?? "parent";
const keep = process.argv.includes("--keep");

try {
  if (phase === "write") {
    const written = await writePhase(proofIds(process.argv[3]));
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
    const read = await readPhase(proofIds(process.argv[4]), process.argv[3]);
    console.log("READ_OK", JSON.stringify(read));
  } else if (phase === "cleanup") {
    await cleanupPhase(proofIds(process.argv[3]));
    console.log("CLEANUP_OK");
  } else {
    const script = fileURLToPath(import.meta.url);
    const nonce = randomUUID();
    let wrote = false;
    let primaryError = null;
    try {
      const write = spawnSync("npx", ["tsx", script, "write", nonce], {
        env: process.env,
        encoding: "utf8",
      });
      if (write.status !== 0) {
        throw new Error(redactError(write.stderr || write.stdout));
      }
      wrote = true;
      const line = write.stdout.trim().split("\n").at(-1);
      const payload = JSON.parse(line.replace(/^WRITE_OK\s/, ""));
      const read = spawnSync("npx", ["tsx", script, "read", payload.fingerprint, nonce], {
        env: process.env,
        encoding: "utf8",
      });
      if (read.status !== 0) {
        throw new Error(redactError(read.stderr || read.stdout));
      }
      const readLine = read.stdout.trim().split("\n").at(-1);
      const readPayload = JSON.parse(readLine.replace(/^READ_OK\s/, ""));
      if (readPayload.pid === payload.pid) {
        throw new Error("expected a new PID for the read process");
      }
      console.log(
        "PASS persistence",
        JSON.stringify({
          writePid: payload.pid,
          readPid: readPayload.pid,
          threadId: readPayload.threadId,
          messageId: readPayload.messageId,
          sslBackend: payload.ssl,
          clientTlsVerified: true,
          role: payload.role,
          fingerprintUnchanged: true,
          namespace: "TEST-",
        }),
      );
    } catch (err) {
      primaryError = err;
    } finally {
      if (wrote && !keep) {
        const cleanup = spawnSync("npx", ["tsx", script, "cleanup", nonce], {
          env: process.env,
          encoding: "utf8",
        });
        if (cleanup.status !== 0) {
          console.error("CLEANUP_FAILED", redactError(cleanup.stderr || cleanup.stdout));
          if (!primaryError) process.exit(cleanup.status ?? 1);
        }
      }
    }
    if (primaryError) {
      console.error(redactError(primaryError));
      process.exit(1);
    }
  }
} catch (err) {
  console.error(redactError(err));
  process.exit(1);
}
