# DB-001 — Mastra Postgres schema contract

**Ticket:** [IPI-1043 · DB-001 — Prove Mastra Can Use the iPix Postgres Schema Safely](https://linear.app/amo100/issue/IPI-1043/ipi-1043-db-001-prove-mastra-can-use-the-ipix-postgres-schema-safely)

**Date:** 2026-08-24  
**Git SSOT:** `origin/main` `1eb98f71cc9a70f5a2f583c8c31c0062e5bd3204` (worktree; dirty `/home/sk/ipixai` is not SSOT)

This file is the **MATCH / CHANGE / MISSING** contract. It does **not** wire `PostgresStore`, call `init()`, or write Postgres.

---

## Verdict (plain English)

Think of Mastra storage as a filing cabinet labeled `mastra`, not the default public drawer. Installed `@mastra/pg` will use **`public` unless you pass `schemaName`**. iPix already keeps threads, messages, resources, and workflow snapshots in schema **`mastra`**. Those four Core tables exist locally and on hosted with every **required** column from installed `@mastra/core` `TABLE_SCHEMAS`. Extra `*Z` timestamp columns are additive extras the adapter can ignore.

The required Core columns are compatible, but **PG-001 is only conditionally approved**. Before wiring storage, **IPI-1044 · PG-001** must use read-only catalog checks to verify hosted indexes/uniques and the runtime role's schema `USAGE` plus Core-table DML privileges. It may then reuse the catalog with `schemaName: "mastra"` and `disableInit: true`, while proving the schema fingerprint is unchanged across startup. This ticket **must not** construct the store.

**Do not GRANT schema `mastra` to `anon`.**

---

## Installed versions (lockfile + `node_modules`)

| Package | Declared | Installed | Tarball |
|---------|----------|-----------|---------|
| `@mastra/pg` | `1.13.0` | `1.13.0` | `https://registry.npmjs.org/@mastra/pg/-/pg-1.13.0.tgz` |
| `@mastra/core` | `1.41.0` | `1.41.0` | lockfile |
| `@mastra/memory` | `1.26.1` | `1.26.1` | lockfile |

Peer on `@mastra/pg@1.13.0`: `@mastra/core >=1.34.0-0 <2` — **MATCH**.

Runtime on this SHA is still **LibSQL** (`src/mastra/index.ts`). Zero `PostgresStore` in `src/`.

---

## Constructor contract (installed types, not blogs)

Source: `node_modules/@mastra/pg/dist/shared/config.d.ts` (`PostgresStoreConfig`).

- **`id: string`** — required.
- Connection: **`pool`** *or* **`connectionString`** *or* host (`host`, `port`, `database`, `user`, `password`) *or* Cloud SQL `ClientConfig`.
- **`schemaName?: string`** — runtime default when omitted is **`"public"`** (`this.schemaName \|\| "public"` in `dist/index.js`). iPix **must** pass `"mastra"`.
- **`disableInit?: boolean`** — when true, storage does **not** auto-create/alter tables; tables must already exist. Also skipped if `MASTRA_DISABLE_STORAGE_INIT=true`.
- Optional: `skipDefaultIndexes`, `indexes`, SSL / pool size on string/host configs.

**Recommended for PG-001 (document only — do not construct here):**

```ts
// PG-001 only. Not executed by DB-001.
new PostgresStore({
  id: "ipix-mastra-storage",
  pool, // singleton / injected pg.Pool — do not open a second pool per request
  schemaName: "mastra",
  disableInit: true,
});
```

`exportSchemas()` exists on the package but **cannot** be imported in this tree (`@mastra/core/storage` missing `mergeWorkflowStepResult`). Column contract here uses **`TABLE_SCHEMAS` from `@mastra/core/storage/constants`** plus static parse of `@mastra/pg` dist — not a live `PostgresStore`.

---

## Catalog sources (read-only)

| Env | Project / bind | Method | Writes |
|-----|----------------|--------|--------|
| Local | Docker `127.0.0.1:54342` (Supabase local) | `psql` `information_schema` + `pg_indexes` + `pg_policies` | none (SELECT) |
| Hosted | `nvdlhrodvevgwdsneplk` (fashionos, PG 17) | Supabase MCP `list_tables` schema `mastra` (verbose) | none intended |

**Caveat:** this session’s Supabase MCP was **not** proven `read_only=true`. Hosted **`execute_sql` was not used** for the matrix after that finding. Hosted columns/PKs/RLS come from **`list_tables` JSON**. Hosted indexes/uniques/grants are **not** in that dump — those rows compare **local catalog** to installed types, then hosted **table/column/PK/RLS** to local.

Local `search_path`: `"$user", public, extensions` — **`mastra` is not in the path**. Unqualified `mastra_threads` would miss the iPix tables. Adapter with `schemaName: "mastra"` qualifies names — **required**.

Foreign keys on Core tables: **0** (local). Logical `thread_id` only.

---

## Official URLs (2026-08-24)

| URL | Status | Note |
|-----|--------|------|
| https://registry.npmjs.org/@mastra/pg/1.13.0 | **VERIFIED** | metadata + peer |
| https://registry.npmjs.org/@mastra/pg/-/pg-1.13.0.tgz | **VERIFIED** | HTTP 200 HEAD; lockfile resolved same URL |
| https://mastra.ai/integrations/databases/postgresql | **VERIFIED** | documents **latest**, not 1.13.0 — **hypothesis** |
| https://mastra.ai/docs/storage | **VERIFIED** | latest; `schemaName` default `public`; auto-`init()` when registered |
| https://mastra.ai/reference/build-with-ai | **VERIFIED** | skill / MCP pointer |
| https://github.com/mastra-ai/mastra/tree/main/stores/pg | **VERIFIED** | GitHub **main**, not 1.13.0 — **do not copy** |
| https://supabase.com/docs/guides/ai-tools/mcp | **VERIFIED** | `read_only=true` exists; this MCP session was not that mode |
| https://www.postgresql.org/docs/current/infoschema-tables.html | **VERIFIED** | |
| https://www.postgresql.org/docs/current/infoschema-columns.html | **VERIFIED** | |
| https://supabase.com/docs/guides/api/using-custom-schemas | **VERIFIED** | do **not** follow GRANT ALL to `anon` |
| https://www.postgresql.org/docs/current/ddl-schemas.html#DDL-SCHEMAS-PATH | **VERIFIED** | `mastra` not in path is a risk |

Installed types win over current web docs and GitHub `main`.

Mastra Docs MCP search for `@mastra/pg`: **no excerpts** in this checkout. CopilotKit persistence docs are Channels StateStore — **not** this contract.

---

## Table inventory

`TABLE_SCHEMAS` in `@mastra/core@1.41.0`: **35** table names.  
Local + hosted `mastra` catalogs: **34** tables. **Local table set = hosted table set.**

### MISSING vs `TABLE_SCHEMAS` (not present locally or hosted)

| Table | Classification | Core PG-001 blocker? |
|-------|----------------|----------------------|
| `mastra_notifications` | **MISSING** | No, with `disableInit: true` |
| `mastra_traces` | **MISSING** | No |
| `mastra_tool_provider_connections` | **MISSING** | No |

### EXTRA vs `TABLE_SCHEMAS` (present on iPix)

| Table | Classification |
|-------|----------------|
| `mastra_observational_memory` | **CHANGE** (additive; MemoryPG in `@mastra/pg@1.13.0`) |
| `mastra_workflow_definitions` | **CHANGE** (iPix-owned; not in Core `TABLE_SCHEMAS`) |

### MISSING vs `@mastra/pg@1.13.0` observability event tables (vNext)

| Table | Classification | Core blocker? |
|-------|----------------|---------------|
| `mastra_span_events` | **MISSING** | No |
| `mastra_log_events` | **MISSING** | No |
| `mastra_metric_events` | **MISSING** | No |
| `mastra_score_events` | **MISSING** | No |
| `mastra_feedback_events` | **MISSING** | No |

### MATCH (present local = hosted)

`mastra_agent_versions`, `mastra_agents`, `mastra_ai_spans`, `mastra_background_tasks`, `mastra_channel_config`, `mastra_channel_installations`, `mastra_dataset_items`, `mastra_dataset_versions`, `mastra_datasets`, `mastra_experiment_results`, `mastra_experiments`, `mastra_favorites`, `mastra_mcp_client_versions`, `mastra_mcp_clients`, `mastra_mcp_server_versions`, `mastra_mcp_servers`, `mastra_messages`, `mastra_observational_memory`, `mastra_prompt_block_versions`, `mastra_prompt_blocks`, `mastra_resources`, `mastra_schedule_triggers`, `mastra_schedules`, `mastra_scorer_definition_versions`, `mastra_scorer_definitions`, `mastra_scorers`, `mastra_skill_blobs`, `mastra_skill_versions`, `mastra_skills`, `mastra_threads`, `mastra_workflow_definitions`, `mastra_workflow_snapshot`, `mastra_workspace_versions`, `mastra_workspaces`.

RLS: **enabled** on all 34 (local `relrowsecurity`; hosted `rls_enabled`). **This does not prove tenant isolation.** The Mastra runtime role uses broad policies such as `USING (true)`; isolation depends on a server-derived `resourceId` plus application authorization. Hosted policy/role auditing and cross-resource read/write denial tests are required before any tenant-isolation claim.

---

## Core memory tables (load-bearing)

Required columns from `TABLE_SCHEMAS` vs local `information_schema.columns`: **all MATCH** (type + nullability). Hosted `list_tables` columns **match local** (same names, same counts). No required column is MISSING.

Hosted row counts (prior catalog probe, not re-run as `execute_sql`): `mastra_threads` **45**, `mastra_messages` **103**, `mastra_resources` **0**, `mastra_workflow_snapshot` **6140**. Local Core counts: **0**.

### `mastra_threads`

| Column | Required type / null | Local | Hosted vs local | Status |
|--------|----------------------|-------|-----------------|--------|
| `id` | text NOT NULL PK | text NOT NULL | MATCH | **MATCH** |
| `resourceId` | text NOT NULL | text NOT NULL | MATCH | **MATCH** |
| `title` | text NOT NULL | text NOT NULL | MATCH | **MATCH** |
| `metadata` | jsonb NULL | jsonb NULL | MATCH | **MATCH** |
| `createdAt` | timestamp NOT NULL | `timestamp without time zone` NOT NULL | MATCH | **MATCH** |
| `updatedAt` | timestamp NOT NULL | same | MATCH | **MATCH** |
| `createdAtZ` | — not in `TABLE_SCHEMAS` | `timestamptz` NULL default `now()` | MATCH | **CHANGE** (additive) |
| `updatedAtZ` | — | `timestamptz` NULL default `now()` | MATCH | **CHANGE** (additive) |

PK: `id` (hosted + local).  
Required index from MemoryPG `getDefaultIndexDefs`: `mastra_threads_resourceid_createdat_idx` on (`resourceId`, `createdAt DESC`) — **MATCH** locally.

### `mastra_messages`

| Column | Required | Local / hosted | Status |
|--------|----------|----------------|--------|
| `id` | text NOT NULL PK | MATCH | **MATCH** |
| `thread_id` | text NOT NULL | MATCH | **MATCH** |
| `content` | text NOT NULL | MATCH | **MATCH** |
| `role` | text NOT NULL | MATCH | **MATCH** |
| `type` | text NOT NULL | MATCH | **MATCH** |
| `createdAt` | timestamp NOT NULL | MATCH | **MATCH** |
| `resourceId` | text NULL | MATCH | **MATCH** |
| `createdAtZ` | extra | timestamptz NULL default `now()` | **CHANGE** (additive) |

Required index: `mastra_messages_thread_id_createdat_idx` on (`thread_id`, `createdAt DESC`) — **MATCH** locally.

### `mastra_resources`

| Column | Required | Status |
|--------|----------|--------|
| `id` | text NOT NULL PK | **MATCH** |
| `workingMemory` | text NULL | **MATCH** |
| `metadata` | jsonb NULL | **MATCH** |
| `createdAt` / `updatedAt` | timestamp NOT NULL | **MATCH** |
| `createdAtZ` / `updatedAtZ` | extra timestamptz | **CHANGE** (additive) |

### `mastra_workflow_snapshot`

| Column | Required | Status |
|--------|----------|--------|
| `workflow_name` | text NOT NULL | **MATCH** |
| `run_id` | text NOT NULL | **MATCH** |
| `resourceId` | text NULL | **MATCH** |
| `snapshot` | jsonb NOT NULL | **MATCH** |
| `createdAt` / `updatedAt` | timestamp NOT NULL | **MATCH** |
| `createdAtZ` / `updatedAtZ` | extra | **CHANGE** (additive) |

Hosted `primary_keys` on this table: **[]**. Locally, uniqueness is provided by `public_mastra_workflow_snapshot_workflow_name_run_id_key` on (`workflow_name`, `run_id`). Adapter default base name is `mastra_workflow_snapshot_workflow_name_run_id_key`. Local status: **CHANGE** (name / `public_` prefix leftover) and **MATCH** on indexed columns. **Hosted unique-index presence is UNVERIFIED** because the hosted dump did not include indexes or unique constraints. PG-001 must verify it read-only; `disableInit: true` cannot repair missing hosted metadata.

---

## Indexes (local vs adapter defaults; hosted unverified)

| Adapter default (schemaPrefix empty / public) | Local name | Status |
|-----------------------------------------------|------------|--------|
| `mastra_threads_resourceid_createdat_idx` | same | **MATCH** |
| `mastra_messages_thread_id_createdat_idx` | same | **MATCH** |
| `mastra_workflow_snapshot_workflow_name_run_id_key` | `public_mastra_workflow_snapshot_workflow_name_run_id_key` | **CHANGE** (name only) |

If `init()` ran with `schemaName: "mastra"`, MemoryPG would prefix indexes with `mastra_`. Local names are **unprefixed**. Hosted index names and presence are **UNVERIFIED**. **Do not run `init()`** against this catalog; **PG-001** must keep `disableInit: true`, verify hosted metadata read-only, and prove no DDL.

---

## Grants and roles (local Core tables only)

Roles seen: `postgres` (owner-style ALL), `hyperdrive_mastra_runtime` (SELECT, INSERT, UPDATE, DELETE). **`anon` is not granted** on these four tables in the dump.

Hosted grants: **NOT VERIFIED** (no write-capable SQL; `list_tables` has no grant list).

---

## Required migrations

| Item | Required for Core PG-001 + `disableInit: true`? |
|------|--------------------------------------------------|
| Create Core four tables | **No** — they exist |
| Add `TABLE_SCHEMAS` required columns | **No** — all present |
| Create default thread/message indexes | **No locally; hosted UNVERIFIED** — PG-001 must inspect read-only |
| Unique (`workflow_name`, `run_id`) | **No locally; hosted UNVERIFIED** — local name CHANGE only |
| Drop `*Z` columns | **No** — compatible extras |
| Create `mastra_notifications` / `traces` / `tool_provider_connections` | **No** for Core Memory |
| Create five `*_events` tables | **No** for Core Memory |
| Put `mastra` on `search_path` | **No** if adapter always qualifies; **risk** if any SQL is unqualified |
| GRANT `mastra` to `anon` | **Forbidden** |

Follow-ups (not this ticket): optional tables above. **PG-001 must first use a proven read-only connection to verify hosted indexes/uniques, policy definitions, schema `USAGE`, and Core-table DML privileges, then run the fingerprint test.**

---

## Go / no-go for PG-001

**CONDITIONAL GO** to wire PostgresStore **in IPI-1044 · PG-001 only**, after these gates pass:

1. Read-only hosted verification of required indexes and the (`workflow_name`, `run_id`) unique constraint
2. Read-only hosted verification that `hyperdrive_mastra_runtime` has schema `USAGE` and required Core-table SELECT/INSERT/UPDATE/DELETE privileges
3. Hosted policy/role audit records broad runtime policies such as `USING (true)` without calling them tenant isolation
4. `schemaName: "mastra"` (never default `public`)
5. `disableInit: true`
6. Injected singleton `pool`
7. Proof that the catalog fingerprint is unchanged across process start
8. Tenant isolation is enforced by server-derived `resourceId` and application authorization; cross-resource read/write denial tests are required before production
9. No production writes from this matrix work

**NO-GO** if any hosted metadata or privilege gate is unverified, or if PG-001 omits `schemaName`, leaves `disableInit` false, trusts client-provided resource scope, or copies GitHub `main` instead of `@mastra/pg@1.13.0`.

---

## What this ticket did not do

- No `new PostgresStore`, no `init()`, no `src/mastra` change
- No production DML/DDL
- No second hosted Supabase project
- No GRANT to `anon`
