-- Party Minigames – Weekend League schema
-- Run this once in your Supabase project's SQL editor (Project → SQL Editor → New query).

create extension if not exists "pgcrypto";

-- Public profile for every authenticated user (username shown to opponents).
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are readable by any authenticated user"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- One row per game played inside the Weekend League (Fri–Sun window).
create table if not exists public.game_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  game text not null check (game in ('zeitgefuehl', 'reaktionstest', 'blackjack')),
  weekend_key text not null, -- e.g. '2026-08-28' = the Friday date that opens the weekend
  raw_score numeric, -- seconds off target (zeitgefuehl) / ms (reaktionstest) / null for blackjack
  outcome text not null check (outcome in ('win', 'lose', 'draw')),
  opponent_user_id uuid references auth.users (id),
  opponent_score numeric,
  is_vs_bot boolean not null default false,
  played_at timestamptz not null default now()
);

alter table public.game_results enable row level security;

create policy "Users can read all results from the current weekend (for matchmaking + leaderboards)"
  on public.game_results for select
  to authenticated
  using (true);

create policy "Users can insert only their own results"
  on public.game_results for insert
  to authenticated
  with check (auth.uid() = user_id);

create index if not exists game_results_weekend_game_idx
  on public.game_results (game, weekend_key);

create index if not exists game_results_user_weekend_game_idx
  on public.game_results (user_id, game, weekend_key);

-- Picks a random opponent score from the same weekend/game to power async "vs. others" matches.
-- Excludes the requesting user's own results.
create or replace function public.pick_opponent_score(
  p_game text,
  p_weekend_key text,
  p_user_id uuid
)
returns table (opponent_user_id uuid, opponent_score numeric, opponent_username text)
language sql
security definer
set search_path = public
as $$
  select gr.user_id, gr.raw_score, p.username
  from public.game_results gr
  join public.profiles p on p.id = gr.user_id
  where gr.game = p_game
    and gr.weekend_key = p_weekend_key
    and gr.user_id <> p_user_id
    and gr.raw_score is not null
  order by random()
  limit 1;
$$;

grant execute on function public.pick_opponent_score(text, text, uuid) to authenticated;
