-- Backfill migration: the kv_store table previously existed only as a comment
-- in supabase/functions/server/kv_store.tsx with no tracked schema history.
create table if not exists public.kv_store_edd517d1 (
  key text not null primary key,
  value jsonb not null
);

-- Table was publicly readable/writable via the anon key with RLS disabled.
-- The app only ever accesses this table through the "server" Edge Function
-- using the service_role key, which bypasses RLS, so enabling RLS with no
-- policies blocks direct anon/authenticated access without affecting the app.
alter table public.kv_store_edd517d1 enable row level security;
