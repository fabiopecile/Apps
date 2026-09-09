-- Makes the coin economy add up.
--
-- Before this, coins came from exactly one of the wheel's twelve slots, 25 at
-- a time - roughly 2 coins a day. The cheapest frame cost 200, so the free
-- path to it was about three months, and the most expensive one nearly a
-- year. With coin packages now on sale that read as "pay or wait forever",
-- which is exactly the resentment we don't want for what is only cosmetics.

-- ---------------------------------------------------------------------------
-- Coins for correct tips
-- ---------------------------------------------------------------------------
-- A separate trigger rather than an edit to score_match_tips(): that function
-- is long and gets rewritten whenever the scoring rules change, and every
-- rewrite would have to remember to carry the coin logic along.
create or replace function public.award_tip_coins()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only when a tip is scored for the first time, and only when it scored.
  -- A re-scored match (corrected final result) must not pay out twice.
  if old.points_earned is null and new.points_earned is not null and new.points_earned > 0 then
    update public.profiles
    set coins = coins + 10
    where id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists award_tip_coins_trigger on public.tips;
create trigger award_tip_coins_trigger
  after update of points_earned on public.tips
  for each row execute function public.award_tip_coins();

-- ---------------------------------------------------------------------------
-- Prices to match
-- ---------------------------------------------------------------------------
-- A player who tips a full matchday and gets about half right now earns
-- ~45 coins a matchday, plus the wheel. That puts the cheapest frame at
-- roughly two to three weeks of playing and the gold one at a third of a
-- season - long enough to be worth something, short enough to be reachable
-- without paying.
update public.shop_items set price = 150 where key = 'frame_blue';
update public.shop_items set price = 150 where key = 'frame_green';
update public.shop_items set price = 250 where key = 'frame_purple';
update public.shop_items set price = 400 where key = 'frame_gold';
update public.shop_items set price = 200 where key = 'title_experte';
update public.shop_items set price = 275 where key = 'title_torjaeger';
update public.shop_items set price = 400 where key = 'title_legende';
