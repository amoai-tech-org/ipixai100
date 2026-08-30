# Forward V2 migrations vs production history (IPI-1040)

**Task:** **IPI-1040 · MIGRATION-001 — Prove New iPix Database Changes Can Be Added Without Replaying Old Migrations**

Proved 2026-08-30 with Supabase CLI **2.111.0** against hosted project `nvdlhrodvevgwdsneplk`. This ticket did **not** apply anything to production.

Think of production’s migration table as a **receipt book**: 309 stamps already paid. Git `origin/main` currently keeps only the **next unpaid receipt** (**IPI-897 · SB-SEC-009 — Lock Down Default Planner Privileges for New Tables**, file `20260825095051_ipi897_revoke_planner_default_privileges.sql`). You do not rewrite the old receipts. You also must not check the two local Docker dump files into a linked push.

## Proven linked path (disposable worktree only)

1. Work from a **clean** `origin/main` worktree. Copy `supabase/.temp` so `--linked` works. Do not run this in a dirty tree that still has dump files `20260824115900` / `20260824120000`.
2. Keep a copy of `20260825095051_ipi897_*.sql` (fetch overwrites *same names* only; IPI-897 is not on the remote ledger so it stayed).
3. `supabase migration fetch --linked --yes` — **read remote history, write local files**. Production schema and `schema_migrations` do not change.
4. Result: **309** history files + IPI-897 = **310** SQL files. Repeat in a second worktree: **identical filenames and SHA-256** (zero mismatches).
5. `supabase migration list --linked` — all 309 versions have matching `local` and `remote`; IPI-897 is `local` only (`remote` empty).
6. `supabase db push --linked --dry-run` — CLI prints `DRY RUN: migrations will *not* be pushed`. Queue is **only**:

   `20260825095051_ipi897_revoke_planner_default_privileges.sql`

7. Delete the fetched 309 files. **Do not commit them.** They are a CLI alignment aid, not the git source of truth.

### Checksums (worktree A = worktree B)

| File | SHA-256 |
|------|---------|
| First remote `20250125000000_extensions_and_enums.sql` | `86d8507eb89b2f1b4a01dcbf271345fda545813b3aed06255dea51032d9583d1` |
| Latest remote `20260824104900_ipi_v2_000_sb_fix_010_restore_media_size_specs_comment.sql` | `e045c5568a2fab6c1a018585b7fbd115b2b36bd4d9598606df64e4d4cd7df235` |
| IPI-897 (unchanged by fetch) | `6e23a48696177f49587807a7749a9a50c8cd6ab61e9a4d107b77d0e8abd90c7e` |

Production ledger after dry-run (MCP `list_migrations`): still **309** rows, latest still `20260824104900`.

## Never

- `supabase migration repair` to fake alignment
- `supabase db reset --linked`
- Real `supabase db push --linked` without explicit human approval
- Commit the 309 fetched files
- Push local dump pair `20260824115900` / `20260824120000` (closet rebuild)

## History files are not a local Docker baseline

Fetch reconstructs **statements stored in the remote history table**. Two rows are effectively empty (`;\n` only):

- `20260627180000_media_spec_tables.sql`
- `20260703223000_.sql` (remote `name` is **null**)

Replaying those 309 files with `supabase db reset` is **not** a valid local schema build. Local Docker stays on the dump-replay path documented in skills (`ipix-supabase`); IPI-897 is already the first **forward** V2 file on `origin/main` (CI/staging, not this ticket).

This ticket therefore **did not** run local reset/pgTAP on the fetched 309-file set. That is an honest gap, not a reason to repair production.

## Future production apply (approval required)

After explicit approval:

1. Disposable worktree from the commit that contains the new SQL (today: IPI-897 only).
2. Fetch + list + dry-run as above. Confirm the queue is **only** the intended newer file(s).
3. Then `supabase db push --linked` **without** `--dry-run`.
4. Re-read MCP ledger: count should become 310, latest `20260825095051`.

Rollback for IPI-897 (if it were applied): restore `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA planner` grants that this file revoked — **not executed here**. Prefer a new forward migration over editing the applied file.

## CLI semantics verified

- `supabase migration fetch --linked` — default `--linked` true
- `supabase db push --linked --dry-run` — non-mutating (`Would push these migrations`)

Official: [migration fetch](https://supabase.com/docs/reference/cli/supabase-migration-fetch), [database migrations](https://supabase.com/docs/guides/local-development/database-migrations).
