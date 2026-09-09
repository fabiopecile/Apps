-- Phase 2: daily Glücksrad, 3 joker types + booster, XP/streak duels, chat-linked duels,
-- friend requests (mutual "Freunde"). Run after 0001-0004.

-- ---------------------------------------------------------------------------
-- profiles: wheel currencies + title
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column coins int not null default 0,
  add column booster_charges int not null default 0,
  add column equipped_title text,
  add column last_wheel_spin_date date;

create table public.user_titles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  earned_at timestamptz not null default now(),
  primary key (user_id, title)
);

alter table public.user_titles enable row level security;
create policy "user titles are publicly readable" on public.user_titles for select using (true);

-- ---------------------------------------------------------------------------
-- tips: joker types (risk / boost / safe) + booster flag
-- ---------------------------------------------------------------------------
alter table public.tips
  add column joker_type text check (joker_type in ('risk', 'boost', 'safe')),
  add column booster_applied boolean not null default false;

-- carry over the old simple joker as the equivalent "boost" type
update public.tips set joker_type = 'boost' where is_joker = true;

-- handle_new_tip must now run BEFORE insert so it can flag booster_applied on the new row.
drop trigger if exists on_tip_created on public.tips;

create or replace function public.handle_new_tip()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  has_booster boolean;
begin
  if new.joker_type is not null then
    update public.profiles
    set jokers_remaining = jokers_remaining - 1
    where id = new.user_id
      and jokers_remaining > 0;

    if not found then
      raise exception 'No jokers remaining';
    end if;
  end if;

  select (booster_charges > 0) into has_booster from public.profiles where id = new.user_id;
  if has_booster then
    update public.profiles set booster_charges = booster_charges - 1 where id = new.user_id;
    new.booster_applied := true;
  end if;

  update public.profiles
  set tips_count = tips_count + 1
  where id = new.user_id;

  return new;
end;
$$;

create trigger on_tip_created
  before insert on public.tips
  for each row execute function public.handle_new_tip();

-- Editing an existing tip's joker (before kickoff) must also settle the joker budget.
create function public.handle_tip_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.joker_type is null and new.joker_type is not null then
    update public.profiles
    set jokers_remaining = jokers_remaining - 1
    where id = new.user_id and jokers_remaining > 0;
    if not found then
      raise exception 'No jokers remaining';
    end if;
  elsif old.joker_type is not null and new.joker_type is null then
    update public.profiles
    set jokers_remaining = jokers_remaining + 1
    where id = new.user_id;
  end if;

  return new;
end;
$$;

create trigger on_tip_updated
  before update of joker_type on public.tips
  for each row execute function public.handle_tip_update();

-- ---------------------------------------------------------------------------
-- duels: duel type (tips / xp / streak) + xp snapshots
-- ---------------------------------------------------------------------------
alter table public.duels
  add column duel_type text not null default 'tips' check (duel_type in ('tips', 'xp', 'streak')),
  add column challenger_xp_start int,
  add column opponent_xp_start int;

-- Snapshot each side's XP the moment an "xp" duel is accepted, so the winner is
-- decided by XP *gained* during the duel, not total XP.
create function public.snapshot_duel_xp_start()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' and new.duel_type = 'xp' then
    update public.duels
    set challenger_xp_start = (select xp from public.profiles where id = new.challenger_id),
        opponent_xp_start = (select xp from public.profiles where id = new.opponent_id)
    where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_duel_accepted_snapshot_xp
  after update of status on public.duels
  for each row execute function public.snapshot_duel_xp_start();

-- ---------------------------------------------------------------------------
-- messages: optional link to a duel, so a challenge can render as a card in chat
-- ---------------------------------------------------------------------------
alter table public.messages
  add column duel_id uuid references public.duels (id) on delete set null;

-- ---------------------------------------------------------------------------
-- friend requests -> mutual "Freunde" (both directions of follows on accept)
-- ---------------------------------------------------------------------------
create table public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (sender_id, recipient_id),
  check (sender_id <> recipient_id)
);

create index friend_requests_recipient_idx on public.friend_requests (recipient_id);

alter table public.friend_requests enable row level security;

create policy "participants can view their friend requests" on public.friend_requests for select using (
  auth.uid() = sender_id or auth.uid() = recipient_id
);

create policy "users can send friend requests" on public.friend_requests for insert with check (
  auth.uid() = sender_id
);

create policy "recipient can respond to a pending request" on public.friend_requests for update using (
  auth.uid() = recipient_id and status = 'pending'
) with check (
  status in ('accepted', 'declined')
);

create function public.handle_friend_request_response()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    new.responded_at := now();
    insert into public.follows (follower_id, following_id) values (new.sender_id, new.recipient_id)
      on conflict (follower_id, following_id) do nothing;
    insert into public.follows (follower_id, following_id) values (new.recipient_id, new.sender_id)
      on conflict (follower_id, following_id) do nothing;
  elsif new.status = 'declined' and old.status is distinct from 'declined' then
    new.responded_at := now();
  end if;
  return new;
end;
$$;

create trigger on_friend_request_responded
  before update on public.friend_requests
  for each row execute function public.handle_friend_request_response();

alter publication supabase_realtime add table public.friend_requests;

-- ---------------------------------------------------------------------------
-- daily Glücksrad
-- ---------------------------------------------------------------------------
-- The 12 prizes below are the single source of truth for the wheel — the app's
-- wheel graphic must list them in this exact order so the spin animation lands
-- on the segment the server actually awarded.
--  0 💎 100 XP        4 🔥 200 XP        8 ⚡ 75 XP
--  1 🎁 Joker         5 🚀 Booster       9 🎯 150 XP
--  2 ⭐ 50 XP         6 👑 Titel Champion 10 🏆 300 XP
--  3 🪙 25 Coins      7 💰 500 XP        11 🎲 Extra Joker
create function public.spin_wheel()
returns table (prize_index int, prize_type text, prize_label text, prize_value int)
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  prof record;
  today date := (now() at time zone 'utc')::date;
  idx int;
  p_type text;
  p_label text;
  p_value int;
begin
  select * into prof from public.profiles where id = uid;

  if prof.last_wheel_spin_date = today then
    raise exception 'already_spun_today';
  end if;

  idx := floor(random() * 12)::int;

  case idx
    when 0 then p_type := 'xp'; p_label := '100 XP'; p_value := 100;
    when 1 then p_type := 'joker'; p_label := 'Joker'; p_value := 1;
    when 2 then p_type := 'xp'; p_label := '50 XP'; p_value := 50;
    when 3 then p_type := 'coins'; p_label := '25 Coins'; p_value := 25;
    when 4 then p_type := 'xp'; p_label := '200 XP'; p_value := 200;
    when 5 then p_type := 'booster'; p_label := 'Booster'; p_value := 1;
    when 6 then p_type := 'title'; p_label := 'Champion'; p_value := 0;
    when 7 then p_type := 'xp'; p_label := '500 XP'; p_value := 500;
    when 8 then p_type := 'xp'; p_label := '75 XP'; p_value := 75;
    when 9 then p_type := 'xp'; p_label := '150 XP'; p_value := 150;
    when 10 then p_type := 'xp'; p_label := '300 XP'; p_value := 300;
    when 11 then p_type := 'joker'; p_label := 'Extra Joker'; p_value := 1;
  end case;

  update public.profiles set last_wheel_spin_date = today where id = uid;

  if p_type = 'xp' then
    update public.profiles set xp = xp + p_value, level = ((xp + p_value) / 1000) + 1 where id = uid;
  elsif p_type = 'joker' then
    update public.profiles set jokers_remaining = jokers_remaining + p_value where id = uid;
  elsif p_type = 'coins' then
    update public.profiles set coins = coins + p_value where id = uid;
  elsif p_type = 'booster' then
    update public.profiles set booster_charges = booster_charges + p_value where id = uid;
  elsif p_type = 'title' then
    insert into public.user_titles (user_id, title) values (uid, p_label) on conflict do nothing;
    update public.profiles set equipped_title = p_label where id = uid;
  end if;

  return query select idx, p_type, p_label, p_value;
end;
$$;

-- ---------------------------------------------------------------------------
-- rewrite scoring: joker types, booster, and xp/streak duel resolution
-- ---------------------------------------------------------------------------
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
  is_correct boolean;
  c_metric numeric;
  o_metric numeric;
  win uuid;
begin
  if new.status = 'finished'
     and new.home_score is not null
     and new.away_score is not null
     and (old.status is distinct from new.status or old.home_score is distinct from new.home_score or old.away_score is distinct from new.away_score) then

    actual_diff := new.home_score - new.away_score;

    for tip in select * from public.tips where match_id = new.id loop
      tip_diff := tip.home_score - tip.away_score;
      is_correct := false;

      if tip.home_score = new.home_score and tip.away_score = new.away_score then
        earned := 5;
        is_correct := true;
      elsif sign(tip_diff) = sign(actual_diff) then
        earned := 3;
        is_correct := true;
      else
        earned := 0;
      end if;

      if tip.joker_type = 'boost' and is_correct then
        earned := earned * 2;
      elsif tip.joker_type = 'risk' and is_correct then
        earned := round(earned * (0.5 + random()))::int;
      elsif tip.joker_type = 'safe' and not is_correct then
        earned := 1;
      end if;

      if tip.booster_applied and earned > 0 then
        earned := earned * 2;
      end if;

      update public.tips
      set points_earned = earned
      where id = tip.id;

      if tip.points_earned is null then
        update public.profiles
        set points = points + earned,
            correct_tips_count = correct_tips_count + (case when is_correct then 1 else 0 end)
        where id = tip.user_id;
      else
        update public.profiles
        set points = points + earned - tip.points_earned
        where id = tip.user_id;
      end if;
    end loop;

    if not exists (
      select 1 from public.matches
      where matchday_id = new.matchday_id and status <> 'finished'
    ) then
      for duel in
        select * from public.duels
        where matchday_id = new.matchday_id and status = 'accepted'
      loop
        if duel.duel_type = 'xp' then
          select xp - coalesce(duel.challenger_xp_start, 0) into c_metric from public.profiles where id = duel.challenger_id;
          select xp - coalesce(duel.opponent_xp_start, 0) into o_metric from public.profiles where id = duel.opponent_id;
        elsif duel.duel_type = 'streak' then
          select login_streak into c_metric from public.profiles where id = duel.challenger_id;
          select login_streak into o_metric from public.profiles where id = duel.opponent_id;
        else
          select coalesce(sum(t.points_earned), 0) into c_metric
            from public.tips t join public.matches m on m.id = t.match_id
            where t.user_id = duel.challenger_id and m.matchday_id = duel.matchday_id;
          select coalesce(sum(t.points_earned), 0) into o_metric
            from public.tips t join public.matches m on m.id = t.match_id
            where t.user_id = duel.opponent_id and m.matchday_id = duel.matchday_id;
        end if;

        win := case
          when c_metric > o_metric then duel.challenger_id
          when o_metric > c_metric then duel.opponent_id
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
