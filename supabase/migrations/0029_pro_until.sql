-- Pro that can expire.
--
-- is_pro was a plain on/off flag driven by the Stripe webhook. Handing someone
-- "three months Pro" as a prize meant switching it on with nothing to switch
-- it off again - every gift was effectively permanent, and keeping track of
-- dozens of end dates by hand is a promise nobody keeps.
--
-- Two sources now, deliberately kept apart:
--   is_pro    - a paying Stripe subscription, no end date, the webhook owns it
--   pro_until - Pro granted until a date; prizes, comps, testing
-- Either one grants access, so a paying subscriber who also wins a month
-- keeps working exactly as before.

alter table public.profiles
  add column if not exists pro_until timestamptz;

comment on column public.profiles.pro_until is
  'Pro access granted until this moment (prizes, comps). Independent of the Stripe subscription in is_pro - either grants access.';

-- The one place that decides. Everything server-side asks this rather than
-- reading a column, so the two sources can never drift apart.
create or replace function public.has_pro(p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select is_pro or (pro_until is not null and pro_until > now())
     from public.profiles where id = p_user_id),
    false
  );
$$;

revoke all on function public.has_pro(uuid) from public;
grant execute on function public.has_pro(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Granting it
-- ---------------------------------------------------------------------------
-- Extends from whichever is later: now, or the end of what they already have.
-- Awarding a second month to someone mid-gift adds to it instead of cutting
-- it short.
create or replace function public.grant_pro_months(p_user_id uuid, p_months int)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  new_until timestamptz;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin) then
    raise exception 'Nur Admins können Pro vergeben';
  end if;
  if p_months = 0 then
    raise exception 'Keine Dauer angegeben';
  end if;

  select greatest(coalesce(pro_until, now()), now()) + make_interval(months => p_months)
    into new_until
  from public.profiles
  where id = p_user_id;

  if new_until is null then
    raise exception 'Nutzer nicht gefunden';
  end if;

  -- A negative month count walks it back, which is how a mistaken grant gets
  -- undone; never leave it dangling in the past pretending to be active.
  if new_until <= now() then
    new_until := null;
  end if;

  update public.profiles set pro_until = new_until where id = p_user_id;
  return new_until;
end;
$$;

revoke all on function public.grant_pro_months(uuid, int) from public;
grant execute on function public.grant_pro_months(uuid, int) to authenticated;
