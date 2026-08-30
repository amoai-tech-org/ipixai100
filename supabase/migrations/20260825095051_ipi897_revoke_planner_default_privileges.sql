-- IPI-897 · SB-SEC-009 — future-only default privileges for role postgres in schema planner.
--
-- Purpose: stop new planner tables/sequences inheriting authenticated CRUD
-- (INSERT/SELECT/UPDATE/DELETE = arwd). planner is PostgREST-exposed.
--
-- Scope:
--   * ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA planner only.
--   * Tables and sequences. Function EXECUTE defaults are out of scope
--     (SB-SEC-001b / authenticated=X stays).
--   * Does not revoke grants on existing planner tables (11 tables, all RLS on).
--   * Does not ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin.
--
-- Why FOR ROLE postgres is load-bearing:
--   Default privileges apply to objects created by that role. Migrations and
--   the Dashboard SQL editor run as postgres. Omitting FOR ROLE would change
--   the current-session role only and miss the live pg_default_acl row.
--
-- Finding 2 (durable): supabase_admin / public still grants anon + authenticated
-- the full set. postgres cannot change that (permission denied; not superuser).
-- Detection stays NOTICE in the security test. Do not fail CI forever on an
-- unfixable platform row. Revisit only if Supabase exposes a superuser path.
--
-- Schema-less defaults (defaclnamespace = 0) union with IN SCHEMA rows.
-- Hosted 2026-08-25 MCP: postgres global row is functions only
-- `{postgres=X/postgres}` — no global table/sequence grant to JWT roles.
-- This file therefore keeps IN SCHEMA planner as the table/sequence fix.
-- Re-check `pg_default_acl` where defaclnamespace = 0 before a hosted apply.
--
-- After apply: a new planner table is invisible to the Data API until an
-- explicit GRANT. Empty results look like an RLS bug — they are missing GRANT.
-- Document that trap in a separate docs PR (not this file).
--
-- Do not db push the local dump pair (20260824115900 / 20260824120000).

alter default privileges for role postgres in schema planner
  revoke all on tables from anon, authenticated, public;

alter default privileges for role postgres in schema planner
  revoke all on sequences from anon, authenticated, public;

alter default privileges for role postgres in schema planner
  grant all on tables to service_role;

alter default privileges for role postgres in schema planner
  grant all on sequences to service_role;
