-- Buying coins with real money. Coins previously only came from the daily
-- wheel (25 at a time), which made the 200-600 coin shop items unreachable.
--
-- The important part is the ledger: crediting goes through
-- credit_coin_purchase(), which is keyed on the payment provider's own
-- reference. Stripe retries webhooks, so without that key a retry would
-- credit the same purchase twice.

-- ---------------------------------------------------------------------------
-- What's for sale
-- ---------------------------------------------------------------------------
create table public.coin_packages (
  key text primary key,
  coins int not null check (coins > 0),
  bonus_coins int not null default 0 check (bonus_coins >= 0),
  price_cents int not null check (price_cents > 0),
  currency text not null default 'eur',
  label text not null,
  sort_order int not null default 0,
  active boolean not null default true
);

alter table public.coin_packages enable row level security;
create policy "coin packages are readable" on public.coin_packages
  for select using (true);

insert into public.coin_packages (key, coins, bonus_coins, price_cents, label, sort_order) values
  ('coins_500',  500,    0,  199, 'Kleines Paket',  1),
  ('coins_1200', 1200, 150,  399, 'Mittleres Paket', 2),
  ('coins_3000', 3000, 600,  899, 'Großes Paket',   3),
  ('coins_7500', 7500, 2000, 1799, 'Riesenpaket',   4);

-- ---------------------------------------------------------------------------
-- The ledger
-- ---------------------------------------------------------------------------
create table public.coin_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  package_key text not null references public.coin_packages (key),
  coins_credited int not null,
  price_cents int not null,
  provider text not null check (provider in ('stripe', 'apple', 'google')),
  -- The provider's own id for this payment. Unique, so a replayed webhook
  -- (or a retried StoreKit receipt) can't credit the same purchase twice.
  provider_ref text not null,
  created_at timestamptz not null default now(),
  unique (provider, provider_ref)
);

alter table public.coin_purchases enable row level security;
create policy "users can see their own purchases" on public.coin_purchases
  for select using (auth.uid() = user_id);
create policy "admins can see all purchases" on public.coin_purchases
  for select using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));
-- No insert policy on purpose: only the service role (the webhook) writes here.

-- ---------------------------------------------------------------------------
-- Crediting
-- ---------------------------------------------------------------------------
-- Returns the number of coins credited, or 0 when this provider_ref was
-- already processed. Never raises on a duplicate - the webhook should still
-- get its 200 back so Stripe stops retrying.
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

  update public.profiles set coins = coins + total where id = p_user_id;
  return total;
end;
$$;

revoke all on function public.credit_coin_purchase(uuid, text, text, text) from public;
-- Only the service role calls this; authenticated users must never credit
-- themselves, so no grant to `authenticated`.
