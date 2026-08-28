-- Badges, die man tatsächlich bekommen kann.
--
-- Die Tabellen gab es seit 0001, vier Badges wurden in 0002 eingetragen - aber
-- nichts hat je eine Zeile in user_badges geschrieben. Jeder Spieler sah vier
-- Schlösser, für immer. Das ist schlimmer als gar keine Badges: es sieht aus
-- wie ein Versprechen, das nie eingelöst wird.
--
-- Alles wird aus vorhandenen Daten abgeleitet und ist wiederholbar: Der Zustand
-- eines Badges ist eine Frage an die Datenbank, kein Zähler, der danebenlaufen
-- kann. Wer die Bedingung erfüllt, hat es - egal ob der passende Trigger beim
-- entscheidenden Moment lief oder nicht.

alter table public.badges
  add column if not exists sort_order int not null default 0;

-- Eigene Symbole statt Emojis: `icon` benennt jetzt eine selbst gezeichnete
-- Form aus components/BadgeIcon.tsx, keinen Zeichensatz-Namen.
update public.badges set
  name = 'Erster Tipp', description = 'Deinen ersten Tipp abgegeben',
  icon = 'flag', sort_order = 1
  where code = 'first_tip';
update public.badges set
  name = 'Heiße Serie', description = '5 richtige Tipps hintereinander',
  icon = 'flame', sort_order = 3
  where code = 'hot_streak';
update public.badges set
  name = 'Podium', description = 'Am Monatsende unter den ersten drei',
  icon = 'podium', sort_order = 9
  where code = 'top_3';
update public.badges set
  name = 'Stimmungsmacher', description = '10 Beiträge geschrieben',
  icon = 'bubbles', sort_order = 6
  where code = 'social_butterfly';

insert into public.badges (code, name, description, icon, sort_order) values
  ('sniper',     'Scharfschütze', '10 exakte Ergebnisse getroffen',   'target',   4),
  ('regular',    'Stammgast',     '30 Tage Login-Serie gehalten',     'calendar', 5),
  ('ambassador', 'Botschafter',   '3 Freunde eingeladen',             'network',  7),
  ('climber',    'Aufsteiger',    'Level 10 erreicht',                'chevrons', 8),
  ('insured',    'Vorsorger',     'Einen Spieltag versichert',        'shield',   2)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  sort_order = excluded.sort_order;

-- ---------------------------------------------------------------------------
-- Vergeben
-- ---------------------------------------------------------------------------
create or replace function public.award_badge(p_user_id uuid, p_code text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.user_badges (user_id, badge_id)
  select p_user_id, b.id from public.badges b where b.code = p_code
  on conflict do nothing;
$$;

revoke all on function public.award_badge(uuid, text) from public;

-- Prüft alle Bedingungen für einen Spieler und trägt nach, was fehlt.
-- Bewusst idempotent: mehrfach aufrufen ändert nichts, und ein Badge, das
-- durch einen verpassten Trigger nie vergeben wurde, kommt beim nächsten
-- Anlass von selbst dazu.
create or replace function public.refresh_badges(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  prof record;
  exact_hits int;
  post_count int;
  invited int;
  longest_ok int;
begin
  select * into prof from public.profiles where id = p_user_id;
  if not found then
    return;
  end if;

  if prof.tips_count >= 1 then
    perform public.award_badge(p_user_id, 'first_tip');
  end if;

  if prof.level >= 10 then
    perform public.award_badge(p_user_id, 'climber');
  end if;

  if prof.login_streak >= 30 then
    perform public.award_badge(p_user_id, 'regular');
  end if;

  select count(*) into post_count from public.posts where user_id = p_user_id;
  if post_count >= 10 then
    perform public.award_badge(p_user_id, 'social_butterfly');
  end if;

  select count(*) into invited from public.referrals where referrer_id = p_user_id;
  if invited >= 3 then
    perform public.award_badge(p_user_id, 'ambassador');
  end if;

  -- Exakt heißt exakt: points_earned kann durch Joker und Booster verändert
  -- sein und taugt deshalb nicht als Maß dafür, ob das Ergebnis stimmte.
  select count(*) into exact_hits
  from public.tips t
  join public.matches m on m.id = t.match_id
  where t.user_id = p_user_id
    and m.status = 'finished'
    and t.home_score = m.home_score
    and t.away_score = m.away_score;
  if exact_hits >= 10 then
    perform public.award_badge(p_user_id, 'sniper');
  end if;

  if exists (select 1 from public.tip_insurances where user_id = p_user_id) then
    perform public.award_badge(p_user_id, 'insured');
  end if;

  -- Längste Serie richtiger Tipps, nach Anstoßzeit geordnet. Die Differenz
  -- zweier Zeilennummern ist innerhalb einer ununterbrochenen Serie konstant -
  -- daran lassen sich die Serien gruppieren und zählen.
  with scored as (
    select
      coalesce(t.points_earned, 0) > 0 as ok,
      row_number() over (order by m.kickoff, m.id) as rn
    from public.tips t
    join public.matches m on m.id = t.match_id
    where t.user_id = p_user_id and t.points_earned is not null
  ),
  runs as (
    select ok, rn - row_number() over (partition by ok order by rn) as grp
    from scored
  )
  select coalesce(max(cnt), 0) into longest_ok
  from (select count(*) as cnt from runs where ok group by grp) c;

  if longest_ok >= 5 then
    perform public.award_badge(p_user_id, 'hot_streak');
  end if;
end;
$$;

revoke all on function public.refresh_badges(uuid) from public;
-- Der Client darf für sich selbst nachrechnen lassen: die Funktion vergibt nur,
-- was die Daten ohnehin hergeben, und liest nichts Fremdes.
grant execute on function public.refresh_badges(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Auslöser
-- ---------------------------------------------------------------------------
create or replace function public.refresh_badges_for_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_badges(new.user_id);
  return new;
end;
$$;

drop trigger if exists badges_after_tip on public.tips;
create trigger badges_after_tip
  after insert on public.tips
  for each row execute function public.refresh_badges_for_row();

drop trigger if exists badges_after_scoring on public.tips;
create trigger badges_after_scoring
  after update of points_earned on public.tips
  for each row when (new.points_earned is not null)
  execute function public.refresh_badges_for_row();

drop trigger if exists badges_after_post on public.posts;
create trigger badges_after_post
  after insert on public.posts
  for each row execute function public.refresh_badges_for_row();

drop trigger if exists badges_after_insurance on public.tip_insurances;
create trigger badges_after_insurance
  after insert on public.tip_insurances
  for each row execute function public.refresh_badges_for_row();

-- profiles heißt die Spalte id, nicht user_id - deshalb ein eigener Trigger.
create or replace function public.refresh_badges_for_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_badges(new.id);
  return new;
end;
$$;

drop trigger if exists badges_after_level_or_streak on public.profiles;
create trigger badges_after_level_or_streak
  after update of level, login_streak on public.profiles
  for each row
  when (new.level is distinct from old.level or new.login_streak is distinct from old.login_streak)
  execute function public.refresh_badges_for_profile();

-- Bei einer Empfehlung zählt der Werber, nicht der Geworbene.
create or replace function public.refresh_badges_for_referrer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_badges(new.referrer_id);
  return new;
end;
$$;

drop trigger if exists badges_after_referral on public.referrals;
create trigger badges_after_referral
  after insert on public.referrals
  for each row execute function public.refresh_badges_for_referrer();

-- ---------------------------------------------------------------------------
-- Podium
-- ---------------------------------------------------------------------------
-- Bewusst nicht in refresh_badges: die Monatswertung geht über alle Tipps aller
-- Spieler, und das bei jedem einzelnen gewerteten Tipp neu zu rechnen wäre
-- teuer für ein Badge, das sich einmal im Monat ändert.
create or replace function public.award_monthly_podium(p_period date default null)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  period_start date := coalesce(p_period, (date_trunc('month', now()) - interval '1 month')::date);
  winner record;
  awarded int := 0;
begin
  for winner in
    select s.user_id
    from public.monthly_scores s
    where s.period = period_start
    order by s.points desc
    limit 3
  loop
    perform public.award_badge(winner.user_id, 'top_3');
    awarded := awarded + 1;
  end loop;

  return awarded;
end;
$$;

revoke all on function public.award_monthly_podium(date) from public;

-- Am zweiten Tag des Monats um 04:00 UTC für den abgelaufenen Monat.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('award-monthly-podium')
      where exists (select 1 from cron.job where jobname = 'award-monthly-podium');
    perform cron.schedule('award-monthly-podium', '0 4 2 * *', 'select public.award_monthly_podium();');
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Nachtragen, was bisher niemand bekommen konnte
-- ---------------------------------------------------------------------------
do $$
declare
  u record;
begin
  for u in select id from public.profiles loop
    perform public.refresh_badges(u.id);
  end loop;
end;
$$;
