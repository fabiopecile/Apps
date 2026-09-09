-- Push notification reminders (e.g. "noch nicht getippt", "Glücksrad drehen").
-- Delivery itself happens from an Edge Function + pg_cron, this migration only
-- adds the storage: each profile's Expo push token, and a log to make sure a
-- reminder is only ever sent once per user/type/reference.

alter table public.profiles
  add column push_token text,
  add column push_token_updated_at timestamptz;

create table public.notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  ref_key text not null,
  sent_at timestamptz not null default now(),
  unique (user_id, type, ref_key)
);

alter table public.notification_log enable row level security;
create policy "users can see their own notification log" on public.notification_log for select using (auth.uid() = user_id);
