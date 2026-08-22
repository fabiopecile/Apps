-- 1. Post XP is now once per day. Previously every post granted +50 XP, so
--    posting ten photos in a row was ten times the XP. A dedicated column
--    (rather than counting today's posts) keeps this correct even if a post
--    is later deleted or removed by moderation.
alter table public.profiles
  add column last_post_xp_date date;

create or replace function public.handle_new_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := (now() at time zone 'utc')::date;
begin
  update public.profiles
  set xp = xp + 50,
      level = ((xp + 50) / 1000) + 1,
      last_post_xp_date = today
  where id = new.user_id
    and (last_post_xp_date is null or last_post_xp_date < today);

  return new;
end;
$$;

-- 2. Stories get the same crop treatment as posts (fixed 9:16). Storing the
--    ratio lets the viewer fill the screen for cropped stories while older,
--    uncropped ones keep being letterboxed instead of cut off.
alter table public.stories
  add column media_aspect_ratio real;
