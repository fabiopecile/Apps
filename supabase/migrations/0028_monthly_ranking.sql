-- A monthly leaderboard, so a prize can be won by someone who joined last
-- week. profiles.points is cumulative since registration - as the basis for a
-- monthly prize it would hand every month to whoever signed up first, which is
-- the opposite of an incentive for new players.
--
-- Derived, not stored. The month's score is simply the points from tips on
-- matches that kicked off in that month, so there is no reset job to forget
-- and no counter that can drift away from the tips it was built from.

create or replace view public.monthly_scores as
  select
    t.user_id,
    date_trunc('month', m.kickoff)::date as period,
    sum(coalesce(t.points_earned, 0))::int as points,
    count(*) filter (where coalesce(t.points_earned, 0) > 0)::int as correct_tips,
    count(*)::int as tips_count
  from public.tips t
  join public.matches m on m.id = t.match_id
  where t.points_earned is not null
  group by t.user_id, date_trunc('month', m.kickoff)::date;

grant select on public.monthly_scores to authenticated;

-- The leaderboard itself, with the profile fields the list needs. A function
-- rather than a view join because PostgREST cannot infer a foreign key from a
-- view, so the client could not embed profiles into it.
create or replace function public.monthly_ranking(p_period date default null)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  equipped_frame_color text,
  equipped_title text,
  is_pro boolean,
  points int,
  correct_tips int,
  tips_count int
)
language sql
security definer
stable
set search_path = public
as $$
  select
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.equipped_frame_color,
    p.equipped_title,
    p.is_pro,
    s.points,
    s.correct_tips,
    s.tips_count
  from public.monthly_scores s
  join public.profiles p on p.id = s.user_id
  where s.period = coalesce(p_period, date_trunc('month', now())::date)
  order by s.points desc, s.correct_tips desc, p.username asc
  limit 50;
$$;

revoke all on function public.monthly_ranking(date) from public;
grant execute on function public.monthly_ranking(date) to authenticated;

-- ---------------------------------------------------------------------------
-- What there is to win, and who put it up
-- ---------------------------------------------------------------------------
create table public.monthly_prizes (
  period date primary key,
  title text not null,
  description text,
  -- Who donated it. Shown in the app, and the thing a sponsor gets in return.
  sponsor_name text,
  sponsor_url text,
  image_url text,
  -- How many places win something.
  places int not null default 3 check (places between 1 and 50),
  created_at timestamptz not null default now()
);

alter table public.monthly_prizes enable row level security;

create policy "prizes are readable" on public.monthly_prizes
  for select using (true);
create policy "admins manage prizes" on public.monthly_prizes
  for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- ---------------------------------------------------------------------------
-- Eligibility
-- ---------------------------------------------------------------------------
-- Real prizes make second accounts worth creating, and the referral reward
-- already nudges that way. A minimum of tips before a place counts makes a
-- throwaway account more work than it is worth.
alter table public.monthly_prizes
  add column if not exists min_tips int not null default 10 check (min_tips >= 0);

comment on column public.monthly_prizes.min_tips is
  'Tips required in the month before a place counts as prize-eligible.';
