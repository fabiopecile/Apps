-- Eigene private Liga mit Freunden (Pro feature): a small group with its own
-- join code and a leaderboard scoped to just its members (reusing
-- profiles.points, the same score the global ranking uses).

create table public.private_leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.private_league_members (
  league_id uuid not null references public.private_leagues (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (league_id, user_id)
);

alter table public.private_leagues enable row level security;
alter table public.private_league_members enable row level security;

create policy "members can see their private leagues" on public.private_leagues
  for select
  using (exists (select 1 from public.private_league_members m where m.league_id = id and m.user_id = auth.uid()));

create policy "members can see co-members" on public.private_league_members
  for select
  using (exists (select 1 from public.private_league_members m where m.league_id = private_league_members.league_id and m.user_id = auth.uid()));

-- Creating and joining both go through SECURITY DEFINER functions so the
-- tables themselves can stay locked to "members only" for select, while a
-- non-member can still look a league up by its code to join it.

create or replace function public.create_private_league(p_name text)
returns public.private_leagues
language plpgsql
security definer
set search_path = public
as $$
declare
  new_league public.private_leagues;
  new_code text;
begin
  new_code := upper(substr(md5(gen_random_uuid()::text), 1, 6));
  insert into public.private_leagues (name, code, created_by)
  values (trim(p_name), new_code, auth.uid())
  returning * into new_league;

  insert into public.private_league_members (league_id, user_id) values (new_league.id, auth.uid());

  return new_league;
end;
$$;

create or replace function public.join_private_league(p_code text)
returns public.private_leagues
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.private_leagues;
begin
  select * into target from public.private_leagues where code = upper(trim(p_code));
  if target.id is null then
    raise exception 'Liga nicht gefunden';
  end if;

  insert into public.private_league_members (league_id, user_id)
  values (target.id, auth.uid())
  on conflict do nothing;

  return target;
end;
$$;
