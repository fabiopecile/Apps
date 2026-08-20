// Supabase Edge Function (Pro feature): looks up a team's last 5 finished
// matches from this project's own `matches` table and has Claude phrase a
// short factual German summary of their recent form - no predictions, just
// facts (e.g. "Real Madrid hat die letzten 5 Spiele gewonnen").
//
// Deploy: supabase functions deploy team-stats
// (JWT verification ON - Pro-gated on the client, and this also checks
// profiles.is_pro server-side before spending any Anthropic API budget)
// Requires secret ANTHROPIC_API_KEY (same one used by moderate-post).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001';

function summarizeResults(team: string, matches: { home_team: string; away_team: string; home_score: number; away_score: number; kickoff: string }[]) {
  return matches.map((m) => {
    const isHome = m.home_team === team;
    const own = isHome ? m.home_score : m.away_score;
    const opp = isHome ? m.away_score : m.home_score;
    const opponent = isHome ? m.away_team : m.home_team;
    const result = own > opp ? 'S' : own < opp ? 'N' : 'U';
    return `${result} ${own}:${opp} ${isHome ? 'vs' : 'bei'} ${opponent}`;
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');

  if (!supabaseUrl || !serviceRoleKey || !anthropicKey) {
    return new Response(JSON.stringify({ error: 'Missing required secrets' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
  if (!jwt) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: caller } = await supabase.from('profiles').select('is_pro').eq('id', userData.user.id).single();
  if (!caller?.is_pro) {
    return new Response(JSON.stringify({ error: 'Nur für Pro-Nutzer' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { team } = await req.json().catch(() => ({ team: null }));
  if (!team) {
    return new Response(JSON.stringify({ error: 'Missing team' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: matches } = await supabase
    .from('matches')
    .select('home_team, away_team, home_score, away_score, kickoff')
    .eq('status', 'finished')
    .or(`home_team.eq.${team},away_team.eq.${team}`)
    .order('kickoff', { ascending: false })
    .limit(5);

  if (!matches || matches.length === 0) {
    return new Response(JSON.stringify({ summary: `Keine vergangenen Ergebnisse für ${team} gefunden.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const resultLines = summarizeResults(team, matches as any);

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 150,
        messages: [
          {
            role: 'user',
            content: `Team: ${team}\nLetzte Ergebnisse (neueste zuerst): ${resultLines.join(', ')}\n\nFasse die aktuelle Form dieses Teams in 1-2 kurzen, sachlichen deutschen Sätzen zusammen. Nur Fakten aus den Ergebnissen (Siege/Niederlagen/Unentschieden in Folge, Tordifferenz), keine Vorhersage für kommende Spiele.`,
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const summary = data.content?.[0]?.text?.trim() ?? resultLines.join(', ');

    return new Response(JSON.stringify({ summary, results: resultLines }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ summary: resultLines.join(', '), results: resultLines }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
