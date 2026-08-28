-- Joker: mindestens drei zu jedem Spieltag.
--
-- jokers_remaining started at 3 and was never reset, so it behaved as a
-- lifetime account rather than a per-matchday budget - which is not what the
-- rules screen, the intro and the promo all say. Worse for a game with a
-- monthly prize: someone who plays daily accumulates jokers from levels,
-- streaks, referrals and the wheel until they can boost every match of a
-- round, while a player who joined last week has three. That is the same
-- unfairness "kein Pay-to-win" exists to rule out, only bought with time
-- instead of money.
--
-- The fix tops up rather than resets. Nobody loses what they earned; nobody
-- starts a matchday with nothing.

create or replace function public.refill_jokers(p_minimum int default 3)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  topped_up int;
begin
  if p_minimum < 0 then
    raise exception 'Negatives Minimum ergibt keinen Sinn';
  end if;

  -- The where clause is what makes this a top-up: a player sitting on eight
  -- earned jokers is not touched. Writing greatest() without it would still
  -- be correct, but it would rewrite every row every week for nothing.
  update public.profiles
  set jokers_remaining = p_minimum
  where jokers_remaining < p_minimum;

  get diagnostics topped_up = row_count;
  return topped_up;
end;
$$;

comment on function public.refill_jokers(int) is
  'Hebt jeden Spieler auf mindestens p_minimum Joker an. Senkt niemanden ab.';

-- Not reachable from the client: this hands out a game resource, and the only
-- callers are the scheduled job below and the SQL editor.
revoke all on function public.refill_jokers(int) from public;

-- Tuesday 03:00 UTC: the weekend and the Monday game are played, the next
-- round is not yet tippable. Wrapped in a DO block so the migration still
-- applies on a project where pg_cron is not enabled - the function can then be
-- run by hand.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('refill-jokers')
      where exists (select 1 from cron.job where jobname = 'refill-jokers');
    perform cron.schedule('refill-jokers', '0 3 * * 2', 'select public.refill_jokers(3);');
  end if;
end;
$$;

-- Everyone currently below three starts the next round with three.
select public.refill_jokers(3);
