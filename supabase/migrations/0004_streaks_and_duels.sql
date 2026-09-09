-- Daily login streaks + friend duels.
-- Run this after 0001-0003 have already been applied.

-- ---------------------------------------------------------------------------
-- login streak
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column login_streak int not null default 0,
  add column last_login_date date;

-- Call once per app open. Advances the streak by a day, resets it on a gap,
-- and grants a bonus every 7 days in a row (+100 XP, +1 Joker).
create function public.claim_daily_login()
returns table (streak int, reward_xp int, reward_joker int, already_claimed boolean)
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  prof record;
  today date := (now() at time zone 'utc')::date;
  new_streak int;
  xp_reward int := 0;
  joker_reward int := 0;
begin
  select * into prof from public.profiles where id = uid;

  if prof.last_login_date = today then
    return query select prof.login_streak, 0, 0, true;
    return;
  end if;

  if prof.last_login_date = today - 1 then
    new_streak := prof.login_streak + 1;
  else
    new_streak := 1;
  end if;

  if new_streak % 7 = 0 then
    xp_reward := 100;
    joker_reward := 1;
  end if;

  update public.profiles
  set login_streak = new_streak,
      last_login_date = today,
      xp = xp + xp_reward,
      level = ((xp + xp_reward) / 1000) + 1,
      jokers_remaining = jokers_remaining + joker_reward
  where id = uid;

  return query select new_streak, xp_reward, joker_reward, false;
end;
$$;

-- ---------------------------------------------------------------------------
-- friend duels
-- ---------------------------------------------------------------------------
create table public.duels (
  id uuid primary key default gen_random_uuid(),
  challenger_id uuid not null references public.profiles (id) on delete cascade,
  opponent_id uuid not null references public.profiles (id) on delete cascade,
  matchday_id uuid not null references public.matchdays (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'completed', 'cancelled')),
  winner_id uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  completed_at timestamptz,
  check (challenger_id <> opponent_id),
  unique (challenger_id, opponent_id, matchday_id)
);

create index duels_challenger_idx on public.duels (challenger_id);
create index duels_opponent_idx on public.duels (opponent_id);

alter table public.duels enable row level security;

create policy "participants can view their duels" on public.duels for select using (
  auth.uid() = challenger_id or auth.uid() = opponent_id
);

create policy "users can challenge others" on public.duels for insert with check (
  auth.uid() = challenger_id
);

-- A single policy so USING and WITH CHECK stay paired: only the opponent may
-- accept/decline, only the challenger may cancel, and only while still pending.
create policy "participants can respond to a pending duel" on public.duels for update using (
  (auth.uid() = challenger_id or auth.uid() = opponent_id) and status = 'pending'
) with check (
  (status = 'cancelled' and auth.uid() = challenger_id)
  or (status in ('accepted', 'declined') and auth.uid() = opponent_id)
);

-- Live score per duel, computed from the same tips the scoring trigger already fills in.
-- security_invoker means it's subject to the querying user's RLS on duels/tips, not the view owner's.
create view public.duel_scores
with (security_invoker = true) as
select
  d.id as duel_id,
  d.challenger_id,
  d.opponent_id,
  coalesce(sum(t.points_earned) filter (where t.user_id = d.challenger_id), 0) as challenger_points,
  coalesce(sum(t.points_earned) filter (where t.user_id = d.opponent_id), 0) as opponent_points
from public.duels d
left join public.matches m on m.matchday_id = d.matchday_id
left join public.tips t on t.match_id = m.id and t.user_id in (d.challenger_id, d.opponent_id)
group by d.id, d.challenger_id, d.opponent_id;

alter publication supabase_realtime add table public.duels;

-- Extend the existing match-scoring trigger: once every match in a matchday is
-- finished, settle any accepted duels for that matchday and reward the winner.
create or replace function public.score_match_tips()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  tip record;
  duel record;
  earned int;
  actual_diff int;
  tip_diff int;
  c_points int;
  o_points int;
  win uuid;
begin
  if new.status = 'finished'
     and new.home_score is not null
     and new.away_score is not null
     and (old.status is distinct from new.status or old.home_score is distinct from new.home_score or old.away_score is distinct from new.away_score) then

    actual_diff := new.home_score - new.away_score;

    for tip in select * from public.tips where match_id = new.id loop
      tip_diff := tip.home_score - tip.away_score;

      if tip.home_score = new.home_score and tip.away_score = new.away_score then
        earned := 5;
      elsif sign(tip_diff) = sign(actual_diff) then
        earned := 3;
      else
        earned := 0;
      end if;

      if tip.is_joker then
        earned := earned * 2;
      end if;

      update public.tips
      set points_earned = earned
      where id = tip.id;

      update public.profiles
      set points = points + earned - coalesce(tip.points_earned, 0),
          correct_tips_count = correct_tips_count
            + (case when earned > 0 and coalesce(tip.points_earned, -1) <= 0 then 1 else 0 end)
            - (case when earned <= 0 and coalesce(tip.points_earned, -1) > 0 then 1 else 0 end)
      where id = tip.user_id;
    end loop;

    if not exists (
      select 1 from public.matches
      where matchday_id = new.matchday_id and status <> 'finished'
    ) then
      for duel in
        select * from public.duels
        where matchday_id = new.matchday_id and status = 'accepted'
      loop
        select coalesce(sum(t.points_earned), 0) into c_points
          from public.tips t join public.matches m on m.id = t.match_id
          where t.user_id = duel.challenger_id and m.matchday_id = duel.matchday_id;

        select coalesce(sum(t.points_earned), 0) into o_points
          from public.tips t join public.matches m on m.id = t.match_id
          where t.user_id = duel.opponent_id and m.matchday_id = duel.matchday_id;

        win := case
          when c_points > o_points then duel.challenger_id
          when o_points > c_points then duel.opponent_id
          else null
        end;

        update public.duels
        set status = 'completed', completed_at = now(), winner_id = win
        where id = duel.id;

        if win is not null then
          update public.profiles
          set xp = xp + 30,
              level = ((xp + 30) / 1000) + 1
          where id = win;
        end if;
      end loop;
    end if;
  end if;

  return new;
end;
$$;
