/** Full mastra-schema catalog used to prove disableInit did not run DDL.
 * Not imported by production runtime — keep it out of src/mastra/pg-store.ts.
 */
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
