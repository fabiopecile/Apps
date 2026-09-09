-- Freunde einladen: every profile gets a short referral code. A new user can
-- enter someone else's code at signup; the referrer gets a one-time reward
-- once the referred account is created (handled inside handle_new_user so it
-- works regardless of email confirmation timing).

alter table public.profiles
  add column referral_code text;

update public.profiles
  set referral_code = upper(substr(md5(id::text), 1, 6))
  where referral_code is null;

alter table public.profiles
  alter column referral_code set not null,
  add constraint profiles_referral_code_key unique (referral_code);

create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles (id) on delete cascade,
  referred_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (referred_id),
  check (referrer_id <> referred_id)
);

alter table public.referrals enable row level security;
create policy "users can see referrals they made" on public.referrals for select using (auth.uid() = referrer_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_code text := upper(substr(md5(new.id::text), 1, 6));
  ref_code text := new.raw_user_meta_data ->> 'referral_code';
  referrer_id uuid;
begin
  insert into public.profiles (id, username, display_name, referral_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)) || '_' || substr(new.id::text, 1, 4),
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    new_code
  );

  if ref_code is not null and length(trim(ref_code)) > 0 then
    select id into referrer_id from public.profiles where referral_code = upper(trim(ref_code)) limit 1;
    if referrer_id is not null then
      insert into public.referrals (referrer_id, referred_id) values (referrer_id, new.id);
      update public.profiles
        set xp = xp + 100,
            level = ((xp + 100) / 1000) + 1,
            jokers_remaining = jokers_remaining + 1
        where id = referrer_id;
    end if;
  end if;

  return new;
end;
$$;
