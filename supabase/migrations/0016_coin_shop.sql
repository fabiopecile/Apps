-- Coin-Shop: coins (currently only earned from the Glücksrad) can now be
-- spent on purely cosmetic items - avatar-Rahmenfarben and Titel. Titel
-- reuse the existing user_titles/equipped_title mechanism from the wheel.

alter table public.profiles
  add column equipped_frame_color text;

create table public.shop_items (
  key text primary key,
  kind text not null check (kind in ('frame', 'title')),
  label text not null,
  price int not null,
  value text not null, -- hex color for 'frame', title text for 'title'
  sort_order int not null default 0
);

alter table public.shop_items enable row level security;
create policy "shop items are publicly readable" on public.shop_items for select using (true);

insert into public.shop_items (key, kind, label, price, value, sort_order) values
  ('frame_blue', 'frame', 'Blauer Rahmen', 50, '#3b82f6', 1),
  ('frame_green', 'frame', 'Grüner Rahmen', 50, '#22c55e', 2),
  ('frame_purple', 'frame', 'Lila Rahmen', 75, '#a855f7', 3),
  ('frame_gold', 'frame', 'Goldener Rahmen', 150, '#fbbf24', 4),
  ('title_experte', 'title', 'Fußball-Experte', 60, 'Fußball-Experte', 5),
  ('title_torjaeger', 'title', 'Torjäger', 80, 'Torjäger', 6),
  ('title_legende', 'title', 'Legende', 120, 'Legende', 7);

create table public.owned_shop_items (
  user_id uuid not null references public.profiles (id) on delete cascade,
  item_key text not null references public.shop_items (key) on delete cascade,
  purchased_at timestamptz not null default now(),
  primary key (user_id, item_key)
);

alter table public.owned_shop_items enable row level security;
create policy "users can see their own purchases" on public.owned_shop_items for select using (auth.uid() = user_id);

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

  update public.profiles set coins = coins - item.price
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

create or replace function public.equip_shop_item(p_key text)
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

  if not exists (select 1 from public.owned_shop_items where user_id = auth.uid() and item_key = p_key) then
    raise exception 'Nicht im Besitz';
  end if;

  if item.kind = 'frame' then
    update public.profiles set equipped_frame_color = item.value where id = auth.uid() returning * into updated;
  else
    update public.profiles set equipped_title = item.value where id = auth.uid() returning * into updated;
  end if;

  return updated;
end;
$$;
