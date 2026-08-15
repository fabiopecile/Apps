// Supabase Edge Function: pulls the current matchday's fixtures/results from
// football-data.org (free tier, https://www.football-data.org) for every
// league this app knows about, and upserts them into `matchdays` / `matches`.
//
// Deploy: supabase functions deploy sync-football-data --no-verify-jwt
// Requires the secret FOOTBALL_DATA_API_TOKEN (supabase secrets set ...).
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically by
// the Edge Functions runtime.
//
// Schedule it (e.g. hourly) via Supabase Dashboard -> Database -> Cron Jobs,
// or `select cron.schedule('sync-football-data', '0 * * * *', $$ ... $$);`.

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const FOOTBALL_DATA_BASE = 'https://api.football-data.org/v4';

// Maps this app's `leagues.code` to football-data.org's competition code.
// Add more here if you add more leagues to the app (and to the `leagues` table).
const COMPETITIONS: Record<string, string> = {
  bundesliga: 'BL1',
  premier_league: 'PL',
  la_liga: 'PD',
};

type MatchStatus = 'scheduled' | 'live' | 'finished';

function mapStatus(status: string): MatchStatus {
  if (status === 'IN_PLAY' || status === 'PAUSED') return 'live';
  if (status === 'FINISHED') return 'finished';
  return 'scheduled';
}

async function fetchFootballData(path: string, apiToken: string) {
  const res = await fetch(`${FOOTBALL_DATA_BASE}${path}`, {
    headers: { 'X-Auth-Token': apiToken },
  });
  if (!res.ok) {
    throw new Error(`football-data.org ${path} -> ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

async function syncCompetition(supabase: SupabaseClient, apiToken: string, leagueCode: string, competitionCode: string) {
  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('id')
    .eq('code', leagueCode)
    .single();

  if (leagueError || !league) throw new Error(`League "${leagueCode}" not found in the leagues table`);

  const competition = await fetchFootballData(`/competitions/${competitionCode}`, apiToken);
  const matchdayNumber: number | null = competition?.currentSeason?.currentMatchday ?? null;
  if (!matchdayNumber) throw new Error('football-data.org did not return a currentMatchday');

  const matchesResponse = await fetchFootballData(
    `/competitions/${competitionCode}/matches?matchday=${matchdayNumber}`,
    apiToken
  );
  const matches: any[] = matchesResponse.matches ?? [];
  if (matches.length === 0) return { matchday: matchdayNumber, matches: 0 };

  const deadline = matches.reduce(
    (earliest: string, m: any) => (m.utcDate < earliest ? m.utcDate : earliest),
    matches[0].utcDate
  );

  const { data: matchday, error: matchdayError } = await supabase
    .from('matchdays')
    .upsert({ league_id: league.id, number: matchdayNumber, deadline }, { onConflict: 'league_id,number' })
    .select()
    .single();

  if (matchdayError || !matchday) throw new Error(matchdayError?.message ?? 'Failed to upsert matchday');

  for (const m of matches) {
    const { error: matchError } = await supabase.from('matches').upsert(
      {
        external_id: String(m.id),
        matchday_id: matchday.id,
        home_team: m.homeTeam?.shortName ?? m.homeTeam?.name ?? 'Unbekannt',
        away_team: m.awayTeam?.shortName ?? m.awayTeam?.name ?? 'Unbekannt',
        kickoff: m.utcDate,
        status: mapStatus(m.status),
        home_score: m.score?.fullTime?.home ?? null,
        away_score: m.score?.fullTime?.away ?? null,
      },
      { onConflict: 'external_id' }
    );
    if (matchError) throw new Error(matchError.message);
  }

  return { matchday: matchdayNumber, matches: matches.length };
}

Deno.serve(async (_req) => {
  const apiToken = Deno.env.get('FOOTBALL_DATA_API_TOKEN');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!apiToken || !supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: 'Missing FOOTBALL_DATA_API_TOKEN / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const results: Record<string, unknown> = {};

  for (const [leagueCode, competitionCode] of Object.entries(COMPETITIONS)) {
    try {
      results[leagueCode] = await syncCompetition(supabase, apiToken, leagueCode, competitionCode);
    } catch (err) {
      results[leagueCode] = { error: err instanceof Error ? err.message : String(err) };
    }
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
