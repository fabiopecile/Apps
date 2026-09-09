-- TeamUp11 schema: tipping game + social feed
-- Run this once against a fresh Supabase project (SQL editor or `supabase db push`).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null,
  display_name text,
  avatar_url text,
  bio text,
  level int not null default 1,
  xp int not null default 0,
  points int not null default 0,
  tips_count int not null default 0,
  correct_tips_count int not null default 0,
  jokers_remaining int not null default 3,
  dark_mode boolean not null default true,
  notifications_enabled boolean not null default true,
  language text not null default 'de',
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'One row per auth.users, public game/social profile.';

-- ---------------------------------------------------------------------------
-- leagues / matchdays / matches
-- ---------------------------------------------------------------------------
create table public.leagues (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  flag_emoji text not null,
  sort_order int not null default 0
);

create table public.matchdays (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues (id) on delete cascade,
  number int not null,
  deadline timestamptz not null,
  unique (league_id, number)
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  matchday_id uuid not null references public.matchdays (id) on delete cascade,
  home_team text not null,
  away_team text not null,
  kickoff timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'live', 'finished')),
  home_score int,
  away_score int
);

create index matches_matchday_idx on public.matches (matchday_id);

-- ---------------------------------------------------------------------------
-- tips
-- ---------------------------------------------------------------------------
create table public.tips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  match_id uuid not null references public.matches (id) on delete cascade,
  home_score int not null check (home_score >= 0),
  away_score int not null check (away_score >= 0),
  is_joker boolean not null default false,
  points_earned int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, match_id)
);

create index tips_user_idx on public.tips (user_id);
create index tips_match_idx on public.tips (match_id);

-- ---------------------------------------------------------------------------
-- social: posts, likes, comments, follows, stories
-- ---------------------------------------------------------------------------
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  image_url text,
  caption text,
  location text,
  created_at timestamptz not null default now()
);

create index posts_created_idx on public.posts (created_at desc);

create table public.post_likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  media_url text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

-- ---------------------------------------------------------------------------
-- chat
-- ---------------------------------------------------------------------------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  is_group boolean not null default false,
  title text,
  created_at timestamptz not null default now()
);

create table public.conversation_participants (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index messages_conversation_idx on public.messages (conversation_id, created_at);

-- ---------------------------------------------------------------------------
-- badges
-- ---------------------------------------------------------------------------
create table public.badges (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  description text,
  icon text not null
);

create table public.user_badges (
  user_id uuid not null references public.profiles (id) on delete cascade,
  badge_id uuid not null references public.badges (id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

-- ---------------------------------------------------------------------------
-- functions & triggers
-- ---------------------------------------------------------------------------

-- Create a profile row whenever a new auth user signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)) || '_' || substr(new.id::text, 1, 4),
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Posting a photo/update earns +50 XP and levels up every 1000 XP (matches the "+50 XP" feed CTA).
create function public.handle_new_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set xp = xp + 50,
      level = ((xp + 50) / 1000) + 1
  where id = new.user_id;
  return new;
end;
$$;

create trigger on_post_created
  after insert on public.posts
  for each row execute function public.handle_new_post();

-- Keep tips_count in sync and enforce the joker budget (3 per matchday-less-simplified: 3 total, matches UI's "3/3").
create function public.handle_new_tip()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_joker then
    update public.profiles
    set jokers_remaining = jokers_remaining - 1
    where id = new.user_id
      and jokers_remaining > 0;

    if not found then
      raise exception 'No jokers remaining';
    end if;
  end if;

  update public.profiles
  set tips_count = tips_count + 1
  where id = new.user_id;

  return new;
end;
$$;

create trigger on_tip_created
  after insert on public.tips
  for each row execute function public.handle_new_tip();

-- Score every tip for a match once the final result is entered (status -> finished).
create function public.score_match_tips()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  tip record;
  earned int;
  actual_diff int;
  tip_diff int;
begin
  if new.status = 'finished'
     and new.home_score is not null
     and new.away_score is not null
     and (old.status is distinct from new.status or old.home_score is distinct from new.home_score or old.away_score is distinct from new.away_score) then

    actual_diff := new.home_score - new.away_score;

    for tip in select * from public.tips where match_id = new.id loop
      tip_diff := tip.home_score - tip.away_score;

      if tip.home_score = new.home_score and tip.away_score = new.away_score then
        earned := 5; -- exact score
      elsif sign(tip_diff) = sign(actual_diff) then
        earned := 3; -- correct tendency (win/draw/loss)
      else
        earned := 0;
      end if;

      if tip.is_joker then
        earned := earned * 2;
      end if;

      update public.tips
      set points_earned = earned
      where id = tip.id;

      update public.profiles
      set points = points + earned - coalesce(tip.points_earned, 0),
          correct_tips_count = correct_tips_count
            + (case when earned > 0 and coalesce(tip.points_earned, -1) <= 0 then 1 else 0 end)
            - (case when earned <= 0 and coalesce(tip.points_earned, -1) > 0 then 1 else 0 end)
      where id = tip.user_id;
    end loop;
  end if;

  return new;
end;
$$;

create trigger on_match_scored
  after update on public.matches
  for each row execute function public.score_match_tips();

-- ---------------------------------------------------------------------------
-- row level security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.leagues enable row level security;
alter table public.matchdays enable row level security;
alter table public.matches enable row level security;
alter table public.tips enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;
alter table public.follows enable row level security;
alter table public.stories enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;

-- profiles: public read, owner write
create policy "profiles are publicly readable" on public.profiles for select using (true);
create policy "users can update own profile" on public.profiles for update using (auth.uid() = id);

-- leagues / matchdays / matches: public read (managed by service role / admin tooling)
create policy "leagues are publicly readable" on public.leagues for select using (true);
create policy "matchdays are publicly readable" on public.matchdays for select using (true);
create policy "matches are publicly readable" on public.matches for select using (true);

-- tips: visible to their owner always; visible to everyone once the match has kicked off (classic "reveal after deadline" rule)
create policy "tips visible to owner or after kickoff" on public.tips for select using (
  auth.uid() = user_id
  or exists (
    select 1 from public.matches m where m.id = match_id and m.kickoff <= now()
  )
);
create policy "users can submit own tips before kickoff" on public.tips for insert with check (
  auth.uid() = user_id
  and exists (select 1 from public.matches m where m.id = match_id and m.kickoff > now())
);
create policy "users can update own tips before kickoff" on public.tips for update using (
  auth.uid() = user_id
  and exists (select 1 from public.matches m where m.id = match_id and m.kickoff > now())
);
create policy "users can delete own tips before kickoff" on public.tips for delete using (
  auth.uid() = user_id
  and exists (select 1 from public.matches m where m.id = match_id and m.kickoff > now())
);

-- posts
create policy "posts are publicly readable" on public.posts for select using (true);
create policy "users can create own posts" on public.posts for insert with check (auth.uid() = user_id);
create policy "users can update own posts" on public.posts for update using (auth.uid() = user_id);
create policy "users can delete own posts" on public.posts for delete using (auth.uid() = user_id);

-- post_likes
create policy "likes are publicly readable" on public.post_likes for select using (true);
create policy "users can like posts" on public.post_likes for insert with check (auth.uid() = user_id);
create policy "users can unlike posts" on public.post_likes for delete using (auth.uid() = user_id);

-- post_comments
create policy "comments are publicly readable" on public.post_comments for select using (true);
create policy "users can comment" on public.post_comments for insert with check (auth.uid() = user_id);
create policy "users can delete own comments" on public.post_comments for delete using (auth.uid() = user_id);

-- follows
create policy "follows are publicly readable" on public.follows for select using (true);
create policy "users can follow others" on public.follows for insert with check (auth.uid() = follower_id);
create policy "users can unfollow" on public.follows for delete using (auth.uid() = follower_id);

-- stories
create policy "stories are publicly readable" on public.stories for select using (expires_at > now());
create policy "users can create own stories" on public.stories for insert with check (auth.uid() = user_id);
create policy "users can delete own stories" on public.stories for delete using (auth.uid() = user_id);

-- conversations: readable/writable only by participants; creation is open (participants added right after in the same flow)
create policy "participants can read conversations" on public.conversations for select using (
  exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = id and cp.user_id = auth.uid()
  )
);
create policy "authenticated users can start conversations" on public.conversations for insert with check (auth.uid() is not null);

create policy "participants can read participant rows" on public.conversation_participants for select using (
  exists (
    select 1 from public.conversation_participants me
    where me.conversation_id = conversation_participants.conversation_id and me.user_id = auth.uid()
  )
);
create policy "users can add themselves or be added by a participant" on public.conversation_participants for insert with check (
  user_id = auth.uid()
  or exists (
    select 1 from public.conversation_participants me
    where me.conversation_id = conversation_participants.conversation_id and me.user_id = auth.uid()
  )
);

create policy "participants can read messages" on public.messages for select using (
  exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid()
  )
);
create policy "participants can send messages" on public.messages for insert with check (
  auth.uid() = sender_id
  and exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid()
  )
);

-- badges
create policy "badges are publicly readable" on public.badges for select using (true);
create policy "user badges are publicly readable" on public.user_badges for select using (true);

-- ---------------------------------------------------------------------------
-- realtime
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.tips;
alter publication supabase_realtime add table public.posts;
