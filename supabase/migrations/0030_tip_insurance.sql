-- The tip insurance: pay coins before a matchday starts, and a bad matchday
-- gets topped up to a floor instead of costing you the round.
--
-- The rule that shapes everything here: it can only be paid with coins that
-- were EARNED (correct tips, wheel, level-ups), never with coins that were
-- bought for money. The moment real money can buy points, this stops being a
-- tipping game and becomes pay-to-win - and Apple and Google read it the same
-- way. One balance with a purchased-coins marker keeps that line enforceable
-- in the database rather than in the UI, where it could be worked around.

-- ---------------------------------------------------------------------------
-- Which coins came from a wallet
-- ---------------------------------------------------------------------------
-- profiles.coins stays the single balance every existing screen reads. This
-- column only records how much of that balance was bought, so
-- "earned = coins - purchased_coins" is always derivable.
alter table public.profiles
  add column if not exists purchased_coins int not null default 0;

comment on column public.profiles.purchased_coins is
  'How much of the current coins balance was bought with money. Earned coins = coins - purchased_coins; only earned coins may buy a tip insurance.';

-- Crediting a purchase raises both.
create or replace function public.credit_coin_purchase(
  p_user_id uuid,
  p_package_key text,
  p_provider text,
  p_provider_ref text
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  pkg public.coin_packages%rowtype;
  total int;
  inserted int;
begin
  select * into pkg from public.coin_packages where key = p_package_key;
  if not found then
    raise exception 'Unbekanntes Coin-Paket: %', p_package_key;
  end if;

  total := pkg.coins + pkg.bonus_coins;

  insert into public.coin_purchases (user_id, package_key, coins_credited, price_cents, provider, provider_ref)
  values (p_user_id, p_package_key, total, pkg.price_cents, p_provider, p_provider_ref)
  on conflict (provider, provider_ref) do nothing;

  get diagnostics inserted = row_count;
  if inserted = 0 then
    return 0;
  end if;

  update public.profiles
  set coins = coins + total,
      purchased_coins = purchased_coins + total
  where id = p_user_id;
  return total;
end;
$$;

revoke all on function public.credit_coin_purchase(uuid, text, text, text) from public;

-- Cosmetics spend the bought coins first. That is the generous reading and the
-- safe one: it can only ever leave MORE earned coins behind, never fewer, so
-- nobody loses insurance money by buying a frame.
create or replace function public.buy_shop_item(p_key text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  item public.shop_items;
  updated public.profiles;
begin
  select * into item from public.shop_items where key = p_key;
  if item.key is null then
    raise exception 'Artikel nicht gefunden';
  end if;

  if exists (select 1 from public.owned_shop_items where user_id = auth.uid() and item_key = p_key) then
    raise exception 'Bereits gekauft';
  end if;

  update public.profiles
  set coins = coins - item.price,
      purchased_coins = greatest(0, purchased_coins - item.price)
  where id = auth.uid() and coins >= item.price
  returning * into updated;

  if updated.id is null then
    raise exception 'Nicht genug Coins';
  end if;

  insert into public.owned_shop_items (user_id, item_key) values (auth.uid(), p_key);

  if item.kind = 'title' then
    insert into public.user_titles (user_id, title) values (auth.uid(), item.value) on conflict do nothing;
  end if;

  return updated;
end;
$$;

-- ---------------------------------------------------------------------------
-- The policies
-- ---------------------------------------------------------------------------
create table if not exists public.tip_insurances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  matchday_id uuid not null references public.matchdays (id) on delete cascade,
  -- What it cost, kept on the row: changing the price later must not rewrite
  -- what somebody already paid.
  cost int not null,
  -- The guarantee, per match actually tipped. Also frozen at purchase time.
  points_per_tip int not null default 1,
  -- Null until the matchday is fully played; 0 means it did not pay out.
  points_awarded int,
  settled_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, matchday_id)
);

create index if not exists tip_insurances_matchday_idx
  on public.tip_insurances (matchday_id) where settled_at is null;

alter table public.tip_insurances enable row level security;

create policy "users see their own insurances" on public.tip_insurances
  for select using (auth.uid() = user_id);
-- No insert/update/delete policy on purpose: buying goes through the function
-- below, settling happens in a trigger. A client that could insert rows here
-- could insure a matchday for free, or after seeing the results.

-- ---------------------------------------------------------------------------
-- Buying one
-- ---------------------------------------------------------------------------
create or replace function public.insure_matchday(p_matchday_id uuid)
returns public.tip_insurances
language plpgsql
security definer
set search_path = public
as $$
declare
  -- The two numbers worth tuning. 150 is roughly three matchdays of tipping,
  -- and one point per tipped match sits below the average return of ~1.7, so
  -- the policy pays out on a clearly bad round and not on a normal one.
  c_cost constant int := 150;
  c_points_per_tip constant int := 1;
  md public.matchdays%rowtype;
  earned int;
  result public.tip_insurances;
begin
  if auth.uid() is null then
    raise exception 'Nicht angemeldet';
  end if;

  select * into md from public.matchdays where id = p_matchday_id;
  if not found then
    raise exception 'Spieltag nicht gefunden';
  end if;
  if md.deadline <= now() then
    raise exception 'Der Spieltag hat schon begonnen';
  end if;
  if exists (
    select 1 from public.tip_insurances
    where user_id = auth.uid() and matchday_id = p_matchday_id
  ) then
    raise exception 'Dieser Spieltag ist bereits versichert';
  end if;

  select coins - purchased_coins into earned from public.profiles where id = auth.uid();
  if coalesce(earned, 0) < c_cost then
    raise exception 'Dafür brauchst du % verdiente Coins. Gekaufte Coins zählen hier nicht.', c_cost;
  end if;

  -- Only the balance moves: purchased_coins stays where it is, so this can
  -- only ever be paid out of the earned part.
  update public.profiles set coins = coins - c_cost where id = auth.uid();

  insert into public.tip_insurances (user_id, matchday_id, cost, points_per_tip)
  values (auth.uid(), p_matchday_id, c_cost, c_points_per_tip)
  returning * into result;

  return result;
end;
$$;

revoke all on function public.insure_matchday(uuid) from public;
grant execute on function public.insure_matchday(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Paying one out
-- ---------------------------------------------------------------------------
-- Runs once the last match of the matchday is finished, so the whole round is
-- scored before the floor is compared against it.
create or replace function public.settle_matchday_insurances()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ins record;
  tips_n int;
  actual int;
  guarantee int;
  payout int;
begin
  if new.status is distinct from 'finished' then
    return new;
  end if;
  if exists (
    select 1 from public.matches
    where matchday_id = new.matchday_id and status is distinct from 'finished'
  ) then
    return new;
  end if;

  for ins in
    select * from public.tip_insurances
    where matchday_id = new.matchday_id and settled_at is null
  loop
    select count(*), coalesce(sum(t.points_earned), 0)
      into tips_n, actual
      from public.tips t
      join public.matches m on m.id = t.match_id
      where m.matchday_id = new.matchday_id
        and t.user_id = ins.user_id
        and t.points_earned is not null;

    -- The guarantee is per match actually tipped, so somebody who insured and
    -- then skipped the round gets nothing rather than free points.
    guarantee := tips_n * ins.points_per_tip;
    payout := greatest(0, guarantee - actual);

    if payout > 0 then
      update public.profiles set points = points + payout where id = ins.user_id;
    end if;

    update public.tip_insurances
    set points_awarded = payout, settled_at = now()
    where id = ins.id;
  end loop;

  return new;
end;
$$;

-- Named to sort after on_match_scored: both fire AFTER UPDATE on the same row,
-- Postgres runs them in name order, and settling before the tips are scored
-- would read this matchday's points as zero and overpay every policy.
drop trigger if exists zz_settle_matchday_insurances on public.matches;
create trigger zz_settle_matchday_insurances
  after update of status, home_score, away_score on public.matches
  for each row execute function public.settle_matchday_insurances();

-- ---------------------------------------------------------------------------
-- Keep the monthly leaderboard honest
-- ---------------------------------------------------------------------------
-- monthly_scores sums points out of tips. A payout lives on the insurance row,
-- so without this the monthly table and profiles.points would disagree - and
-- the monthly table is the one the prize is decided on.
create or replace view public.monthly_scores as
  with tip_points as (
    select
      t.user_id,
      date_trunc('month', m.kickoff)::date as period,
      coalesce(t.points_earned, 0) as points,
      case when coalesce(t.points_earned, 0) > 0 then 1 else 0 end as correct,
      1 as tips
    from public.tips t
    join public.matches m on m.id = t.match_id
    where t.points_earned is not null
  ),
  insurance_points as (
    select
      i.user_id,
      date_trunc('month', md.deadline)::date as period,
      i.points_awarded as points,
      0 as correct,
      -- An insurance is not a tip; counting it would inflate the tip count the
      -- prize eligibility rule (min_tips) is checked against.
      0 as tips
    from public.tip_insurances i
    join public.matchdays md on md.id = i.matchday_id
    where coalesce(i.points_awarded, 0) > 0
  )
  select
    user_id,
    period,
    sum(points)::int as points,
    sum(correct)::int as correct_tips,
    sum(tips)::int as tips_count
  from (
    select * from tip_points
    union all
    select * from insurance_points
  ) combined
  group by user_id, period;

grant select on public.monthly_scores to authenticated;
