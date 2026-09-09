-- Admin dashboard: a flag on the operator's own profile, gating both the
-- in-app admin screen (client-side, cosmetic) and what the database/edge
-- function actually allow (server-side, the real enforcement).
--
-- Nobody can grant themselves is_admin through the app - it's only settable
-- via the SQL Editor:
--   update public.profiles set is_admin = true where id =
--     (select id from auth.users where email = 'deine@email.com');

alter table public.profiles
  add column is_admin boolean not null default false;

create policy "admins can update any profile" on public.profiles
  for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));
