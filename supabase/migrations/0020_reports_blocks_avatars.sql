-- Moderation and account-lifecycle basics. The report/block pair and in-app
-- account deletion are hard requirements for App Store review of an app with
-- user-generated content, not just nice-to-haves.

-- ---------------------------------------------------------------------------
-- Reporting
-- ---------------------------------------------------------------------------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('post', 'story', 'comment', 'user')),
  target_id uuid not null,
  reason text not null,
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);

alter table public.reports enable row level security;
create policy "users can file reports" on public.reports
  for insert with check (auth.uid() = reporter_id);
create policy "users can see their own reports" on public.reports
  for select using (auth.uid() = reporter_id);
create policy "admins can see all reports" on public.reports
  for select using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));
create policy "admins can resolve reports" on public.reports
  for update using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- ---------------------------------------------------------------------------
-- Blocking
-- ---------------------------------------------------------------------------
create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.blocks enable row level security;
create policy "users can see their own blocks" on public.blocks
  for select using (auth.uid() = blocker_id);
create policy "users can block others" on public.blocks
  for insert with check (auth.uid() = blocker_id);
create policy "users can unblock" on public.blocks
  for delete using (auth.uid() = blocker_id);

-- Posts and stories from blocked users disappear from the feed. Done in the
-- read policies so a blocked user's content is filtered server-side and can't
-- be pulled by a modified client.
drop policy if exists "posts are publicly readable" on public.posts;
create policy "posts are publicly readable" on public.posts
  for select using (
    not exists (
      select 1 from public.blocks b
      where b.blocker_id = auth.uid() and b.blocked_id = posts.user_id
    )
  );

drop policy if exists "stories are publicly readable" on public.stories;
create policy "stories are publicly readable" on public.stories
  for select using (
    expires_at > now()
    and not exists (
      select 1 from public.blocks b
      where b.blocker_id = auth.uid() and b.blocked_id = stories.user_id
    )
  );

drop policy if exists "comments are publicly readable" on public.post_comments;
create policy "comments are publicly readable" on public.post_comments
  for select using (
    not exists (
      select 1 from public.blocks b
      where b.blocker_id = auth.uid() and b.blocked_id = post_comments.user_id
    )
  );

-- ---------------------------------------------------------------------------
-- Account deletion
-- ---------------------------------------------------------------------------
-- Deleting the auth user cascades to profiles and from there to every table
-- that references it, so this one call removes the account and its content.
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Nicht angemeldet';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;

-- ---------------------------------------------------------------------------
-- Avatars
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "users can upload their own avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users can replace their own avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users can delete their own avatar"
  on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- Expired story cleanup
-- ---------------------------------------------------------------------------
-- Expired stories only became invisible; the rows (and their images) stayed
-- forever. Highlights are kept - their expiry is set 100 years out.
create or replace function public.purge_expired_stories()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer;
begin
  with deleted as (
    delete from public.stories
    where expires_at < now() - interval '1 day' and is_highlight = false
    returning 1
  )
  select count(*) into removed from deleted;
  return removed;
end;
$$;

-- Run it nightly at 03:00 UTC. Wrapped in a DO block so the migration still
-- applies on projects where pg_cron isn't enabled.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('purge-expired-stories')
      where exists (select 1 from cron.job where jobname = 'purge-expired-stories');
    perform cron.schedule('purge-expired-stories', '0 3 * * *', 'select public.purge_expired_stories();');
  end if;
end;
$$;
