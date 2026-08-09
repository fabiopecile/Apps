-- Demo content so the app has something to show right after setup.
-- Safe to skip/edit — nothing here is required by the app logic.

insert into public.leagues (code, name, flag_emoji, sort_order) values
  ('bundesliga', 'Bundesliga', '🇩🇪', 1),
  ('premier_league', 'Premier League', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 2),
  ('la_liga', 'La Liga', '🇪🇸', 3);

insert into public.matchdays (league_id, number, deadline)
select id, 18, (now() + interval '2 days')
from public.leagues where code = 'bundesliga';

insert into public.matches (matchday_id, home_team, away_team, kickoff, status)
select md.id, m.home_team, m.away_team, m.kickoff, 'scheduled'
from public.matchdays md
join public.leagues l on l.id = md.league_id and l.code = 'bundesliga' and md.number = 18
cross join (values
  ('Bayern München', 'Bayer Leverkusen', now() + interval '1 day'),
  ('Borussia Dortmund', 'RB Leipzig', now() + interval '1 day 2 hours'),
  ('VfB Stuttgart', 'Eintracht Frankfurt', now() + interval '2 days')
) as m(home_team, away_team, kickoff);

insert into public.badges (code, name, description, icon) values
  ('first_tip', 'Erster Tipp', 'Deinen ersten Tipp abgegeben', 'target'),
  ('hot_streak', 'Hot Streak', '5 richtige Tipps in Folge', 'flame'),
  ('top_3', 'Podium', 'Unter den Top 3 im Ranking gelandet', 'trophy'),
  ('social_butterfly', 'Social Butterfly', '10 Beiträge gepostet', 'image');
