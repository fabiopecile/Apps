-- Remembers whether someone has seen the intro. Stored on the profile rather
-- than on the device so a reinstall or a second device doesn't show it again.
alter table public.profiles
  add column onboarding_done boolean not null default false;

-- Everyone who already has an account has found their way around by now.
update public.profiles set onboarding_done = true;
