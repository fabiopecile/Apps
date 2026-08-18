-- Leveling up grants a Joker, regardless of which action (post XP, streak,
-- duel win, wheel prize) pushed the user's xp over the threshold.
create or replace function public.grant_level_up_reward()
returns trigger
language plpgsql
as $$
begin
  if new.level > old.level then
    new.jokers_remaining := old.jokers_remaining + (new.level - old.level);
  end if;
  return new;
end;
$$;

create trigger profiles_level_up_reward
  before update on public.profiles
  for each row
  when (new.level is distinct from old.level)
  execute function public.grant_level_up_reward();
