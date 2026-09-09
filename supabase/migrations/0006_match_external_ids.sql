-- Lets the football-data.org sync (supabase/functions/sync-football-data)
-- upsert matches idempotently instead of creating duplicates on every run.
alter table public.matches
  add column external_id text unique;
