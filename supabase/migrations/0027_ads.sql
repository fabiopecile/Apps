-- Native ads: a sponsored post in the feed and a sponsored story, both
-- looking like the surrounding content rather than a banner strip.
--
-- Pro subscribers see none of this - that is what they are paying for, so the
-- filtering happens client-side on is_pro and the ads simply are not fetched.

create table public.ads (
  id uuid primary key default gen_random_uuid(),

  -- Who the ad is for, shown where a post would show its author.
  advertiser_name text not null,
  advertiser_avatar_url text,

  image_url text not null,
  -- Feed ads follow the same framing as posts; story ads are 9:16.
  image_aspect_ratio real,
  caption text,

  -- Where the tap goes, and what the button says.
  target_url text not null,
  cta_label text not null default 'Mehr erfahren',

  placement text not null default 'both' check (placement in ('feed', 'story', 'both')),

  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  -- Higher runs first when several ads are eligible.
  priority int not null default 0,

  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index ads_active_idx on public.ads (active, placement, priority desc);

alter table public.ads enable row level security;

-- Everyone signed in may read the ads that are currently running. The date
-- window is enforced here rather than only in the client so an ad cannot be
-- pulled before it starts or after it ends.
create policy "running ads are readable" on public.ads
  for select using (
    active
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
  );

create policy "admins see all ads" on public.ads
  for select using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));
create policy "admins manage ads" on public.ads
  for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- ---------------------------------------------------------------------------
-- What advertisers get billed on
-- ---------------------------------------------------------------------------
create table public.ad_events (
  id bigserial primary key,
  ad_id uuid not null references public.ads (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  event_type text not null check (event_type in ('impression', 'click')),
  placement text not null check (placement in ('feed', 'story')),
  created_at timestamptz not null default now()
);

create index ad_events_ad_idx on public.ad_events (ad_id, event_type, created_at);

alter table public.ad_events enable row level security;
create policy "admins read ad events" on public.ad_events
  for select using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));
-- Writing goes through the function below, not straight from the client.

-- Counts one view or tap. SECURITY DEFINER so users can record their own
-- events without being able to read anyone's, and without an insert policy
-- that would let them forge events for an ad they never saw en masse.
create or replace function public.log_ad_event(
  p_ad_id uuid,
  p_event_type text,
  p_placement text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  if p_event_type not in ('impression', 'click') then
    raise exception 'Unbekannter Ereignistyp';
  end if;

  insert into public.ad_events (ad_id, user_id, event_type, placement)
  values (p_ad_id, auth.uid(), p_event_type, p_placement);
end;
$$;

revoke all on function public.log_ad_event(uuid, text, text) from public;
grant execute on function public.log_ad_event(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Reporting for the admin screen
-- ---------------------------------------------------------------------------
create or replace function public.ad_stats()
returns table (
  ad_id uuid,
  advertiser_name text,
  impressions bigint,
  clicks bigint
)
language sql
security definer
stable
set search_path = public
as $$
  select
    a.id,
    a.advertiser_name,
    count(*) filter (where e.event_type = 'impression') as impressions,
    count(*) filter (where e.event_type = 'click') as clicks
  from public.ads a
  left join public.ad_events e on e.ad_id = a.id
  where exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  group by a.id, a.advertiser_name
  order by a.created_at desc;
$$;

revoke all on function public.ad_stats() from public;
grant execute on function public.ad_stats() to authenticated;
