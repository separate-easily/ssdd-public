-- Table was still visible in the PostgREST/GraphQL schema to anon/authenticated
-- (privilege grants are separate from RLS). Revoke direct table privileges so
-- the table is neither queryable nor discoverable via those roles; the "server"
-- Edge Function keeps working since it uses the service_role key.
revoke all on public.kv_store_edd517d1 from anon, authenticated;
